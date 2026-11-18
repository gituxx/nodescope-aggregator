# Changelog

本项目的所有重要变更均记录在此文件中。时间均为 `Asia/Shanghai`（UTC+8）。

---

## [2026-11-18] — 编写完整交接文档体系与线上状态全面核实

### 新增
- `AGENTS.md`：AI Agent 30 秒速览入口，包含项目概览、业主偏好、共用资源红线与常用命令。
- `docs/AGENT-HANDOFF.md`：AI 详细技术交接手册，涵盖线上实测状态表、“看起来正常、实际不正常”的 6 项隐患、系统架构 Mermaid 图、三阶段代理实测与 Worker 探测流程、逐文件代码地图、共用 Cloudflare 账号资源边界、定时任务、备份恢复、回滚手册、从零重建指南、10 条真实踩坑记录与待决事项。
- `docs/项目说明.md`：面向非技术读者的项目说明，含使用方式、功能状态表、简化原理图、费用说明、按时间排序的到期日汇总表与风险边界。
- `CREDENTIALS.local.md`（本地权限 `600`，已加入 `.gitignore`）：汇总 Cloudflare 与 GitHub 完整登录凭据、资源 ID、权限范围警示与无感轮换步骤。
- `CHANGELOG.md`：建立项目变更日志。

### 安全与配置
- `.gitignore`：新增 `CREDENTIALS.local.md` 与 `*.local.md` 忽略规则，并清理 `/tmp` 下的历史调试残留文件。

---

## [2026-11-16] — 新增 `node.winv.cc` 自定义域名与多域名自适应（提交 `4cb5b01`）

### 新增
- 在 Cloudflare `winv.cc` 域名（Zone `6c67b3a052599b68364dacc7db6b389c`）下添加 `CNAME node.winv.cc -> nodescope-aggregator.pages.dev`（开启 Cloudflare 代理）。
- 在 Cloudflare Pages 项目 `nodescope-aggregator` 下绑定并激活 `node.winv.cc` 自定义域名与 SSL 证书。

### 修复
- `functions/api/[[path]].js`：将 Clash 订阅 YAML 头部注释中的站点链接从硬编码 `https://node.oinnn.top/` 改为动态 `${url.origin}/`（部署 ID `d236b022-e1fd-4896-8440-cae26a5e0601`）。

---

## [2026-11-05] — 订阅管理交互优化与语义化订阅备注名（提交 `e37d054`、`0e06d90`）

### 新增
- `lib/subscription.js`、`lib/regions.js`：将订阅过滤逻辑 `filterSubscription` 与地区集合抽取为前后端共用零依赖模块；新增 `subscriptionTitle()` 自动生成包含范围、国家、协议和格式的订阅备注名（如 `NodeScope · 实测可用 · 日本 · VLESS · Clash`）。
- `functions/api/[[path]].js`：`/api/subscription` 响应新增 `Profile-Title: base64:...` 头与 `Content-Disposition` RFC 5987 UTF-8 文件名；前端订阅 URL 末尾追加 `#备注` fragment，解决客户端导入订阅时回退显示网页 `<title>` 的问题。
- `src/main.jsx`、`src/style.css`、`src/i18n.js`：
  - 订阅弹窗实时计算并展示“当前条件匹配 N 个节点”，无匹配时高亮提醒并提供「重置」按钮。
  - 订阅筛选配置持久化至 `localStorage`（`nodescope:subscription`），并在新快照加载后自动剔除已下线的国家码或协议，避免触发 API 400。

### 修复
- `src/main.jsx`：修复订阅弹窗“切换国家没反应”问题——移除多余的「添加」按钮，国家下拉框改为选中即刻加入已选列表。
- `functions/api/[[path]].js`：修复 Clash 格式订阅响应头 `X-NodeScope-Count` 计数未剔除 Clash 转换失败节点的问题。

---

## [2026-11-04 ~ 2026-11-05] — 引入 GitHub Actions + Mihomo 真实代理验证流水线（提交 `09d7391` ~ `eb2a99a`）

### 新增
- `.github/workflows/verify.yml`、`scripts/verify.mjs`、`lib/verify.js`、`lib/clash.js`：
  - 接入 63 个公开节点源（候选池 ~25 万节点），通过 `planRun` 每次按 70,000 预算优先复测已知可用节点与新节点。
  - Phase 1：Mihomo URL Test 真实协议握手（50 节点分片 + 二分折半坏节点隔离）。
  - Phase 2：经由节点访问 `cloudflare.com/cdn-cgi/trace` 获取真实出口 IP 与国家，并执行 1MB 下载测速（`speedMbps`）。
  - Phase 3：转换为 Clash / Mihomo 配置后二次实测，确保导出的 Clash 订阅节点均在 Clash 核心下可用。
  - 维护 16 次滚动历史（`results/history.json`）计算拉普拉斯平滑稳定性与 `0~100` 综合评分，限制单出口 IP + 协议最多保留 8 个节点（`MAX_PER_EXIT_IP = 8`），结果强制推送至单提交 `results` 分支。
- `functions/api/[[path]].js`：新增 `profile=verified` 与 `format=clash`；`/api/node` 支持稳定哈希 `id` 查询。
- `.github/workflows/ci.yml`、`tests/verify.test.js`：新增 CI 工作流与实测模块单测（共 20 项单测）。

### 修复
- `lib/feed.js`：反转义网页源中的 `&amp;`，过滤私网地址与占位符 UUID，实现忽略参数顺序与空参数的规范化 `identity` 去重。
- `lib/probe.js`：不再使用 Cloudflare TCP 探测名额测试 UDP 协议，且不允许 TCP 探测失败覆盖代理实测（`verifiedAt`）结果。

---

## [2026-10-01] — 项目初始化与多语言站点上线（提交 `326d4e9` ~ `8767599`）

### 新增
- 构建 NodeScope 仪表盘前端、Cloudflare Pages Functions API（`/api/nodes`、`/api/stats`、`/api/node`、`/api/subscription`）与 `nodescope-collector` Worker。
- 支持简体中文、英语、波斯语（RTL）、俄语、缅甸语 5 种语言界面、SEO 静态路由生成（`scripts/generate-locales.mjs`）与客户端软件下载页（`/downloads/`）。
- 绑定生产域名 `node.oinnn.top` 与 Cloudflare KV `NODESCOPE_DATA`。
