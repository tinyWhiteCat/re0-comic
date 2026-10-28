import { useEffect, useState } from 'react';
import { Button, Empty, Image, Input, Pagination, Segmented, Select, Tag } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, BookOutlined, PictureOutlined, SearchOutlined } from '@ant-design/icons';
import { artworks, type Artwork } from './artworks';
import './gallery.css';

const pageSize = 12;

export function Gallery() {
  const [category, setCategory] = useState<Artwork['category']>('original');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('number');
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState<number | null>(null);
  useEffect(() => {
    if (preview === null) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setPreview(null); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [preview]);
  const collection = artworks.filter(item => item.category === category);
  const filtered = collection.filter(item => `${item.id} ${item.title}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title) : a.id.localeCompare(b.id, undefined, { numeric: true }));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const selected = preview === null ? undefined : filtered[preview];
  const hero = artworks[0];

  return <div className="gallery">
    <header className="gallery-header">
      <a className="gallery-brand" href="/gallery" aria-label="RE:FRAME 故事画廊">RE:FRAME<span>STORY ART ARCHIVE</span></a>
      <Button href="/" icon={<ArrowLeftOutlined />}>视频工作台</Button>
    </header>
    <main className="gallery-main">
      <section className="gallery-intro" aria-labelledby="gallery-title">
        <div className="gallery-intro-copy">
          <div className="gallery-kicker">CHAPTER 07 <span>／</span> VISUAL COLLECTION</div>
          <h1 id="gallery-title">故事的另一面，<br /><em>藏在画里。</em></h1>
          <p>从角色的轮廓，到故事里的每一帧。<br />在这里，翻阅第七章的原画与漫画彩图。</p>
          <Button type="primary" size="large" href="#collection" icon={<ArrowRightOutlined />} iconPlacement="end">浏览画作</Button>
          <div className="gallery-summary"><strong>{artworks.filter(item => item.category === 'original').length}</strong> 张角色原画 <span>·</span> 漫画彩图待收录</div>
        </div>
        <figure className="gallery-feature">
          <div className="gallery-feature-label"><span>CHARACTER STUDY</span><span>NO. 01</span></div>
          <Button type="text" className="gallery-feature-image" aria-label="放大 Subaru 原画" onClick={() => {
            setCategory('original'); setQuery(''); setSort('number'); setPage(1); setPreview(0);
          }}><img src={hero.src} alt="Subaru 角色设定：正面、侧面、背面与表情" fetchPriority="high" /></Button>
          <figcaption><strong>Subaru</strong><span>角色设定 / 多视图原画</span></figcaption>
        </figure>
      </section>

      <section id="collection" className="gallery-collection" aria-labelledby="collection-title">
        <div className="gallery-section-heading"><div><div className="gallery-kicker">THE COLLECTION</div><h2 id="collection-title">画作档案 <span>/ 第七章</span></h2></div><Tag bordered={false}>持续收录</Tag></div>
        <div className="gallery-controls">
          <Segmented<Artwork['category']> aria-label="画作分类" value={category} onChange={value => { setCategory(value); setQuery(''); setPage(1); setPreview(null); }} options={[
            { value: 'original', label: '角色原画', icon: <PictureOutlined /> },
            { value: 'comic', label: '漫画彩图', icon: <BookOutlined /> },
          ]} />
          <div className="gallery-search"><Input aria-label="搜索画作" placeholder="搜索角色英文名或编号" prefix={<SearchOutlined />} allowClear value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} /><Select aria-label="画作排序" value={sort} onChange={value => { setSort(value); setPage(1); }} options={[{ value: 'number', label: '编号顺序' }, { value: 'name', label: '名称 A–Z' }]} /></div>
        </div>
        <div className="gallery-result-count" aria-live="polite">{category === 'original' ? '角色原画' : '漫画彩图'} <span> / {filtered.length} 张</span><span>点击画作，查看完整细节</span></div>
        {visible.length ? <div className="gallery-grid">
          {visible.map((item, index) => <article className="art-card" key={item.id}>
            <Button type="text" className="art-image" onClick={() => setPreview((page - 1) * pageSize + index)} aria-label={`查看 ${item.title}`}>
              <img src={item.src} alt={`${item.title} ${item.category === 'original' ? '角色原画' : '漫画彩图'}`} loading="lazy" decoding="async" />
              <span className="art-open">查看大图 ↗</span>
            </Button>
            <div className="art-caption"><div><span className="art-number">NO. {item.id.split('-')[0].toUpperCase()}</span><h3>{item.title}</h3></div><span className="art-kind">{item.category === 'original' ? '角色设定' : '漫画彩图'}</span></div>
          </article>)}
        </div> : <div className="gallery-empty"><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={collection.length ? '没有找到匹配的画作，试试其他名字或编号。' : '漫画彩图尚未收录。后续将在这里按顺序展示故事画面。'}>{query && <Button onClick={() => { setQuery(''); setPage(1); }}>清除搜索</Button>}</Empty></div>}
        {filtered.length > pageSize && <Pagination className="gallery-pagination" current={page} total={filtered.length} pageSize={pageSize} showSizeChanger={false} onChange={value => { setPage(value); document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' }); }} />}
      </section>
      <footer className="gallery-footer"><span>RE:FRAME / 故事画廊</span><span>每一幅画，都是故事的一部分。</span></footer>
    </main>
    <Image.PreviewGroup items={filtered.map(item => ({ src: item.src, alt: item.title }))} preview={{
      open: preview !== null, current: preview ?? 0,
      onOpenChange: open => { if (!open) setPreview(null); },
      onChange: current => setPreview(current),
      countRender: (current, total) => `${selected?.title ?? ''} · ${current} / ${total}`,
    }} />
  </div>;
}
