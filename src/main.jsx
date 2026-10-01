import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, ArrowDownUp, ArrowDown, ArrowUp, ArrowUpRight, Bell, Check,
  ChevronDown, CircleHelp, Clock3, Copy, Database, Download, Globe2, ListFilter,
  Menu, MoreHorizontal, Radio, RefreshCw, Search, ShieldCheck, SlidersHorizontal,
  Sparkles, Wifi, X
} from 'lucide-react';
import './style.css';

const samples = [
  { id: 1, name: 'Tokyo · Edge 04', protocol: 'VLESS', country: '日本', flag: 'JP', city: '东京', latency: 82, uptime: 99.4, checked: '2 分钟前', status: 'online' },
  { id: 2, name: 'Singapore · Relay 12', protocol: 'Trojan', country: '新加坡', flag: 'SG', city: '新加坡', latency: 116, uptime: 97.8, checked: '3 分钟前', status: 'online' },
  { id: 3, name: 'Frankfurt · Core 02', protocol: 'Shadowsocks', country: '德国', flag: 'DE', city: '法兰克福', latency: 184, uptime: 96.2, checked: '4 分钟前', status: 'online' },
  { id: 4, name: 'Los Angeles · West 09', protocol: 'VMess', country: '美国', flag: 'US', city: '洛杉矶', latency: 231, uptime: 91.6, checked: '5 分钟前', status: 'online' },
  { id: 5, name: 'Seoul · Transit 03', protocol: 'Hysteria2', country: '韩国', flag: 'KR', city: '首尔', latency: 69, uptime: 98.9, checked: '6 分钟前', status: 'online' },
  { id: 6, name: 'Amsterdam · Node 18', protocol: 'VLESS', country: '荷兰', flag: 'NL', city: '阿姆斯特丹', latency: 206, uptime: 88.3, checked: '8 分钟前', status: 'unstable' },
  { id: 7, name: 'Taipei · Link 07', protocol: 'Shadowsocks', country: '中国台湾', flag: 'TW', city: '台北', latency: 43, uptime: 99.1, checked: '9 分钟前', status: 'online' },
  { id: 8, name: 'London · Gateway 01', protocol: 'Trojan', country: '英国', flag: 'GB', city: '伦敦', latency: 257, uptime: 86.7, checked: '12 分钟前', status: 'unstable' },
];

const regions = [
  { name: '亚洲', value: 48, count: 326, color: 'mint' },
  { name: '欧洲', value: 31, count: 214, color: 'blue' },
  { name: '北美', value: 16, count: 109, color: 'amber' },
  { name: '其他', value: 5, count: 34, color: 'coral' },
];

function App() {
  const [section, setSection] = useState('overview');
  const [search, setSearch] = useState('');
  const [protocol, setProtocol] = useState('全部协议');
  const [status, setStatus] = useState('全部状态');
  const [sort, setSort] = useState('latency');
  const [sortDir, setSortDir] = useState(1);
  const [modal, setModal] = useState(false);
  const [client, setClient] = useState('Clash Meta');
  const [copied, setCopied] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState('');

  const nodes = useMemo(() => samples
    .filter((node) => `${node.name} ${node.protocol} ${node.country} ${node.city}`.toLowerCase().includes(search.toLowerCase()))
    .filter((node) => protocol === '全部协议' || node.protocol === protocol)
    .filter((node) => status === '全部状态' || (status === '在线' ? node.status === 'online' : node.status === 'unstable'))
    .sort((a, b) => (a[sort] > b[sort] ? 1 : -1) * sortDir), [search, protocol, status, sort, sortDir]);

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  function toggleSort(key) {
    if (sort === key) setSortDir((direction) => direction * -1);
    else { setSort(key); setSortDir(1); }
  }

  async function copySubscription() {
    const url = `https://node.oinnn.top/sub/demo?target=${encodeURIComponent(client.toLowerCase().replaceAll(' ', '-'))}`;
    try {
      await navigator.clipboard.writeText(url);
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
      <div className="workspace"><div className="workspace-avatar">N</div><div><strong>公共节点</strong><small>免费工作区</small></div><ChevronDown size={15} /></div>
      <div className="nav-label">工作台</div>
      <button className={`nav-item ${section === 'overview' ? 'active' : ''}`} onClick={() => { setSection('overview'); setMobileMenu(false); }}><Activity size={17} />概览</button>
      <button className={`nav-item ${section === 'nodes' ? 'active' : ''}`} onClick={() => { setSection('nodes'); setMobileMenu(false); }}><Radio size={17} />节点列表<span className="nav-count">683</span></button>
      <button className={`nav-item ${section === 'subscription' ? 'active' : ''}`} onClick={() => { setSection('subscription'); setModal(true); setMobileMenu(false); }}><Copy size={17} />订阅链接</button>
      <div className="nav-label sources-label">数据</div>
      <div className="source-state"><span className="source-dot" />采集器<span className="source-tag">未连接</span></div>
      <div className="sidebar-bottom">
        <div className="refresh-note"><Clock3 size={15} /><span>更新周期</span><strong>每 4 小时</strong></div>
        <button className="nav-item" onClick={() => notify('帮助中心正在准备中')}><CircleHelp size={17} />帮助与反馈</button>
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
          <div className="breadcrumb">公共节点 <span>/</span> {section === 'nodes' ? '节点列表' : section === 'subscription' ? '订阅管理' : '概览'}</div>
          <div className="top-actions">
            <div className="top-search"><Search size={16} /><input placeholder="搜索节点、地区…" value={search} onChange={(event) => setSearch(event.target.value)} /><kbd>⌘ K</kbd></div>
            <button className="icon-button notification-button" title="通知" onClick={() => notify('目前没有新通知')}><Bell size={18} /><i /></button>
            <div className="user-chip">访</div>
          </div>
        </header>

        <div className="content-wrap">
          <div className="preview-banner"><Sparkles size={15} /><span>界面预览</span><p>当前展示样例数据。连接采集器后才会显示实时节点。</p><button onClick={() => notify('采集服务尚未配置')}>了解更多 <ArrowUpRight size={13} /></button></div>

          <div className="page-heading">
            <div><div className="eyebrow"><span className="live-pip" />节点网络 <span className="eyebrow-sep">/</span> 实时状态</div><h1>网络概览</h1><p>公开节点的健康状态、可用性与分布情况。</p></div>
            <div className="heading-actions"><div className="last-update"><Clock3 size={14} />刚刚更新 <span>·</span> 样例数据</div><button className="button button-secondary" onClick={() => notify('采集器未连接，无法刷新实时数据')}><RefreshCw size={15} />刷新</button><button className="button button-primary" onClick={() => setModal(true)}><Download size={15} />获取订阅</button></div>
          </div>

          <section className="metrics-grid" aria-label="节点统计">
            <Metric label="可用节点" value="683" unit="个" trend="+12" trendLabel="较上次更新" icon={<Wifi size={17} />} accent="mint" />
            <Metric label="在线率" value="94.8" unit="%" trend="+2.4%" trendLabel="近 24 小时" icon={<Activity size={17} />} accent="blue" />
            <Metric label="平均延迟" value="168" unit="ms" trend="-18 ms" trendLabel="较上次更新" icon={<Clock3 size={17} />} accent="amber" />
            <Metric label="覆盖地区" value="42" unit="个" trend="+3" trendLabel="较上次更新" icon={<Globe2 size={17} />} accent="coral" />
          </section>

          <section className="overview-grid">
            <article className="panel availability-panel">
              <div className="panel-heading"><div><h2>可用性趋势</h2><p>过去 24 小时 · 每 30 分钟采样</p></div><button className="select-control" onClick={() => notify('时间范围选项即将开放')}>24 小时 <ChevronDown size={14} /></button></div>
              <div className="chart-summary"><strong>94.8<span>%</span></strong><span className="trend positive"><ArrowUpRight size={14} />2.4%</span><small>较前一周期</small></div>
              <div className="chart-wrap">
                <div className="chart-y-labels"><span>100%</span><span>90%</span><span>80%</span><span>70%</span></div>
                <div className="chart-plot">
                  <div className="chart-gridline line-100" /><div className="chart-gridline line-90" /><div className="chart-gridline line-80" /><div className="chart-gridline line-70" />
                  <svg className="availability-chart" viewBox="0 0 720 150" preserveAspectRatio="none" role="img" aria-label="过去24小时在线率趋势图">
                    <defs><linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#35a981" stopOpacity=".18"/><stop offset="100%" stopColor="#35a981" stopOpacity="0"/></linearGradient></defs>
                    <path d="M0 34 C18 32 20 51 42 48 S70 44 88 50 S115 61 132 56 S159 40 176 44 S204 54 220 47 S247 42 264 45 S291 56 308 51 S334 60 352 47 S378 38 396 42 S423 54 440 45 S466 35 484 42 S510 49 528 43 S554 28 572 36 S598 46 616 39 S644 30 660 34 S693 27 720 31 L720 150 L0 150 Z" fill="url(#areaFill)" />
                    <path d="M0 34 C18 32 20 51 42 48 S70 44 88 50 S115 61 132 56 S159 40 176 44 S204 54 220 47 S247 42 264 45 S291 56 308 51 S334 60 352 47 S378 38 396 42 S423 54 440 45 S466 35 484 42 S510 49 528 43 S554 28 572 36 S598 46 616 39 S644 30 660 34 S693 27 720 31" fill="none" stroke="#299b74" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
                    <circle cx="720" cy="31" r="4" fill="#fff" stroke="#299b74" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
                  </svg>
                  <div className="chart-x-labels"><span>00:00</span><span>04:00</span><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span><span>现在</span></div>
                </div>
              </div>
              <div className="chart-legend"><span><i className="legend-line" />在线率</span><span><i className="legend-dot" />当前 94.8%</span></div>
            </article>

            <article className="panel region-panel">
              <div className="panel-heading"><div><h2>地区分布</h2><p>按节点所在地区统计</p></div><button className="icon-button small-icon" title="地区分布信息" onClick={() => notify('地区信息来源于节点出口 IP')}><CircleHelp size={16} /></button></div>
              <div className="region-total"><strong>683</strong><span>个节点</span></div>
              <div className="region-bar">{regions.map((region) => <div key={region.name} className={`region-segment ${region.color}`} style={{ width: `${region.value}%` }} title={`${region.name} ${region.value}%`} />)}</div>
              <div className="region-list">{regions.map((region) => <div className="region-row" key={region.name}><span className={`region-dot ${region.color}`} /><span className="region-name">{region.name}</span><strong>{region.count}</strong><span className="region-percent">{region.value}%</span></div>)}</div>
              <button className="text-link" onClick={() => setSection('nodes')}>查看全部地区 <ArrowUpRight size={14} /></button>
            </article>
          </section>

          <section className="panel nodes-panel">
            <div className="nodes-heading"><div><div className="title-inline"><h2>节点列表</h2><span className="count-pill">683</span></div><p>按健康状态筛选并查看节点详情</p></div><div className="nodes-heading-actions"><button className="button button-secondary export-button" onClick={() => notify('请先连接采集器以导出实时数据')}><Download size={15} />导出</button><button className="button button-secondary subscribe-small" onClick={() => setModal(true)}><Copy size={15} />订阅</button></div></div>
            <div className="filter-row">
              <div className="table-search"><Search size={15} /><input placeholder="搜索名称、协议或地区" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
              <label className="filter-select"><ListFilter size={14} /><select aria-label="筛选协议" value={protocol} onChange={(event) => setProtocol(event.target.value)}><option>全部协议</option>{['VLESS', 'Trojan', 'Shadowsocks', 'VMess', 'Hysteria2'].map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={13} /></label>
              <label className="filter-select"><select aria-label="筛选状态" value={status} onChange={(event) => setStatus(event.target.value)}><option>全部状态</option><option>在线</option><option>不稳定</option></select><ChevronDown size={13} /></label>
              <div className="filter-spacer" /><button className="filter-icon-button" title="更多筛选" onClick={() => notify('更多筛选即将开放')}><SlidersHorizontal size={15} /><span>筛选</span></button>
            </div>
            <div className="table-scroll"><table><thead><tr><th>节点名称</th><th>协议</th><th>地区</th><th><button className="th-sort" onClick={() => toggleSort('latency')}>延迟{sort === 'latency' ? (sortDir > 0 ? <ArrowDown size={13} /> : <ArrowUp size={13} />) : <ArrowDownUp size={13} />}</button></th><th><button className="th-sort" onClick={() => toggleSort('uptime')}>可用率{sort === 'uptime' ? (sortDir > 0 ? <ArrowDown size={13} /> : <ArrowUp size={13} />) : <ArrowDownUp size={13} />}</button></th><th>最近检测</th><th>状态</th><th aria-label="操作" /></tr></thead><tbody>{nodes.map((node) => <NodeRow key={node.id} node={node} onCopy={() => setModal(true)} />)}</tbody></table></div>
            {nodes.length === 0 && <div className="empty-state"><Search size={22} /><strong>没有找到匹配的节点</strong><span>试试其他关键词或筛选条件</span><button onClick={() => { setSearch(''); setProtocol('全部协议'); setStatus('全部状态'); }}>清除筛选</button></div>}
            <div className="table-footer"><span>显示 <strong>{nodes.length ? 1 : 0}–{nodes.length}</strong> 条，共 <strong>683</strong> 个样例</span><div className="pagination"><button disabled aria-label="上一页">‹</button><button className="page-current">1</button><button onClick={() => notify('当前为演示数据，暂不支持翻页')}>2</button><button onClick={() => notify('当前为演示数据，暂不支持翻页')}>3</button><span>…</span><button onClick={() => notify('当前为演示数据，暂不支持翻页')}>86</button><button aria-label="下一页" onClick={() => notify('当前为演示数据，暂不支持翻页')}>›</button></div><label className="page-size"><select aria-label="每页条数"><option>10 条/页</option><option>20 条/页</option><option>50 条/页</option></select><ChevronDown size={13} /></label></div>
          </section>

          <footer className="footer"><span><ShieldCheck size={14} />节点状态仅供参考，使用前请自行确认来源与合规性。</span><span>NodeScope <b>·</b> 数据每 4 小时更新</span></footer>
        </div>
      </main>

      {modal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(false); }}><section className="subscription-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-top"><div><span className="modal-kicker"><Copy size={14} />订阅管理</span><h2 id="modal-title">获取订阅链接</h2><p>选择客户端格式，生成对应的订阅地址。</p></div><button className="icon-button" title="关闭" onClick={() => setModal(false)}><X size={18} /></button></div><div className="modal-warning"><Sparkles size={16} /><span>演示链接尚未连接后端，当前不可导入客户端。</span></div><label className="modal-label">客户端格式</label><div className="client-options">{['Clash Meta', 'sing-box', 'V2Ray', 'Shadowrocket'].map((name) => <button key={name} className={`client-option ${client === name ? 'selected' : ''}`} onClick={() => setClient(name)}><span className="client-radio">{client === name && <i />}</span><span>{name}</span>{name === 'Clash Meta' && <span className="recommended">常用</span>}</button>)}</div><label className="modal-label" htmlFor="sub-url">订阅地址</label><div className="subscription-url"><input id="sub-url" readOnly value={`https://node.oinnn.top/sub/demo?target=${encodeURIComponent(client.toLowerCase().replaceAll(' ', '-'))}`} /><button onClick={copySubscription} title="复制链接">{copied ? <Check size={16} /> : <Copy size={16} />}</button></div><div className="modal-footnote"><ShieldCheck size={15} />此链接仅为界面预览。连接数据服务后会为你生成真实订阅。</div><div className="modal-actions"><button className="button button-secondary" onClick={() => setModal(false)}>关闭</button><button className="button button-primary" onClick={copySubscription}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? '已复制' : '复制链接'}</button></div></section></div>}
      {toast && <div className="toast"><Check size={15} />{toast}</div>}
    </div>
  );
}

function Metric({ label, value, unit, trend, trendLabel, icon, accent }) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${accent}`}>{icon}</span></div><div className="metric-value">{value}<small>{unit}</small></div><div className="metric-bottom"><span className="metric-trend">{trend}</span><span>{trendLabel}</span><span className="metric-info" title="演示统计"><CircleHelp size={13} /></span></div></article>;
}

function NodeRow({ node, onCopy }) {
  return <tr><td><div className="node-name-cell"><span className="node-type-icon"><Radio size={15} /></span><div><strong>{node.name}</strong><small>节点 ID · NS-{String(node.id).padStart(4, '0')}</small></div></div></td><td><span className={`protocol-pill ${node.protocol.toLowerCase().replaceAll(' ', '-')}`}>{node.protocol}</span></td><td><div className="country-cell"><span className="flag-chip">{node.flag}</span><span>{node.country}</span><small>{node.city}</small></div></td><td><span className={`latency ${node.latency < 100 ? 'latency-fast' : node.latency > 220 ? 'latency-slow' : ''}`}><i />{node.latency} ms</span></td><td><span className="uptime-value">{node.uptime}%</span></td><td className="checked-cell">{node.checked}</td><td><span className={`status-pill ${node.status}`}><i />{node.status === 'online' ? '在线' : '不稳定'}</span></td><td><button className="row-action" title="复制节点" onClick={onCopy}><Copy size={15} /></button></td></tr>;
}

createRoot(document.getElementById('root')).render(<App />);
