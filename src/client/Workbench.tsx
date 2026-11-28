import { useEffect, useRef, useState } from 'react';
import {
  Alert, App, Button, Card, Col, Divider, Empty, Flex, Input, Layout, Menu, Popconfirm,
  Row, Select, Space, Spin, Statistic, Tag, Typography, Upload,
  type UploadProps,
} from 'antd';
import {
  AudioOutlined, DownloadOutlined, FileImageOutlined, PlayCircleOutlined,
  PlusOutlined, SaveOutlined, VideoCameraOutlined,
} from '@ant-design/icons';
import type { NarrationOptions, NarrationVoice, Project, RenderOptions, RenderProvider, Scene } from '../shared/project';
import { api, mediaUrl } from './api';
import { SceneCard } from './SceneCard';

const { Title, Text, Paragraph } = Typography;
export function Workbench() {
  const { message } = App.useApp();
  const [projects, setProjects] = useState<Project[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openAi, setOpenAi] = useState<RenderOptions['openai'] | 'unavailable' | null>(null);
  const [narration, setNarration] = useState<NarrationOptions | 'unavailable' | null>(null);
  const current = useRef<Project | null>(null);
  const dirty = useRef(false);
  const actionLock = useRef(false);
  const uploadQueue = useRef<Promise<void>>(Promise.resolve());
  const pendingUploads = useRef(0);
  const rendering = project?.status === 'rendering';
  const narrationJob = project?.narrationJob ?? project?.geminiTts;
  const narrating = narrationJob?.status === 'generating';
  const processing = rendering || narrating;
  const locked = busy || processing;
  const openAiRendering = rendering && project?.renderProvider === 'openai';
  const openAiConfigured = openAi !== 'unavailable' && openAi?.configured === true;
  const renderDisabled = busy || narrating || !project?.scenes.length;
  const openAiDisabled = renderDisabled || rendering || !openAiConfigured;
  const narrationOptions = narration === 'unavailable' ? null : narration;
  const selectedVoice = project?.narrationVoice ?? narrationOptions?.defaultVoice;
  const voiceConfigured = narrationOptions?.voices.find(option => option.value === selectedVoice)?.configured;
  const narrationDisabled = locked || !voiceConfigured || !project?.scenes.some(scene => scene.text.trim());

  function select(value: Project) {
    current.current = value;
    setProject(value);
    setProjects(list => [value, ...list.filter(item => item.id !== value.id)]);
  }
  function edit(patch: Partial<Project>) {
    if (!current.current) return;
    dirty.current = true;
    select({ ...current.current, ...patch, status: 'draft', error: null });
  }
  async function persist(removeAudio = false) {
    const value = current.current;
    if (!value || (!dirty.current && !removeAudio)) return value;
    const saved = await api.save(value.id, { title: value.title, ratio: value.ratio, scenes: value.scenes, removeAudio });
    dirty.current = false;
    select(saved);
    return saved;
  }
  async function act(operation: () => Promise<void>) {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    try { await operation(); }
    catch (error) { void message.error(error instanceof Error ? error.message : '操作失败'); }
    finally { actionLock.current = false; setBusy(false); }
  }
  async function load() {
    setLoading(true);
    try {
      const list = await api.list();
      setProjects(list);
      if (list[0]) { current.current = list[0]; setProject(list[0]); }
      setLoadError(null);
    } catch (error) { setLoadError(error instanceof Error ? error.message : '加载失败'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    let active = true;
    void api.renderOptions().then(({ openai }) => {
      if (active) setOpenAi(openai);
    }).catch(() => {
      if (active) setOpenAi('unavailable');
    });
    void api.narrationOptions().then(options => {
      if (active) setNarration(options);
    }).catch(() => {
      if (active) setNarration('unavailable');
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!processing || !project) return;
    const id = project.id;
    const timer = window.setInterval(() => {
      void api.list().then(list => {
        const latest = list.find(item => item.id === id);
        if (current.current?.id === id && latest) select(latest);
      }).catch(() => { /* The next poll retries; don't overwrite the editor on a transient failure. */ });
    }, 1500);
    return () => window.clearInterval(timer);
  }, [project?.id, processing]);
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty.current || pendingUploads.current) { event.preventDefault(); }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const create = () => void act(async () => {
    await persist();
    select(await api.create(`新作品 ${projects.length + 1}`));
    dirty.current = false;
  });
  const render = (provider?: RenderProvider) => act(async () => {
    if (current.current?.status === 'rendering') return;
    const saved = await persist();
    if (saved) select(await api.render(saved.id, provider));
  });
  const changeNarrationVoice = (voice: NarrationVoice) => act(async () => {
    const saved = await persist();
    if (saved) select(await api.setNarrationVoice(saved.id, voice));
  });
  const generateNarration = () => act(async () => {
    if (narrationDisabled || !selectedVoice) return;
    const saved = await persist();
    if (saved) select(await api.generateNarration(saved.id, selectedVoice));
  });
  const upload: UploadProps['customRequest'] = options => {
    const file = options.file as File;
    if (!current.current || actionLock.current && pendingUploads.current === 0) {
      options.onError?.(new Error('请稍后重试')); return;
    }
    const id = current.current.id;
    pendingUploads.current += 1;
    actionLock.current = true;
    setBusy(true);
    uploadQueue.current = uploadQueue.current.then(async () => {
      try {
        await persist();
        const saved = await api.upload(id, file);
        select(saved);
        options.onSuccess?.(saved);
        void message.success(`${file.name} 已导入`);
      } catch (error) {
        const reason = error instanceof Error ? error : new Error('上传失败');
        options.onError?.(reason);
        void message.error(reason.message);
      } finally {
        pendingUploads.current -= 1;
        if (!pendingUploads.current) { actionLock.current = false; setBusy(false); }
      }
    });
  };
  const beforeUpload: UploadProps['beforeUpload'] = file => {
    if (file.size > 25 * 1024 * 1024) { void message.error('单文件最多 25 MB'); return Upload.LIST_IGNORE; }
    return true;
  };
  const changeScene = (index: number, value: Scene) => {
    if (current.current) edit({ scenes: current.current.scenes.map((scene, i) => i === index ? value : scene) });
  };
  const move = (index: number, direction: number) => {
    const scenes = [...(current.current?.scenes ?? [])];
    const to = index + direction;
    if (to < 0 || to >= scenes.length) return;
    [scenes[index], scenes[to]] = [scenes[to], scenes[index]];
    edit({ scenes });
  };

  return <Layout className="app-layout">
    <Layout.Sider width={232} breakpoint="lg" collapsedWidth={0} className="sidebar" theme="dark">
      <div className="brand"><VideoCameraOutlined /> RE:FRAME<Text className="brand-subtitle">漫画解说工作台</Text></div>
      <div className="sidebar-action"><Button type="primary" block icon={<PlusOutlined />} disabled={busy} onClick={create}>新建作品</Button></div>
      <Menu theme="dark" mode="inline" selectedKeys={project ? [project.id] : []} items={projects.map(value => ({ key: value.id, label: value.title || '未命名作品', disabled: busy, icon: <FileImageOutlined /> }))} onClick={({ key }) => void act(async () => {
        await persist();
        const list = await api.list();
        setProjects(list);
        const selected = list.find(value => value.id === key);
        if (selected) { dirty.current = false; select(selected); }
      })} />
      <Paragraph className="sidebar-footer">从一格漫画，到一个故事。<br />本地保存 · 自由创作</Paragraph>
    </Layout.Sider>
    <Layout className="main-layout">
      <Layout.Header className="page-header"><Text type="secondary">创作空间 / <Text strong>故事编排</Text></Text><Space><Button href="/gallery" icon={<FileImageOutlined />}>故事画廊</Button><Tag color="green">本地工作台</Tag></Space></Layout.Header>
      <Layout.Content className="page-content">
        <div className="intro"><Text className="eyebrow">YOUR PANELS, YOUR STORY</Text><Title level={1}>让画面，讲出故事。</Title><Paragraph type="secondary">导入漫画，写下解说，编排你的下一支视频。</Paragraph></div>
        {loading ? <Flex justify="center" className="loading"><Spin size="large" /></Flex> : loadError ? <Alert type="error" title="无法加载作品" description={loadError} action={<Button onClick={() => void load()}>重试</Button>} /> : !project ?
          <Card><Empty description="第一支作品，从这里开始"><Button type="primary" icon={<PlusOutlined />} onClick={create}>创建第一支作品</Button></Empty></Card> : <>
            <Flex gap={12} align="center" wrap className="toolbar">
              <Input aria-label="作品名称" value={project.title} maxLength={100} size="large" disabled={locked} className="project-title" onChange={event => edit({ title: event.target.value })} />
              <Select aria-label="视频画幅" value={project.ratio} disabled={locked} options={[{ value: 'portrait', label: '9:16 · 竖屏' }, { value: 'landscape', label: '16:9 · 横屏' }]} onChange={ratio => edit({ ratio })} style={{ width: 145 }} />
              <Button icon={<SaveOutlined />} disabled={locked} onClick={() => void act(async () => { await persist(); void message.success('草稿已保存'); })}>保存草稿</Button>
              <Button type="primary" icon={<PlayCircleOutlined />} loading={rendering && !openAiRendering} disabled={renderDisabled || openAiRendering} onClick={() => void render()}>合成视频</Button>
              <Popconfirm
                key={project.id}
                title="用 OpenAI 规划运镜和剪辑？"
                description="当前的分镜图和解说会发送给 OpenAI。视频由本地 FFmpeg 合成。"
                okText="用当前分镜编排并合成"
                cancelText="取消"
                placement="bottomRight"
                disabled={openAiDisabled}
                okButtonProps={{ disabled: openAiDisabled }}
                onConfirm={() => render('openai')}
              >
                <Button loading={openAiRendering} disabled={openAiDisabled}>OpenAI 运镜合成</Button>
              </Popconfirm>
              {openAi === 'unavailable' ? <Text type="secondary" style={{ flexBasis: '100%' }}>暂时无法读取 OpenAI 配置。</Text> : openAi && !openAi.configured &&
                <Text type="secondary" style={{ flexBasis: '100%' }}>在服务端设置 <Text code>OPENAI_API_KEY</Text> 后可使用 OpenAI 运镜合成。</Text>}
            </Flex>
            <Row gutter={[24, 24]}>
              <Col xs={24} xl={17}>
                <Flex justify="space-between" align="center" gap={12} wrap className="section-heading"><Space><Title level={4} style={{ margin: 0 }}>分镜时间线</Title><Tag>{project.scenes.length} 个镜头</Tag></Space>
                  <Upload accept=".png,.jpg,.jpeg,.webp" multiple showUploadList={false} customRequest={upload} beforeUpload={beforeUpload} disabled={locked}><Button icon={<PlusOutlined />} disabled={locked}>导入漫画</Button></Upload>
                </Flex>
                <Space orientation="vertical" size={14} style={{ width: '100%' }}>
                  {project.scenes.map((scene, index) => <SceneCard key={`${scene.image}-${index}`} scene={scene} projectId={project.id} index={index} count={project.scenes.length} disabled={!!locked} onChange={value => changeScene(index, value)} onMove={direction => move(index, direction)} onRemove={() => edit({ scenes: project.scenes.filter((_, i) => i !== index) })} />)}
                  {!project.scenes.length && <Card><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="点击「导入漫画」，添加第一格画面" /></Card>}
                </Space>
              </Col>
              <Col xs={24} xl={7}><Card title="声音与输出" className="output-panel">
                <Paragraph type="secondary">导入整段配音，按分镜时长编排节奏。过长裁切，过短补静音。</Paragraph>
                {narrationOptions && <Flex vertical gap={6} className="narration-voice-field">
                  <label htmlFor="narration-voice">配音音色</label>
                  <Select
                    id="narration-voice"
                    aria-label="配音音色"
                    value={selectedVoice}
                    options={narrationOptions.voices.map(({ configured, ...option }) => ({ ...option, disabled: !configured }))}
                    disabled={locked}
                    onChange={voice => void changeNarrationVoice(voice)}
                  />
                </Flex>}
                <Flex gap={8} wrap>
                  <Upload accept=".mp3,.wav,.m4a" showUploadList={false} customRequest={upload} beforeUpload={beforeUpload} disabled={locked}><Button icon={<AudioOutlined />} disabled={locked}>导入配音</Button></Upload>
                  <Popconfirm
                    key={project.id}
                    title={selectedVoice ? `用 ${selectedVoice} 生成配音？` : '生成配音？'}
                    description={`分镜解说会发送给${selectedVoice === '冰糖' ? '小米 MiMo' : ' Google'}。若配音比镜头长，会延长该镜头。${project.audio ? '生成成功后将替换当前配音。' : ''}`}
                    okText="确认生成"
                    cancelText="取消"
                    placement="bottomRight"
                    disabled={narrationDisabled}
                    okButtonProps={{ disabled: narrationDisabled }}
                    onConfirm={generateNarration}
                  >
                    <Button loading={narrating} disabled={narrationDisabled}>生成配音</Button>
                  </Popconfirm>
                </Flex>
                {narration === 'unavailable' && <Text type="secondary">暂时无法读取配音配置。</Text>}
                {narrationOptions && !voiceConfigured && <Text type="secondary">在服务端设置 <Text code>{selectedVoice === '冰糖' ? 'MIMO_API_KEY' : 'GEMINI_API_KEY'}</Text> 后可使用该音色。</Text>}
                <Paragraph type="secondary" className="audio-status">
                  {project.audio ? project.narrationAudioVoice ? `当前配音 · ${project.narrationAudioVoice}` : '已添加配音' : '未添加配音，导出为无声视频'}
                </Paragraph>
                {project.audio && project.narrationAudioVoice && voiceConfigured && project.narrationAudioVoice !== selectedVoice &&
                  <Paragraph type="secondary">点击「生成配音」更换音色。</Paragraph>}
                {project.audio && <><audio aria-label="配音预览" controls src={mediaUrl(project.id, project.audio)} className="audio-preview" /><Button type="text" danger disabled={locked} onClick={() => void act(async () => { await persist(true); })}>移除配音</Button></>}
                {narrating && <Alert type="info" title="正在生成配音" description="可以切换到其他作品，生成后回来试听。" showIcon icon={<Spin size="small" />} />}
                {narrationJob?.status === 'failed' && <Alert type="error" title="配音生成失败" description={narrationJob.error} showIcon />}
                <Divider />
                <Statistic title="预计时长" value={project.scenes.reduce((total, scene) => total + scene.duration, 0)} precision={1} suffix="秒" />
                <Paragraph type="secondary" className="export-spec">720p / 24 fps / MP4<br />自动生成并烧录中文字幕</Paragraph>
                {rendering && <Alert type="info" title={openAiRendering ? '正在规划运镜并合成视频' : '正在合成视频'} description="可以切换到其他作品，完成后回来下载。" showIcon icon={<Spin size="small" />} />}
                {project.status === 'failed' && <Alert type="error" title="合成失败" description={project.error} showIcon />}
                {project.status === 'done' && <Space orientation="vertical" style={{ width: '100%' }}>
                  <video key={project.id} aria-label="成片预览" controls preload="metadata" src={mediaUrl(project.id, 'render.mp4')} className="video-preview" />
                  <Button block icon={<DownloadOutlined />} href={mediaUrl(project.id, 'render.mp4')} download>下载 MP4 成片</Button>
                  <Button block icon={<DownloadOutlined />} href={mediaUrl(project.id, 'subtitles.srt')} download>下载 SRT 字幕</Button>
                </Space>}
              </Card></Col>
            </Row>
          </>}
      </Layout.Content>
    </Layout>
  </Layout>;
}
