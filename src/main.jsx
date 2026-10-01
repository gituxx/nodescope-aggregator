import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, ArrowDown, ArrowDownUp, ArrowUp, ArrowUpRight, Check,
  ChevronDown, CircleHelp, Clock3, Copy, Database, Download, Globe2,
  ListFilter, Menu, MoreHorizontal, Radio, RefreshCw, Search, ShieldCheck,
  Sparkles, Wifi, X
} from 'lucide-react';
import './style.css';

const PAGE_SIZE = 10;
const SUBSCRIPTION_BASE = 'https://node.oinnn.top/api/subscription';

function formatDate(value) {
  if (!value) return '等待首次同步';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai',
  }).format(new Date(value));
}

function relativeTime(value) {
  if (!value) return '尚未同步';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return '刚刚同步';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

function App() {
  const [section, setSection] = useState('overview');
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [protocol, setProtocol] = useState('全部协议');
  const [sort, setSort] = useState('name');
  const [sortDir, setSortDir] = useState(1);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [format, setFormat] = useState('base64');
  const [copied, setCopied] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState('');

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/nodes', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '节点数据暂不可用');
      setFeed(result);
    } catch (loadError) {
      setError(loadError.message || '无法连接数据服务');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const protocols = useMemo(() => feed?.protocols?.map((item) => item.protocol) || [], [feed]);
  const filteredNodes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...(feed?.nodes || [])]
      .filter((node) => !query || `${node.name} ${node.protocol} ${node.server} ${node.port}`.toLowerCase().includes(query))
      .filter((node) => protocol === '全部协议' || node.protocol === protocol)
      .sort((a, b) => String(a[sort] || '').localeCompare(String(b[sort] || ''), 'zh-CN') * sortDir);
  }, [feed, search, protocol, sort, sortDir]);

  useEffect(() => setPage(1), [search, protocol]);

  const pageCount = Math.max(1, Math.ceil(filteredNodes.length / PAGE_SIZE));
  const visibleNodes = filteredNodes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const count = feed?.count || 0;
  const subscriptionUrl = `${SUBSCRIPTION_BASE}?format=${format}`;

  function toggleSort(key) {
    if (sort === key) setSortDir((direction) => direction * -1);
    else { setSort(key); setSortDir(1); }
  }

  async function copySubscription() {
    try {
      await navigator.clipboard.writeText(subscriptionUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      notify('浏览器不允许复制，请手动复制订阅链接');
    }
  }

  const nav = (
    <>
      <div className="brand-lockup">
        <div className="brand-mark"><Activity size={17} strokeWidth={2.5} /></div>
        <div><strong>NodeScope</strong><span>节点观测</span></div>
      </div>
      <div className="workspace"><div className="workspace-avatar">N</div><div><strong>公共节点</strong><small>公开来源目录</small></div><ChevronDown size={15} /></div>
      <div className="nav-label">工作台</div>
      <button className={`nav-item ${section === 'overview' ? 'active' : ''}`} onClick={() => { setSection('overview'); setMobileMenu(false); }}><Activity size={17} />概览</button>
      <button className={`nav-item ${section === 'nodes' ? 'active' : ''}`} onClick={() => { setSection('nodes'); setMobileMenu(false); }}><Radio size={17} />节点列表<span className="nav-count">{loading ? '…' : count}</span></button>
      <button className="nav-item" onClick={() => { setModal(true); setMobileMenu(false); }}><Copy size={17} />订阅链接</button>
      <div className="nav-label sources-label">数据</div>
      <div className={`source-state ${feed?.sources?.some((source) => !source.error) ? 'source-connected' : ''}`}><span className="source-dot" />采集源<span className="source-tag">{loading ? '同步中' : feed?.sources?.some((source) => !source.error) ? '已连接' : '不可用'}</span></div>
      <div className="sidebar-bottom">
        <div className="refresh-note"><Clock3 size={15} /><span>同步周期</span><strong>每 4 小时</strong></div>
        <button className="nav-item" onClick={() => notify('数据来自公开订阅清单；节点可信度请自行判断。')}><CircleHelp size={17} />数据说明</button>
        <div className="profile"><div className="profile-avatar">访</div><div><strong>访客模式</strong><small>只读访问</small></div><MoreHorizontal size={17} /></div>
      </div>
    </>
  );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>{nav}</aside>
      {mobileMenu && <button aria-label="关闭菜单" className="scrim" onClick={() => setMobileMenu(false)} />}
      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu-button" title="打开菜单" onClick={() => setMobileMenu(true)}><Menu size={19} /></button>
          <div className="breadcrumb">公共节点 <span>/</span> {section === 'nodes' ? '节点列表' : '概览'}</div>
          <div className="top-actions">
            <div className="top-search"><Search size={16} /><input placeholder="搜索名称、协议或服务器…" value={search} onChange={(event) => setSearch(event.target.value)} /><kbd>⌘ K</kbd></div>
            <button className="icon-button notification-button" title="数据来源" onClick={() => notify(feed?.sources?.map((source) => source.name).join('、') || '暂无可用数据源')}><Database size={18} /></button>
            <div className="user-chip">访</div>
          </div>
        </header>

        <div className="content-wrap">
          <div className={`preview-banner ${error ? 'banner-error' : ''}`}>
            <Sparkles size={15} /><span>{error ? '数据暂不可用' : '公开数据源'}</span>
            <p>{error || '同步公开节点清单；本站不主动探测节点，延迟与地区信息未验证。'}</p>
            {feed?.stale && <strong className="stale-note">当前为缓存快照</strong>}
          </div>

          <div className="page-heading">
            <div><div className="eyebrow"><span className={`live-pip ${error ? 'pip-error' : ''}`} />节点网络 <span className="eyebrow-sep">/</span> {feed?.stale ? '缓存数据' : '来源同步'}</div><h1>{section === 'nodes' ? '节点列表' : '网络概览'}</h1><p>展示公开来源中可解析的节点配置，不代表节点当前可用。</p></div>
            <div className="heading-actions"><div className="last-update"><Clock3 size={14} />{loading ? '正在读取' : relativeTime(feed?.fetchedAt)} <span>·</span> {feed?.count ?? 0} 条</div><button className="button button-secondary" onClick={loadData} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''} />重新读取</button><button className="button button-primary" onClick={() => setModal(true)}><Download size={15} />获取订阅</button></div>
          </div>

          <section className="metrics-grid" aria-label="节点统计">
            <Metric label="公开收录" value={loading ? '—' : count} unit="个" icon={<Wifi size={17} />} accent="mint" />
            <Metric label="收录协议" value={loading ? '—' : protocols.length} unit="种" icon={<Radio size={17} />} accent="blue" />
            <Metric label="可用来源" value={feed ? feed.sources.filter((source) => !source.error).length : '—'} unit="个" icon={<Database size={17} />} accent="amber" />
            <Metric label="地理识别" value="未接入" unit="" icon={<Globe2 size={17} />} accent="coral" />
          </section>

          <section className="overview-grid">
            <article className="panel availability-panel protocol-panel">
              <div className="panel-heading"><div><h2>协议分布</h2><p>基于当前同步的节点配置</p></div><span className="source-label">{feed?.protocols?.length || 0} 种协议</span></div>
              {loading ? <div className="loading-lines"><i /><i /><i /></div> : <div className="protocol-list">
                {(feed?.protocols || []).map((item) => <div className="protocol-row" key={item.protocol}><div className="protocol-row-top"><span>{item.protocol}</span><strong>{item.count}</strong><small>{count ? Math.round(item.count / count * 100) : 0}%</small></div><div className="protocol-track"><i style={{ width: `${count ? item.count / count * 100 : 0}%` }} /></div></div>)}
                {!feed?.protocols?.length && <div className="empty-inline">暂无协议统计</div>}
              </div>}
            </article>

            <article className="panel region-panel source-panel">
              <div className="panel-heading"><div><h2>同步来源</h2><p>公开清单与最近更新时间</p></div><span className={`source-indicator ${feed?.sources?.some((source) => !source.error) ? 'connected' : ''}`}><i />{feed?.sources?.filter((source) => !source.error).length || 0}/{feed?.sources?.length || 0} 可用</span></div>
              {feed ? <>
                <div className="source-list">{feed.sources.map((source) => <div className="source-entry" key={source.url}>
                  <div className="source-entry-heading"><span className={source.error ? 'source-failed-dot' : ''} /><strong>{source.name}</strong><small>{source.error ? '暂不可用' : `${source.count} 条`}</small></div>
                  <a className="source-url" href={source.url} target="_blank" rel="noreferrer">查看原始清单 <ArrowUpRight size={13} /></a>
                </div>)}</div>
                <div className="source-meta"><span>本站抓取</span><strong>{formatDate(feed.fetchedAt)}</strong></div>
                <div className="source-meta"><span>上游生成</span><strong>{formatDate(feed.upstreamGeneratedAt)}</strong></div>
                <div className="source-disclaimer"><ShieldCheck size={14} />公开节点可能失效或由第三方运营，请勿传输敏感流量。</div>
              </> : <div className="source-empty">{loading ? '正在同步公开节点清单…' : '当前无法读取上游数据。'}<button onClick={loadData}>重试</button></div>}
            </article>
          </section>

          <section className="panel nodes-panel">
            <div className="nodes-heading"><div><div className="title-inline"><h2>节点目录</h2><span className="count-pill">{loading ? '…' : filteredNodes.length}</span></div><p>仅解析公开配置，不进行连接测试</p></div><div className="nodes-heading-actions"><button className="button button-secondary export-button" onClick={() => setModal(true)}><Download size={15} />订阅</button></div></div>
            <div className="filter-row">
              <div className="table-search"><Search size={15} /><input placeholder="搜索名称、协议或服务器" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
              <label className="filter-select"><ListFilter size={14} /><select aria-label="筛选协议" value={protocol} onChange={(event) => setProtocol(event.target.value)}><option>全部协议</option>{protocols.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={13} /></label>
              <div className="filter-spacer" /><span className="unverified-legend"><i />未主动探测</span>
            </div>
            <div className="table-scroll"><table><thead><tr><th><button className="th-sort" onClick={() => toggleSort('name')}>节点名称{sort === 'name' ? (sortDir > 0 ? <ArrowDown size={13} /> : <ArrowUp size={13} />) : <ArrowDownUp size={13} />}</button></th><th>协议</th><th><button className="th-sort" onClick={() => toggleSort('server')}>服务器{sort === 'server' ? (sortDir > 0 ? <ArrowDown size={13} /> : <ArrowUp size={13} />) : <ArrowDownUp size={13} />}</button></th><th>地区</th><th>来源</th><th>状态</th><th aria-label="操作" /></tr></thead><tbody>
              {visibleNodes.map((node, index) => <NodeRow key={`${node.protocol}-${node.server}-${node.port}-${index}`} node={node} onCopy={() => setModal(true)} />)}
            </tbody></table></div>
            {!loading && !error && filteredNodes.length === 0 && <div className="empty-state"><Search size={22} /><strong>没有找到匹配的节点</strong><span>试试其他关键词或协议筛选</span><button onClick={() => { setSearch(''); setProtocol('全部协议'); }}>清除筛选</button></div>}
            {loading && <div className="table-loading"><i /><i /><i /></div>}
            {error && !feed && <div className="empty-state"><Database size={22} /><strong>暂时无法载入节点</strong><span>{error}</span><button onClick={loadData}>重试</button></div>}
            <div className="table-footer"><span>显示 <strong>{filteredNodes.length ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filteredNodes.length)}` : '0'}</strong> 条，共 <strong>{count}</strong> 个</span><div className="pagination"><button disabled={page <= 1} aria-label="上一页" onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button><button className="page-current">{page}</button><span>/ {pageCount}</span><button disabled={page >= pageCount} aria-label="下一页" onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>›</button></div><span className="page-size">10 条/页</span></div>
          </section>

          <footer className="footer"><span><ShieldCheck size={14} />节点来自第三方公开清单，本站不运营或背书这些服务器。</span><span>本站缓存最长 4 小时 <b>·</b> <a href={feed?.sources?.[0]?.url || 'https://github.com/morpheusadam/v2ray-config'} target="_blank" rel="noreferrer">上游项目</a></span></footer>
        </div>
      </main>

      {modal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(false); }}><section className="subscription-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-top"><div><span className="modal-kicker"><Copy size={14} />订阅管理</span><h2 id="modal-title">获取公开节点订阅</h2><p>内容随上游清单同步，链接无需登录。</p></div><button className="icon-button" title="关闭" onClick={() => setModal(false)}><X size={18} /></button></div><div className="modal-warning"><ShieldCheck size={16} /><span>仅提供 URI 节点清单；本站未验证节点安全性或当前连通性。</span></div><label className="modal-label">订阅编码</label><div className="format-toggle"><button className={format === 'base64' ? 'selected' : ''} onClick={() => setFormat('base64')}>Base64</button><button className={format === 'plain' ? 'selected' : ''} onClick={() => setFormat('plain')}>原始 URI</button></div><label className="modal-label" htmlFor="sub-url">订阅地址</label><div className="subscription-url"><input id="sub-url" readOnly value={subscriptionUrl} /><button onClick={copySubscription} title="复制链接">{copied ? <Check size={16} /> : <Copy size={16} />}</button></div><div className="modal-footnote"><CircleHelp size={15} />Base64 URI 适用于支持标准代理 URI 订阅的客户端；Clash YAML 等专用格式尚未接入。</div><div className="modal-actions"><a className="button button-secondary" href={subscriptionUrl} target="_blank" rel="noreferrer"><Download size={15} />打开订阅</a><button className="button button-primary" onClick={copySubscription}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? '已复制' : '复制链接'}</button></div></section></div>}
      {toast && <div className="toast"><Check size={15} />{toast}</div>}
    </div>
  );
}

function Metric({ label, value, unit, icon, accent }) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${accent}`}>{icon}</span></div><div className="metric-value">{value}<small>{unit}</small></div><div className="metric-bottom"><span className="metric-info" title="来自公开数据源"><CircleHelp size={13} /></span></div></article>;
}

function NodeRow({ node, onCopy }) {
  return <tr><td><div className="node-name-cell"><span className="node-type-icon"><Radio size={15} /></span><div><strong>{node.name}</strong><small>{node.protocol} · {node.port}</small></div></div></td><td><span className={`protocol-pill ${node.protocol.toLowerCase().replaceAll(' ', '-')}`}>{node.protocol}</span></td><td className="server-cell"><code>{node.server}</code><small>:{node.port}</small></td><td><span className="region-pending"><Globe2 size={13} />待识别</span></td><td className="checked-cell">{node.source || '公开清单'}</td><td><span className="status-pill unverified"><i />未探测</span></td><td><button className="row-action" title="查看订阅" onClick={onCopy}><Copy size={15} /></button></td></tr>;
}

createRoot(document.getElementById('root')).render(<App />);
