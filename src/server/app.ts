import express, { type ErrorRequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import { access, mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { projectSchema, saveSchema, type Project } from '../shared/project.js';
import { renderVideo, validateMedia } from './media.js';

class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const idSchema = z.string().regex(/^[a-f0-9]{32}$/);
const fileSchema = z.string().regex(/^(?:[a-f0-9]{32}\.(?:png|jpg|webp|mp3|wav|m4a)|render\.mp4|subtitles\.srt)$/);
const uploadSchema = z.object({
  extension: z.enum(['png', 'jpg', 'jpeg', 'webp', 'mp3', 'wav', 'm4a']),
  content: z.string().min(4).refine(value => value.length % 4 === 0 && !/[^A-Za-z0-9+/=]/.test(value), '无效的 Base64 文件'),
});

export async function createApp(options: { dataDir: string; webDir?: string }) {
  const { dataDir } = options;
  await mkdir(dataDir, { recursive: true });
  const app = express();
  app.disable('x-powered-by');
  const queues = new Map<string, Promise<unknown>>();
  const jobs = new Set<Promise<void>>();
  const directory = (id: string) => path.join(dataDir, idSchema.parse(id));
  async function read(id: string): Promise<Project> {
    try { return projectSchema.parse(JSON.parse(await readFile(path.join(directory(id), 'project.json'), 'utf8'))); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new HttpError(404, '项目不存在');
      throw error;
    }
  }
  async function save(project: Project) {
    const dir = directory(project.id);
    await writeFile(path.join(dir, 'project.tmp'), JSON.stringify(project, null, 2), 'utf8');
    await rename(path.join(dir, 'project.tmp'), path.join(dir, 'project.json'));
  }
  async function serialize<T>(id: string, action: () => Promise<T>): Promise<T> {
    const next = (queues.get(id) ?? Promise.resolve()).catch(() => {}).then(action);
    queues.set(id, next);
    try { return await next; }
    finally { if (queues.get(id) === next) queues.delete(id); }
  }
  async function list() {
    const entries = await readdir(dataDir, { withFileTypes: true });
    const projects = await Promise.all(entries.filter(entry => entry.isDirectory() && idSchema.safeParse(entry.name).success).map(entry => read(entry.name)));
    return projects.sort((a, b) => b.id.localeCompare(a.id));
  }
  async function checkAssets(project: Project) {
    for (const file of [...project.scenes.map(scene => scene.image), ...(project.audio ? [project.audio] : [])]) {
      try { await access(path.join(directory(project.id), file)); }
      catch { throw new HttpError(400, '项目素材不存在，请重新导入'); }
    }
  }
  // Live encoders do not survive a service restart. Preserve interrupted drafts.
  for (const project of await list()) {
    if (project.status === 'rendering') await save({ ...project, status: 'failed', error: '服务已重启，请重新合成' });
  }
  app.use((req, res, next) => {
    const origin = req.get('origin');
    const allowed = new Set([`http://${req.get('host')}`, 'http://127.0.0.1:5173', 'http://localhost:5173']);
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && origin && !allowed.has(origin)) {
      res.status(403).json({ error: '不允许跨来源请求' }); return;
    }
    next();
  });
  app.use(express.json({ limit: '40mb' }));
  app.get('/api/health', (_req, res) => { res.json({ status: 'ok' }); });
  app.get('/api/projects', async (_req, res) => { res.json(await list()); });
  app.post('/api/projects', async (req, res) => {
    const { title } = z.object({ title: z.string().max(100).default('未命名作品') }).parse(req.body);
    const project: Project = { id: randomUUID().replaceAll('-', ''), title, ratio: 'portrait', scenes: [], audio: null, status: 'draft' };
    await mkdir(directory(project.id));
    await save(project);
    res.json(project);
  });
  app.post('/api/projects/:id/:action', async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const result = await serialize(id, async () => {
      let project = await read(id);
      if (project.status === 'rendering') throw new HttpError(409, '正在合成，请完成后再修改');
      switch (req.params.action) {
        case 'save': {
          const { removeAudio, ...values } = saveSchema.parse(req.body);
          project = { ...project, ...values, audio: removeAudio ? null : project.audio, status: 'draft', error: null };
          await checkAssets(project);
          break;
        }
        case 'upload': {
          const body = uploadSchema.parse(req.body);
          const extension = body.extension === 'jpeg' ? 'jpg' : body.extension;
          const isImage = ['png', 'jpg', 'webp'].includes(extension);
          if (isImage && project.scenes.length >= 100) throw new HttpError(400, '最多添加 100 个分镜');
          const content = Buffer.from(body.content, 'base64');
          if (content.toString('base64') !== body.content) throw new HttpError(400, '无效的 Base64 文件');
          if (content.length > 25 * 1024 * 1024) throw new HttpError(413, '单文件最多 25 MB');
          const name = `${randomUUID().replaceAll('-', '')}.${extension}`;
          const file = path.join(directory(id), name);
          await writeFile(file, content);
          try { await validateMedia(file, isImage); }
          catch { await unlink(file); throw new HttpError(400, '无法读取媒体文件，请检查格式或图片尺寸'); }
          if (isImage) project.scenes.push({ image: name, text: '', duration: 4 });
          else project.audio = name;
          project.status = 'draft';
          project.error = null;
          break;
        }
        case 'render': {
          if (!project.scenes.length) throw new HttpError(400, '请至少添加一个分镜');
          await checkAssets(project);
          project.status = 'rendering';
          project.error = null;
          break;
        }
        default: throw new HttpError(404, '未知操作');
      }
      await save(project);
      if (req.params.action === 'render') {
        const snapshot = structuredClone(project);
        const job = (async () => {
          let error: string | null = null;
          try { await renderVideo(directory(id), snapshot); }
          catch (cause) { error = cause instanceof Error ? cause.message : '合成失败'; }
          await serialize(id, async () => {
            const latest = await read(id);
            await save({ ...latest, status: error ? 'failed' : 'done', error });
          });
        })();
        jobs.add(job);
        void job.finally(() => jobs.delete(job)).catch(console.error);
      }
      return project;
    });
    res.json(result);
  });
  app.get('/files/:id/:name', async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const name = fileSchema.parse(req.params.name);
    await read(id);
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(directory(id), name), error => {
      if (error && !res.headersSent) res.status(404).json({ error: '文件不存在' });
    });
  });
  app.use('/api', (_req, res) => { res.status(404).json({ error: '未知接口' }); });
  if (options.webDir) app.use(express.static(options.webDir));
  const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
    if (error instanceof z.ZodError) { res.status(400).json({ error: error.issues[0]?.message ?? '请求无效' }); return; }
    if (error instanceof HttpError) { res.status(error.status).json({ error: error.message }); return; }
    const status = (error as { status?: number })?.status;
    if (status === 413 || status === 400) { res.status(status).json({ error: status === 413 ? '请求最大为 40 MB' : '请求格式无效' }); return; }
    console.error(error);
    res.status(500).json({ error: '服务器处理失败' });
  };
  app.use(errorHandler);
  return { app, waitForJobs: () => Promise.all([...jobs]) };
}
