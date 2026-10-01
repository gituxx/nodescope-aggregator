import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_LOCALE, LOCALES, getLocalePath } from '../src/i18n.js';

const origin = 'https://node.oinnn.top';
const dist = path.resolve('dist');
const locales = Object.entries(LOCALES);

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function updateTag(html, selector, value) {
  return html.replace(/<(meta|link)\b[^>]*>/g, (tag) => {
    if (!selector(tag)) return tag;
    if (/\bcontent="[^"]*"/.test(tag)) return tag.replace(/\bcontent="[^"]*"/, `content="${escapeHtml(value)}"`);
    if (/\bhref="[^"]*"/.test(tag)) return tag.replace(/\bhref="[^"]*"/, `href="${escapeHtml(value)}"`);
    return tag;
  });
}

function setHtmlLanguage(html, locale) {
  const { hreflang, dir } = LOCALES[locale];
  return html.replace(/<html\b([^>]*)>/, (_tag, attrs) => {
    const cleaned = attrs.replace(/\s+lang="[^"]*"/i, '').replace(/\s+dir="[^"]*"/i, '');
    return `<html${cleaned} lang="${hreflang}" dir="${dir}">`;
  });
}

function addAlternates(html, section) {
  const links = locales.map(([locale, data]) => {
    const href = `${origin}${getLocalePath(locale, section)}`;
    return `<link rel="alternate" hreflang="${data.hreflang}" href="${href}" />`;
  });
  const defaultPath = `${origin}${getLocalePath('en', section)}`;
  links.push(`<link rel="alternate" hreflang="x-default" href="${defaultPath}" />`);
  html = html.replace(/\s*<link\s+rel="alternate"[^>]*>/g, '');
  return html.replace(/(<link\s+rel="canonical"[^>]*>)/, `$1\n    ${links.join('\n    ')}`);
}

function setDescription(html, selector, value) {
  return updateTag(html, (tag) => selector.every((part) => tag.includes(part)), value);
}

function localizeHome(base, locale) {
  const language = LOCALES[locale];
  const seo = language.seo;
  const url = `${origin}${getLocalePath(locale)}`;
  let html = setHtmlLanguage(base, locale);
  html = setDescription(html, ['name="description"'], seo.description);
  html = setDescription(html, ['property="og:locale"'], language.ogLocale);
  html = setDescription(html, ['property="og:title"'], seo.ogTitle);
  html = setDescription(html, ['property="og:description"'], seo.ogDescription);
  html = setDescription(html, ['property="og:url"'], url);
  html = updateTag(html, (tag) => tag.includes('rel="canonical"'), url);
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(seo.title)}</title>`);
  html = html.replace(/(<main class="seo-fallback">\s*<h1>)[\s\S]*?(<\/h1>)/, `$1${escapeHtml(seo.heading)}$2`);
  html = html.replace(/(<main class="seo-fallback">[\s\S]*?<\/h1>\s*<p>)[\s\S]*?(<\/p>)/, `$1${escapeHtml(seo.intro)}$2`);
  html = html.replace(/<a href="\/downloads\/">[\s\S]*?<\/a>/, `<a href="${getLocalePath(locale, 'downloads')}">${escapeHtml(seo.downloadLink)}</a>`);
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'NodeScope',
    url,
    inLanguage: language.hreflang,
    description: seo.description,
  };
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">\n      ${JSON.stringify(structuredData)}\n    </script>`);
  return addAlternates(html, '');
}

function localizeDownloads(base, locale) {
  const language = LOCALES[locale];
  const t = language.text;
  const seo = language.seo;
  const url = `${origin}${getLocalePath(locale, 'downloads')}`;
  const home = getLocalePath(locale);
  const downloads = getLocalePath(locale, 'downloads');
  let html = setHtmlLanguage(base, locale);
  html = setDescription(html, ['name="description"'], seo.downloadsDescription);
  html = setDescription(html, ['property="og:locale"'], language.ogLocale);
  html = setDescription(html, ['property="og:title"'], seo.downloadsOgTitle);
  html = setDescription(html, ['property="og:description"'], seo.downloadsOgDescription);
  html = setDescription(html, ['property="og:url"'], url);
  html = updateTag(html, (tag) => tag.includes('rel="canonical"'), url);
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(seo.downloadsTitle)}</title>`);
  html = html.replaceAll('href="/downloads/"', `href="${downloads}"`).replaceAll('href="/"', `href="${home}"`);

  const replacements = new Map([
    ['NodeScope 节点目录首页', `NodeScope ${t.nodesDirectory}`], ['主导航', t.mainNavigation], ['节点目录', t.downloadNavNodes],
    ['软件下载', t.downloadNavSoftware], ['首页', t.downloadNavHome], ['面包屑', t.downloadBreadcrumb],
    ['官方开源客户端', t.downloadOfficial], ['免费代理客户端软件下载', t.downloadTitle], ['按平台查找', t.downloadPlatformHeading],
    ['按 Windows、macOS、Linux、Android 或 iOS 查找主流免费开源客户端，下载链接直达项目 GitHub 发布页。', t.downloadIntro],
    ['按操作系统筛选', t.downloadFilterLabel], ['全部', t.downloadAll], ['v2rayN', 'v2rayN'],
    ['面向桌面用户的 V2Ray 与 Xray 图形客户端，提供便携包和多个系统发行包。', t.downloadV2rayN],
    ['基于 Mihomo 的跨平台图形客户端，提供 Windows、macOS 和 Linux 安装包。', t.downloadClash],
    ['基于 Clash Meta 的免费开源客户端，桌面与 Android 版本由同一项目维护。', t.downloadFlClash],
    ['跨平台开源客户端，提供桌面安装包和 Android APK，适合从订阅链接导入配置。', t.downloadHiddify],
    ['Android 上的 V2Ray 与 Xray 客户端，GitHub 发布页提供不同设备架构的 APK。', t.downloadV2rayNG],
    ['基于 sing-box 的 Android 开源客户端，项目说明和安装包均由官方仓库发布。', t.downloadNekoBox],
    ['基于 sing-box 的跨平台客户端。桌面与 Android 安装包可从 GitHub 获取；iPhone 和 iPad 版本请通过 App Store 安装。', t.downloadKaring],
    ['iOS App Store', t.downloadIOSStore], ['此平台暂无收录软件。', t.downloadEmpty], ['导入订阅前', t.downloadGuide],
    ['在 NodeScope 的节点目录中选择全部节点、协议、地区或国家，复制生成的订阅地址。', t.downloadStep1],
    ['打开客户端的订阅管理，粘贴订阅地址并更新节点。', t.downloadStep2],
    ['不同客户端支持的协议和订阅格式不同；若导入失败，请查看对应项目的说明文档。', t.downloadStep3],
    ['请只从项目官方发布页下载，并按设备架构选择安装包。公开节点由第三方提供，连接可用性和安全性无法保证。', t.downloadSafety],
    ['返回 NodeScope 节点目录', t.downloadBack], ['NodeScope · 公开节点目录与客户端索引', t.downloadFooter], ['回到首页', t.backHome],
    ['语言', t.language],
  ]);
  for (const [source, translated] of [...replacements].sort(([a], [b]) => b.length - a.length)) html = html.replaceAll(source, escapeHtml(translated));

  const suffix = t.downloadCount;
  html = html.replaceAll('data-count-suffix=" 个开源客户端"', `data-count-suffix="${escapeHtml(suffix)}"`);
  html = html.replaceAll('7 个开源客户端', `7${escapeHtml(suffix)}`);
  html = html.replace(/<option value="[^"]+">(简体中文|English|فارسی|Русский|မြန်မာ)<\/option>/g, (_option, label) => {
    const match = locales.find(([, data]) => data.label === label);
    const [optionLocale] = match;
    return `<option value="${getLocalePath(optionLocale, 'downloads')}"${optionLocale === locale ? ' selected' : ''}>${escapeHtml(match[1].label)}</option>`;
  });
  html = html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/, (_script, raw) => {
    const schema = JSON.parse(raw);
    schema.name = seo.downloadsTitle;
    schema.url = url;
    schema.inLanguage = language.hreflang;
    schema.description = seo.downloadsDescription;
    return `<script type="application/ld+json">\n      ${JSON.stringify(schema)}\n    </script>`;
  });
  return addAlternates(html, 'downloads');
}

const homeTemplate = await readFile(path.join(dist, 'index.html'), 'utf8');
const downloadsTemplate = await readFile(path.join(dist, 'downloads', 'index.html'), 'utf8');
const sitemapUrls = [];

for (const [locale] of locales) {
  const homePath = getLocalePath(locale);
  const homeHtml = localizeHome(homeTemplate, locale);
  const homeFile = locale === DEFAULT_LOCALE ? path.join(dist, 'index.html') : path.join(dist, homePath, 'index.html');
  await mkdir(path.dirname(homeFile), { recursive: true });
  await writeFile(homeFile, homeHtml);
  sitemapUrls.push({ locale, pathname: homePath, section: '' });

  const downloadsPath = getLocalePath(locale, 'downloads');
  const downloadsHtml = localizeDownloads(downloadsTemplate, locale);
  const downloadsFile = path.join(dist, downloadsPath, 'index.html');
  await mkdir(path.dirname(downloadsFile), { recursive: true });
  await writeFile(downloadsFile, downloadsHtml);
  sitemapUrls.push({ locale, pathname: downloadsPath, section: 'downloads' });
}

const sitemapEntries = sitemapUrls.map(({ pathname, section }) => {
  const alternates = locales.map(([locale, language]) => `    <xhtml:link rel="alternate" hreflang="${language.hreflang}" href="${origin}${getLocalePath(locale, section)}" />`).join('\n');
  return `  <url>\n    <loc>${origin}${pathname}</loc>\n${alternates}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${origin}${getLocalePath('en', section)}" />\n  </url>`;
}).join('\n');
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${sitemapEntries}\n</urlset>\n`;
await writeFile(path.join(dist, 'sitemap.xml'), sitemap);
