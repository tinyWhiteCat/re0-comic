import { narrationOptionsSchema, projectSchema, renderOptionsSchema, type NarrationOptions, type NarrationVoice, type Project, type RenderOptions, type RenderProvider, type SaveProject } from '../shared/project';

async function request(url: string, body?: unknown): Promise<unknown> {
  const response = await fetch(url, body === undefined ? undefined : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const value: unknown = await response.json();
  if (!response.ok) throw new Error((value as { error?: string }).error ?? '请求失败');
  return value;
}
const endpoint = (id: string, action: string) => `/api/projects/${id}/${action}`;
export const api = {
  async list(): Promise<Project[]> {
    return projectSchema.array().parse(await request('/api/projects'));
  },
  async create(title: string): Promise<Project> {
    return projectSchema.parse(await request('/api/projects', { title }));
  },
  async save(id: string, values: SaveProject): Promise<Project> {
    return projectSchema.parse(await request(endpoint(id, 'save'), values));
  },
  async renderOptions(): Promise<RenderOptions> {
    return renderOptionsSchema.parse(await request('/api/render-options'));
  },
  async render(id: string, provider?: RenderProvider): Promise<Project> {
    return projectSchema.parse(await request(endpoint(id, 'render'), provider === 'openai' ? { provider } : {}));
  },
  async narrationOptions(): Promise<NarrationOptions> {
    return narrationOptionsSchema.parse(await request('/api/tts-options'));
  },
  async setNarrationVoice(id: string, voice: NarrationVoice): Promise<Project> {
    return projectSchema.parse(await request(endpoint(id, 'narration-voice'), { voice }));
  },
  async generateNarration(id: string, voice: NarrationVoice): Promise<Project> {
    return projectSchema.parse(await request(endpoint(id, 'narration'), { voice }));
  },
  async upload(id: string, file: File): Promise<Project> {
    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
    return projectSchema.parse(await request(endpoint(id, 'upload'), {
      extension: file.name.split('.').pop()?.toLowerCase(), content,
    }));
  },
};
export const mediaUrl = (id: string, name: string) => `/files/${id}/${name}`;
