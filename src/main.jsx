import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, ArrowDown, ArrowDownUp, ArrowUp, ArrowUpRight, Check,
  ChevronDown, CircleHelp, Clock3, Copy, Database, Download, Globe2,
  ListFilter, Menu, Radio, RefreshCw, Search, ShieldCheck,
  Sparkles, Wifi, X
} from 'lucide-react';
import { LOCALES, getLocaleFromPath, getLocalePath, getLocalizedCountryName, translate } from './i18n.js';
import './style.css';

const SUBSCRIPTION_BASE = '/api/subscription';
const SUBSCRIPTION_PROFILES = [
  { value: 'all', key: 'profileAll' },
  { value: 'best100', key: 'profileBest' },
  { value: 'apac', key: 'profileApac' },
  { value: 'west', key: 'profileWest' },
];

function formatDate(value, locale, t) {
  if (!value) return t('waitingSync');
  return new Intl.DateTimeFormat(LOCALES[locale].hreflang, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

function relativeTime(value, locale, t) {
  if (!value) return t('notSynced');
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return t('justSynced');
  const unit = minutes < 60 ? 'minute' : minutes < 1440 ? 'hour' : 'day';
  const amount = unit === 'minute' ? minutes : unit === 'hour' ? Math.floor(minutes / 60) : Math.floor(minutes / 1440);
  return new Intl.RelativeTimeFormat(LOCALES[locale].hreflang, { numeric: 'auto' }).format(-amount, unit);
}

function localizedSourceMethod(method, t) {
  const keys = {
    '国家订阅分片': 'methodCountry', 'GitHub 多源聚合': 'methodGithub', 'GitHub 实测订阅': 'methodTested',
    'GitHub 多频道聚合': 'methodChannels', 'GitHub 每日聚合': 'methodDaily', '公开订阅目录': 'methodDirectory',
    'GitHub 仓库': 'methodRepository', 'GitHub 测速项目': 'methodBenchmarked', 'Telegram 公开频道': 'methodTelegram',
    '网页订阅': 'methodWeb', '逐节点测试报告': 'methodTested',
  };
  return keys[method] ? t(keys[method]) : method;
}

function localizedLocationSource(value, t) {
  const keys = {
    '国家订阅分片': 'methodCountry', '节点名称标识': 'locationFromName', '入口 IP 地理库': 'locationFromEntryIp',
    '出口 IP 测试报告': 'locationFromExitReport',
  };
  return keys[value] ? t(keys[value]) : value;
}

function App() {
  const locale = getLocaleFromPath(window.location.pathname);
  const language = LOCALES[locale];
  const t = (key, values) => translate(locale, key, values);
  const [section, setSection] = useState('overview');
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [protocol, setProtocol] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('name');
  const [sortDir, setSortDir] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [modal, setModal] = useState(false);
  const [format, setFormat] = useState('base64');
  const [subscriptionProfile, setSubscriptionProfile] = useState('all');
  const [subscriptionCountries, setSubscriptionCountries] = useState([]);
  const [subscriptionCountryChoice, setSubscriptionCountryChoice] = useState('');
  const [subscriptionRegion, setSubscriptionRegion] = useState('all');
  const [subscriptionProtocols, setSubscriptionProtocols] = useState([]);
  const [copyingNode, setCopyingNode] = useState(null);
  const [showAllSources, setShowAllSources] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState('');
  const globalSearchRef = useRef(null);

  useEffect(() => {
    document.documentElement.lang = language.hreflang;
    document.documentElement.dir = language.dir;
    document.title = language.seo.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', language.seo.description);
  }, [language]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/nodes', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || t('dataUnavailable'));
      setFeed(result);
    } catch (loadError) {
      setError(loadError.message || t('sourceReadFailed'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const focusSearch = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        globalSearchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  const notify = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const protocols = useMemo(() => feed?.protocols?.map((item) => item.protocol) || [], [feed]);
  const sourceMethods = useMemo(() => {
    const groups = new Map();
    for (const source of feed?.sources || []) {
      const name = source.method || t('otherSource');
      const group = groups.get(name) || { name, count: 0, available: 0 };
      group.count += 1;
      if (!source.error) group.available += 1;
      groups.set(name, group);
    }
    return [...groups.values()];
  }, [feed]);
  const filteredNodes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...(feed?.nodes || [])]
      .filter((node) => !query || `${node.name} ${node.protocol} ${node.server} ${node.port}`.toLowerCase().includes(query))
      .filter((node) => protocol === 'all' || node.protocol === protocol)
      .filter((node) => regionFilter === 'all'
        || (regionFilter === 'apac' && node.region === 'asia-pacific')
        || (regionFilter === 'west' && ['europe', 'americas'].includes(node.region)))
      .filter((node) => countryFilter === 'all' || node.countryCode === countryFilter)
      .filter((node) => statusFilter === 'all'
        || (statusFilter === 'unsupported' ? node.probeStatus === 'unsupported'
          : statusFilter === 'unknown' ? node.status === 'unknown' && !node.probeStatus : node.status === statusFilter))
      .sort((a, b) => {
        if (sort === 'latencyMs') {
          if (a.latencyMs == null) return b.latencyMs == null ? 0 : 1;
          if (b.latencyMs == null) return -1;
          return (a.latencyMs - b.latencyMs) * sortDir;
        }
        return String(a[sort] || '').localeCompare(String(b[sort] || ''), language.hreflang) * sortDir;
      });
  }, [feed, search, protocol, regionFilter, countryFilter, statusFilter, sort, sortDir, language.hreflang]);

  useEffect(() => setPage(1), [search, protocol, regionFilter, countryFilter, statusFilter, pageSize]);

  const pageCount = Math.max(1, Math.ceil(filteredNodes.length / pageSize));
  useEffect(() => setPage((value) => Math.min(value, pageCount)), [pageCount]);
  useEffect(() => {
    if (!modal) return;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setModal(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [modal]);
  useEffect(() => setCopied(false), [format, subscriptionCountries, subscriptionProfile, subscriptionProtocols, subscriptionRegion]);
  const visibleNodes = filteredNodes.slice((page - 1) * pageSize, page * pageSize);
  const count = feed?.count || 0;
  const subscriptionUrl = useMemo(() => {
    const params = new URLSearchParams({ format, profile: subscriptionProfile });
    if (subscriptionRegion !== 'all') params.set('region', subscriptionRegion);
    for (const item of subscriptionProtocols) params.append('protocol', item);
    for (const item of subscriptionCountries) params.append('country', item);
    return `${window.location.origin}${SUBSCRIPTION_BASE}?${params}`;
  }, [format, subscriptionCountries, subscriptionProfile, subscriptionProtocols, subscriptionRegion]);

  function addSubscriptionCountry() {
    if (!subscriptionCountryChoice || subscriptionCountries.includes(subscriptionCountryChoice)) return;
    setSubscriptionCountries((items) => [...items, subscriptionCountryChoice]);
    setSubscriptionCountryChoice('');
  }

  function toggleSubscriptionProtocol(value) {
    setSubscriptionProtocols((items) => items.includes(value)
      ? items.filter((item) => item !== value)
      : [...items, value]);
  }

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
      notify(t('copyBlocked'));
    }
  }

  async function copyNode(node) {
    setCopyingNode(node.index);
    try {
      const response = await fetch(`/api/node?index=${node.index}&version=${encodeURIComponent(feed.fetchedAt)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error((await response.json()).error || t('nodeUnavailable'));
      await navigator.clipboard.writeText(await response.text());
      notify(t('nodeCopied'));
    } catch (copyError) {
      notify(copyError.message || t('nodeCopyFailed'));
    } finally {
      setCopyingNode(null);
    }
  }

  const nav = (
    <>
      <div className="brand-lockup">
        <div className="brand-mark"><Activity size={17} strokeWidth={2.5} /></div>
        <div><strong>NodeScope</strong><span>{t('tagline')}</span></div>
      </div>
      <div className="nav-label">{t('workspace')}</div>
      <button className={`nav-item ${section === 'overview' ? 'active' : ''}`} onClick={() => { setSection('overview'); setMobileMenu(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><Activity size={17} />{t('overview')}</button>
      <button className={`nav-item ${section === 'nodes' ? 'active' : ''}`} aria-current={section === 'nodes' ? 'page' : undefined} onClick={() => { setSection('nodes'); setMobileMenu(false); document.getElementById('nodes')?.scrollIntoView({ behavior: 'smooth' }); }}><Radio size={17} />{t('nodes')}<span className="nav-count">{loading ? '…' : count}</span></button>
      <button className="nav-item" onClick={() => { setModal(true); setMobileMenu(false); }}><Copy size={17} />{t('subscriptions')}</button>
      <a className="nav-item" href={getLocalePath(locale, 'downloads')}><Download size={17} />{t('downloads')}</a>
      <div className="nav-label sources-label">{t('data')}</div>
      <div className={`source-state ${feed?.sources?.some((source) => !source.error) ? 'source-connected' : ''}`}><span className="source-dot" />{t('sources')}<span className="source-tag">{loading ? t('syncing') : feed?.sources?.some((source) => !source.error) ? `${feed.sources.filter((source) => !source.error).length}` : t('unavailable')}</span></div>
      <a className="nav-item" href="https://github.com/gituxx/nodescope-aggregator/issues/new?title=%5BSource%5D%20&body=Public%20source%20URL%3A%20%0ASource%20type%3A%20%0AUpdate%20frequency%3A%20%0AConfirm%20this%20is%20public%20and%20has%20no%20private%20tokens%3A%20" target="_blank" rel="noreferrer"><ArrowUpRight size={17} />{t('submitSource')}</a>
      <div className="sidebar-bottom">
        <div className="refresh-note"><Clock3 size={15} /><span>{t('syncCycle')}</span><strong>{t('everyFourHours')}</strong></div>
        <button className="nav-item" onClick={() => notify(t('publicSourceDisclaimer'))}><CircleHelp size={17} />{t('dataInfo')}</button>
      </div>
    </>
  );

  return (
    <div className="app-shell" dir={language.dir}>
      <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>{nav}</aside>
      {mobileMenu && <button aria-label={t('close')} className="scrim" onClick={() => setMobileMenu(false)} />}
      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu-button" title={t('openMenu')} onClick={() => setMobileMenu(true)}><Menu size={19} /></button>
          <div className="breadcrumb">{t('publicNetwork')} <span>/</span> {section === 'nodes' ? t('nodes') : t('overview')}</div>
          <div className="top-actions">
            <div className="top-search"><Search size={16} /><input ref={globalSearchRef} aria-label={t('search')} placeholder={t('search')} value={search} onChange={(event) => setSearch(event.target.value)} /><kbd>{navigator.userAgent.includes('Mac') ? '⌘ K' : 'Ctrl K'}</kbd></div>
            <label className="language-picker"><Globe2 size={15} /><select aria-label={t('language')} value={locale} onChange={(event) => window.location.assign(getLocalePath(event.target.value))}>{Object.entries(LOCALES).map(([code, item]) => <option key={code} value={code}>{item.label}</option>)}</select><ChevronDown size={12} /></label>
          </div>
        </header>

        <div className="content-wrap">
          <div className={`preview-banner ${error ? 'banner-error' : ''}`}>
            <Sparkles size={15} /><span>{error ? t('dataUnavailable') : t('publicData')}</span>
            <p>{error || t('bannerDescription')}</p>
            {feed?.stale && <strong className="stale-note">{t('cachedSnapshot')}</strong>}
          </div>

          <div className="page-heading">
            <div><div className="eyebrow"><span className={`live-pip ${error ? 'pip-error' : ''}`} />{t('network')} <span className="eyebrow-sep">/</span> {feed?.stale ? t('cachedData') : t('sourceSync')}</div><h1>{section === 'nodes' ? t('nodesTitle') : t('overviewTitle')}</h1><p>{t('nodeIntro')}</p></div>
            <div className="heading-actions"><div className="last-update"><Clock3 size={14} />{loading ? t('loading') : relativeTime(feed?.fetchedAt, locale, t)} <span>·</span> {feed?.count ?? 0}</div><button className="button button-secondary" onClick={loadData} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''} />{t('reload')}</button><button className="button button-primary" onClick={() => setModal(true)}><Download size={15} />{t('getSubscription')}</button></div>
          </div>

          <section className="metrics-grid" aria-label={t('nodesTitle')}>
            <Metric label={t('metricPublic')} value={loading ? '—' : count} unit={locale === 'zh-CN' ? '个' : ''} icon={<Wifi size={17} />} accent="mint" title={t('publicData')} />
            <Metric label={t('metricProtocols')} value={loading ? '—' : protocols.length} unit={locale === 'zh-CN' ? '种' : ''} icon={<Radio size={17} />} accent="blue" title={t('basedOnSnapshot')} />
            <Metric label={t('metricReachable')} value={loading ? '—' : feed?.statuses?.reachable || 0} unit={locale === 'zh-CN' ? '个' : ''} icon={<Activity size={17} />} accent="amber" title={t('probeWarning')} />
            <Metric label={t('metricLocated')} value={loading ? '—' : feed?.identifiedCount || 0} unit={locale === 'zh-CN' ? '个' : ''} icon={<Globe2 size={17} />} accent="coral" title={t('locationsIdentified', { count: feed?.identifiedCount || 0 })} />
          </section>

          <section className="overview-grid">
            <article className="panel availability-panel protocol-panel">
              <div className="panel-heading"><div><h2>{t('protocolDistribution')}</h2><p>{t('basedOnSnapshot')}</p></div><span className="source-label">{t('protocolCount', { count: feed?.protocols?.length || 0 })}</span></div>
              {loading ? <div className="loading-lines"><i /><i /><i /></div> : <div className="protocol-list">
                {(feed?.protocols || []).map((item) => <div className="protocol-row" key={item.protocol}><div className="protocol-row-top"><span>{item.protocol}</span><strong>{item.count}</strong><small>{count ? Math.round(item.count / count * 100) : 0}%</small></div><div className="protocol-track"><i style={{ width: `${count ? item.count / count * 100 : 0}%` }} /></div></div>)}
                {!feed?.protocols?.length && <div className="empty-inline">{t('noProtocolStats')}</div>}
              </div>}
            </article>

            <article className="panel region-panel source-panel">
              <div className="panel-heading"><div><h2>{t('collectionPaths')}</h2><p>{t('collectionMethods')}</p></div><span className={`source-indicator ${feed?.sources?.some((source) => !source.error) ? 'connected' : ''}`}><i />{feed?.sources?.filter((source) => !source.error).length || 0}/{feed?.sources?.length || 0} {t('available')}</span></div>
              {feed ? <>
                <div className="source-methods">{sourceMethods.map((method) => <div className="source-method" key={method.name}><strong>{method.available}/{method.count}</strong><span>{localizedSourceMethod(method.name, t)}</span></div>)}</div>
                <div className="country-summary"><Globe2 size={13} /><span>{t('locationsIdentified', { count: feed.identifiedCount })}</span><strong>{t('countries', { count: feed.countries?.length || 0 })}</strong></div>
                <div className="source-list">{(showAllSources ? feed.sources : feed.sources.slice(0, 6)).map((source) => <div className="source-entry" key={source.url}>
                  <div className="source-entry-heading"><span className={source.error ? 'source-failed-dot' : ''} /><strong>{source.name}</strong><small>{source.error ? t('temporarilyUnavailable') : `${source.mirrorUsed ? `${t('mirrorFallback')} · ` : ''}${t('entries', { count: source.count })}`}</small></div>
                  <a className="source-url" href={source.url} target="_blank" rel="noreferrer">{t('viewSource')} <ArrowUpRight size={13} /></a>
                </div>)}</div>
                {feed.sources.length > 6 && <button className="show-sources" onClick={() => setShowAllSources((value) => !value)}>{showAllSources ? t('collapseSources') : t('showAll', { count: feed.sources.length })}</button>}
                <div className="source-meta"><span>{t('collectedAt')}</span><strong>{formatDate(feed.fetchedAt, locale, t)}</strong></div>
                <div className="source-meta"><span>{t('benchmarkAt')}</span><strong>{formatDate(feed.checkedAt, locale, t)}</strong></div>
                <div className="source-meta"><span>{t('probedAt')}</span><strong>{formatDate(feed.probeUpdatedAt, locale, t)}</strong></div>
                <div className="source-disclaimer"><ShieldCheck size={14} />{t('probeDisclaimer', { count: feed.probeCheckedCount || 0 })}</div>
              </> : <div className="source-empty">{loading ? t('syncingSources') : t('sourceReadFailed')}<button onClick={loadData}>{t('retry')}</button></div>}
            </article>
          </section>

          <section className="panel nodes-panel" id="nodes">
            <div className="nodes-heading"><div><div className="title-inline"><h2>{t('nodesDirectory')}</h2><span className="count-pill">{loading ? '…' : filteredNodes.length}</span></div><p>{t('nodeDescription')}</p></div><div className="nodes-heading-actions"><button className="button button-secondary export-button" onClick={() => setModal(true)}><Download size={15} />{t('subscription')}</button></div></div>
            <div className="filter-row">
              <div className="table-search"><Search size={15} /><input placeholder={t('searchNodes')} value={search} onChange={(event) => setSearch(event.target.value)} /></div>
              <label className="filter-select"><ListFilter size={14} /><select aria-label={t('allProtocols')} value={protocol} onChange={(event) => setProtocol(event.target.value)}><option value="all">{t('allProtocols')}</option>{protocols.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={13} /></label>
              <label className="filter-select"><Globe2 size={14} /><select aria-label={t('region')} value={regionFilter} onChange={(event) => setRegionFilter(event.target.value)}><option value="all">{t('allRegions')}</option><option value="apac">{t('apac')}</option><option value="west">{t('west')}</option></select><ChevronDown size={13} /></label>
              <label className="filter-select"><select aria-label={t('country')} value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)}><option value="all">{t('allCountries')}</option>{(feed?.countries || []).map((item) => <option key={item.countryCode} value={item.countryCode}>{getLocalizedCountryName(item.countryCode, locale)} · {item.countryCode}</option>)}</select><ChevronDown size={13} /></label>
              <label className="filter-select"><select aria-label={t('statusLatency')} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">{t('allStatuses')}</option><option value="reachable">{t('tcpReachable')}</option><option value="available">{t('upstreamTested')}</option><option value="upstream">{t('upstreamFiltered')}</option><option value="unknown">{t('notTested')}</option><option value="unsupported">{t('unsupported')}</option><option value="failed">{t('testFailed')}</option></select><ChevronDown size={13} /></label>
            </div>
            <div className="table-scroll"><table><thead><tr><th><button className="th-sort" onClick={() => toggleSort('name')}>{t('name')}{sort === 'name' ? (sortDir > 0 ? <ArrowDown size={13} /> : <ArrowUp size={13} />) : <ArrowDownUp size={13} />}</button></th><th>{t('protocol')}</th><th><button className="th-sort" onClick={() => toggleSort('server')}>{t('server')}{sort === 'server' ? (sortDir > 0 ? <ArrowDown size={13} /> : <ArrowUp size={13} />) : <ArrowDownUp size={13} />}</button></th><th>{t('country')}</th><th>{t('source')}</th><th><button className="th-sort" onClick={() => toggleSort('latencyMs')}>{t('statusLatency')}{sort === 'latencyMs' ? (sortDir > 0 ? <ArrowDown size={13} /> : <ArrowUp size={13} />) : <ArrowDownUp size={13} />}</button></th><th aria-label={t('actions')} /></tr></thead><tbody>
              {visibleNodes.map((node) => <NodeRow key={node.index} node={node} locale={locale} t={t} copying={copyingNode === node.index} onCopy={() => copyNode(node)} />)}
            </tbody></table></div>
            {!loading && !error && filteredNodes.length === 0 && <div className="empty-state"><Search size={22} /><strong>{t('noMatches')}</strong><span>{t('tryOtherFilters')}</span><button onClick={() => { setSearch(''); setProtocol('all'); setRegionFilter('all'); setCountryFilter('all'); setStatusFilter('all'); }}>{t('clearFilters')}</button></div>}
            {loading && <div className="table-loading"><i /><i /><i /></div>}
            {error && !feed && <div className="empty-state"><Database size={22} /><strong>{t('dataUnavailable')}</strong><span>{error}</span><button onClick={loadData}>{t('retry')}</button></div>}
            <div className="table-footer"><span>{t('showRange')} <strong>{filteredNodes.length ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filteredNodes.length)}` : '0'}</strong> {t('of')} <strong>{filteredNodes.length}</strong> {t('matches')}</span><div className="pagination"><button disabled={page <= 1} aria-label={t('previousPage')} onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button><span className="page-current">{page}</span><span>/ {pageCount}</span><button disabled={page >= pageCount} aria-label={t('nextPage')} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>›</button></div><label className="page-size"><select aria-label={t('perPage')} value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>{[10, 25, 50].map((size) => <option key={size} value={size}>{size} {t('perPage')}</option>)}</select><ChevronDown size={12} /></label></div>
          </section>

          <footer className="footer"><span><ShieldCheck size={14} />{t('publicSourceDisclaimer')}</span><span>{t('cachedFor')} <b>·</b> <a href={feed?.sources?.[0]?.url || 'https://github.com/morpheusadam/v2ray-config'} target="_blank" rel="noreferrer">{t('upstreamProject')}</a></span></footer>
        </div>
      </main>

      {modal && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(false); }}>
        <section className="subscription-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className="modal-top"><div><span className="modal-kicker"><Copy size={14} />{t('subscription')}</span><h2 id="modal-title">{t('subscriptionTitle')}</h2><p>{t('subscriptionDescription')}</p></div><button className="icon-button" title={t('close')} onClick={() => setModal(false)}><X size={18} /></button></div>
          <div className="modal-warning"><ShieldCheck size={16} /><span>{t('probeWarning')}</span></div>
          <label className="modal-label">{t('nodeScope')}</label>
          <div className="profile-toggle">{SUBSCRIPTION_PROFILES.map((item) => <button key={item.value} type="button" className={subscriptionProfile === item.value ? 'selected' : ''} aria-pressed={subscriptionProfile === item.value} onClick={() => setSubscriptionProfile(item.value)}>{t(item.key)}</button>)}</div>
          <label className="modal-label" htmlFor="subscription-region">{t('region')}</label>
          <select id="subscription-region" className="country-subscription-select" value={subscriptionRegion} onChange={(event) => setSubscriptionRegion(event.target.value)}><option value="all">{t('allRegions')}</option><option value="apac">{t('apac')}</option><option value="europe">{t('europe')}</option><option value="americas">{t('americas')}</option><option value="west">{t('west')}</option></select>
          <label className="modal-label">{t('protocolsMulti')}</label>
          <div className="subscription-protocols">{protocols.map((item) => <label className="subscription-check" key={item}><input type="checkbox" checked={subscriptionProtocols.includes(item)} onChange={() => toggleSubscriptionProtocol(item)} /><span>{item}</span></label>)}</div>
          <label className="modal-label" htmlFor="subscription-country">{t('countriesMulti')}</label>
          <div className="country-picker"><select id="subscription-country" className="country-subscription-select" value={subscriptionCountryChoice} onChange={(event) => setSubscriptionCountryChoice(event.target.value)}><option value="">{t('chooseCountry')}</option>{(feed?.countries || []).filter((item) => !subscriptionCountries.includes(item.countryCode)).map((item) => <option key={item.countryCode} value={item.countryCode}>{getLocalizedCountryName(item.countryCode, locale)} · {item.countryCode} ({item.count})</option>)}</select><button className="button button-secondary" disabled={!subscriptionCountryChoice} onClick={addSubscriptionCountry}>{t('add')}</button></div>
          {subscriptionCountries.length > 0 && <div className="selected-countries">{subscriptionCountries.map((code) => {
            const country = feed?.countries?.find((item) => item.countryCode === code);
            const countryName = country ? getLocalizedCountryName(code, locale) : code;
            return <span className="selected-country" key={code}>{countryName}<button title={t('removeCountry', { country: countryName })} aria-label={t('removeCountry', { country: countryName })} onClick={() => setSubscriptionCountries((items) => items.filter((item) => item !== code))}><X size={12} /></button></span>;
          })}</div>}
          <label className="modal-label">{t('encoding')}</label>
          <div className="format-toggle"><button className={format === 'base64' ? 'selected' : ''} onClick={() => setFormat('base64')}>{t('base64')}</button><button className={format === 'plain' ? 'selected' : ''} onClick={() => setFormat('plain')}>{t('plain')}</button></div>
          <label className="modal-label" htmlFor="sub-url">{t('subscriptionAddress')}</label>
          <div className="subscription-url"><input id="sub-url" readOnly value={subscriptionUrl} /><button onClick={copySubscription} title={t('copyLink')}>{copied ? <Check size={16} /> : <Copy size={16} />}</button></div>
          <div className="modal-footnote"><CircleHelp size={15} />{t('filterHelp')}</div>
          <div className="modal-actions"><a className="button button-secondary" href={subscriptionUrl} target="_blank" rel="noreferrer"><Download size={15} />{t('openSubscription')}</a><button className="button button-primary" onClick={copySubscription}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? t('copied') : t('copyLink')}</button></div>
        </section>
      </div>}
      {toast && <div className="toast"><Check size={15} />{toast}</div>}
    </div>
  );
}

function Metric({ label, value, unit, icon, accent, title }) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${accent}`}>{icon}</span></div><div className="metric-value">{value}<small>{unit}</small></div><div className="metric-bottom"><span className="metric-info" title={title}><CircleHelp size={13} /></span></div></article>;
}

function NodeRow({ node, locale, t, onCopy, copying }) {
  const statusClass = node.status === 'available' || node.status === 'reachable' ? 'online' : node.status === 'upstream' ? 'upstream' : node.status === 'failed' ? 'failed' : 'unverified';
  const statusText = node.status === 'reachable' && node.latencyMs != null ? `${t('statusReachable')} · ${node.latencyMs} ms`
    : node.status === 'available' && node.latencyMs != null ? `${t('statusAvailable')} · ${node.latencyMs} ms`
      : node.status === 'upstream' ? t('statusUpstream')
        : node.status === 'failed' ? t('statusFailed')
          : node.probeStatus === 'unsupported' ? t('unsupported')
            : node.status === 'unknown' ? t('statusUnknown') : t('nodeUnverified');
  const locationText = localizedLocationSource(node.locationSource, t) || t('nodeUnknownLocation');
  const countryName = node.countryCode ? getLocalizedCountryName(node.countryCode, locale) : '';
  const checkedTitle = node.checkedAt ? `${statusText} · ${formatDate(node.checkedAt, locale, t)}${node.probeDetail ? ` · ${node.probeDetail}` : ''}` : t('nodeUnverified');
  return <tr>
    <td><div className="node-name-cell"><span className="node-type-icon"><Radio size={15} /></span><div><strong>{node.name}</strong><small>{node.protocol} · {node.port}</small></div></div></td>
    <td><span className={`protocol-pill ${node.protocol.toLowerCase().replaceAll(' ', '-')}`}>{node.protocol}</span></td>
    <td className="server-cell"><code>{node.server}</code><small>:{node.port}</small></td>
    <td><span className={`region-pending ${node.countryCode ? 'region-known' : ''} ${node.locationSource === '节点名称标识' ? 'region-inferred' : ''}`} title={node.countryCode ? locationText : t('nodeUnknownLocation')}>
      {node.countryCode ? <><span className="flag-chip">{node.countryCode}</span>{countryName}</> : <><Globe2 size={13} />{t('notIdentified')}</>}
    </span></td>
    <td className="checked-cell">{node.source || t('publicList')}</td>
    <td><span className={`status-pill ${statusClass}`} title={checkedTitle}><i />{statusText}</span></td>
    <td><button className="row-action" title={t('nodeCopyTitle')} aria-label={`${t('copyLink')}: ${node.name}`} disabled={copying} onClick={onCopy}>{copying ? <RefreshCw size={15} className="spin" /> : <Copy size={15} />}</button></td>
  </tr>;
}

createRoot(document.getElementById('root')).render(<App />);
