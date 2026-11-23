# AGENTS.md — NodeScope AI 入口指南

## AI-Workspace 入口

- 项目 ID 为 `node`。先读本仓库的 [README.md](README.md)。项目背景和架构见 [项目说明](docs/项目说明.md) 与 [技术交接](docs/AGENT-HANDOFF.md)。运维命令和旧交接按当前任务范围查阅，文档中的历史本机路径按当前检出位置解释。
- 从当前 Git 仓库或 worktree 往上找 `control/projects.yaml`。若 worktree 在工作区外，再从 `git worktree list --porcelain` 的第一条 `worktree` 路径（主仓库）往上找。只有注册表中该项目的 `repo` 路径与主仓库吻合时，才采用该工作区。
- 找到工作区后，读取根目录 `AGENTS.md` 和 `README.md`，以及注册表指向的本项目 `coordination/README.md` 和 `tasks.yaml`。主仓库与各 worktree 使用同一份共享记录。
- 单独克隆时，用本仓库内的文档和任务来源开展协作。若任务依赖共享记录，请要求提供对应的工作区或任务内容。
- `CREDENTIALS.local.md` 是主仓库里的本机私有文件，需要时从授权渠道取得，避免写入日志、交接或提交。

## 1. 30 秒速览

- **项目是什么**：NodeScope —— 公开代理节点（VLESS / VMess / Shadowsocks / SSR / Trojan / Hysteria / Hysteria2 / TUIC / WireGuard）聚合、GitHub Actions 真实协议握手与出口国家测速（mihomo 核心）、Cloudflare TCP 连通性探测与多格式组合订阅服务（Base64 / 原始 URI / Clash YAML）。
- **线上地址**：
  - 主站（双域名同时在线）：<https://node.oinnn.top/> · <https://node.winv.cc/>
  - 客户端下载页：<https://node.oinnn.top/downloads/> · <https://node.winv.cc/downloads/>
  - Pages 默认域名：<https://nodescope-aggregator.pages.dev/>
  - Collector Worker 健康检查：<https://nodescope-collector.github-972.workers.dev/health>
- **代码在哪**：
  - 本机 Git 仓库根目录：当前项目 Git 根目录（外层工作区目录为 工作区中的 `projects/node/`，所有 `git` / `npm` / `wrangler` 命令均在 当前项目 Git 根目录 下执行）
  - GitHub 远程仓库：<https://github.com/gituxx/nodescope-aggregator>
  - 分支：`main`（源码分支，与线上 Pages 部署完全同步）· `results`（GitHub Actions 发布的实测快照单提交数据分支）
- **当前最大的问题（接手必看）**：
  1. **实测快照超过 6 小时后前端频繁亮黄条提示“当前展示缓存快照”（`stale: true`）**：GitHub Actions `verify.yml` 虽配置为 `23 */2 * * *`（每 2 小时），但受 GitHub 免费公共 Runner 调度延迟影响，实际每隔 **8～12 小时**才运行一次（单次耗时约 52 分钟）；而 `functions/api/[[path]].js:13` 的 `VERIFIED_STALE_AFTER_MS` 设为 **6 小时**，`lib/feed.js:379` 的 `VERIFIED_MAX_AGE_MS` 设为 **12 小时**。这导致每轮实测满 6 小时后前端即显示缓存告警，满 12 小时后 Worker 会判定实测快照过期。
  2. **订阅弹窗在 Clash 格式下预览的匹配节点数比实际导出的略多（约 1%～7%）**：`/api/nodes`（`functions/api/[[path]].js:101`）返回给前端时剔除了 `clash` 字段，导致前端 `src/main.jsx:206` 的 `node.clash !== null` 恒为真，无法在浏览器端预知哪些节点在 Phase 3 Clash 复测中被剔除（即 `clash: null`）。
  3. **两个高权限密钥曾在聊天记录明文暴露**：Cloudflare Global API Key 与 GitHub Classic PAT 亟待业主轮换（见 `CREDENTIALS.local.md`）。

---

## 2. 业主偏好与工作习惯（必须遵守）

### 通用要求
1. **用中文、简洁地汇报**：写结论和需要业主决定的事，不要堆过程细节。
2. **每次改动都要更新文档**：修改代码或配置后同步更新 `CHANGELOG.md` 及 `docs/AGENT-HANDOFF.md`、`docs/项目说明.md`，文档要和代码保持同步。
3. **授权直接做，不用问**：只有**花钱、使用业主个人账号做超范围操作、不可逆的删除**才需要先问；其余代码修改、测试、构建、部署直接一次做完。
4. **验证必须真实**：单测通过（`npm test`）或 `/health` 正常不等于功能可用，部署后必须用真实请求（`curl` 线上接口、检查响应头和返回体）走一遍真实流程。
5. **节省额度**：长任务（如构建部署、全量验证）放后台、用定时器等待，不要高频轮询或反复空转。
6. **开源方案与许可证合规**：优先使用成熟的开源方案；本项目为 MIT 许可证，借鉴他人代码时注意许可证，GPL（如 mihomo 仅作为外部 CLI 二进制在 CI 调用，不得将其源码拷入本仓库）或禁止商用的代码只借鉴思路、自己重写。
7. **变更前先备份、确认无任务冲突**：修改线上配置或 KV 数据前先备份；重部署 Worker 或触发新 workflow 前先确认没有正在执行的关键任务。
8. **清理临时资源**：开发中创建的临时资源（隧道、DNS 记录、`/tmp` 测试文件），用完立即清理或记入文档。

### 本项目特有偏好（从历史交互总结）
9. **改完必须部署上线并推送 GitHub**：业主说“优化下/改一下”默认包含**本地测试 → 构建 → 部署 Cloudflare Pages → 推送 GitHub `main` → 线上验证**全流程，不要只改本地代码等着问“要不要部署”。
10. **直接使用 `CREDENTIALS.local.md` 中的凭据非交互部署**：不要运行 `npx wrangler login` 让业主在浏览器点 OAuth 授权（曾多次超时卡住），直接用环境变量注入凭据完成部署和 Git 推送。
11. **订阅与筛选交互追求“一步到位、即时反馈、语义清晰”**：
    - 下拉框选择国家即刻加入已选列表，不要多余的“添加”按钮。
    - 筛选条件变化时实时显示匹配节点数；空结果或冲突条件（如“亚太 + 欧洲”）给出醒目提示与一键重置。
    - 订阅链接通过 `Profile-Title`（Base64）、`Content-Disposition`（UTF-8 文件名）和 URL `#备注` 三处同时提供包含具体范围/国家/协议的名称（如 `NodeScope · 实测可用 · 日本 · VLESS · Clash`），绝不能让客户端回退抓网页 `<title>`。
12. **双域名对等支持**：`node.oinnn.top` 与 `node.winv.cc` 均为主力生产域名，代码中生成订阅地址或文件头注释时必须动态跟随当前请求域名（`window.location.origin` / `url.origin`），不要硬编码单一域名。

---

## 3. 红线（绝对不能做的事）

1. **严禁泄露凭据**：不得将 `CREDENTIALS.local.md` 中的 API Key / PAT 写入源码、提交记录、GitHub Issue、日志或其他 markdown 文档；Git 推送时必须加 `-c credential.helper=` 防止写入系统钥匙串。
2. **严禁触碰共用 Cloudflare 账号下的其他项目资源**（详见 `docs/AGENT-HANDOFF.md` 第 8 节）：
   - **禁止改动其他 4 个 Pages 项目**：`ouonnkitv`、`kvideo`、`tvbox-api-backup`、`book-oinnn-top`。
   - **禁止改动其他 7 个 Workers**：`cccat-daily-checkin`、`edge-mini`、`edgetunnel`、`libretv`、`shiying-video`、`winv-nav`、`workbuddy-checkin`。
   - **禁止改动其他 2 个 KV 命名空间**：`edge` (`40e330af853d4e91ace657e45e3464d1`)、`edge-mini` (`e815658f4594431fb7dc88fcda918e22`)。
   - **禁止改动 `oinnn.top` 和 `winv.cc` 下除 `node.oinnn.top` / `node.winv.cc` 以外的任何 DNS 记录**（含其他项目的 CNAME/A/AAAA 及 Zoho 邮件 MX/TXT 记录）。
3. **严禁虚假标注节点状态**：`available` 仅代表通过代理协议实测（或上游测速报告），`reachable` 仅代表 Cloudflare 到入口 IP:Port 的 TCP 建连成功；不能用 TCP 探测去测 UDP 协议（Hysteria/Hysteria2/TUIC/WireGuard），也不能让 Cloudflare 侧 TCP 失败覆盖已通过代理实测（`verifiedAt`）的结果。
4. **严禁自动抓取未经审核的外部 URL**：用户通过 GitHub Issue 提交的节点源必须由维护者人工审核无私有 token 后写入 `lib/feed.js`，不得做自动抓取。
5. **在 `zsh` 中操作 `functions/api/[[path]].js` 时路径必须加双引号**：否则 `[[` 会被 zsh 当作通配符报错 `no matches found`。

---

## 4. 最常用命令（均在 当前项目 Git 根目录 下执行）

```bash
cd "$(git rev-parse --show-toplevel)"

# 1. 运行全部单元测试（20 项）
npm test

# 2. 构建前端与多语言路由/SEO/Sitemap 到 dist/
npm run build

# 3. 本地启动带 Pages Functions API 的完整预览（端口 8788）
npm run dev:pages

# 4. 部署前端与 Pages Functions 到 Cloudflare Pages 生产环境（凭据取自 CREDENTIALS.local.md）
CLOUDFLARE_EMAIL='<见CREDENTIALS.local.md>' \
CLOUDFLARE_API_KEY='<见CREDENTIALS.local.md>' \
CLOUDFLARE_ACCOUNT_ID='972d4ee01963ef3bc26c44564404bf24' \
npm run deploy:cloudflare

# 5. 部署定时采集与探测 Worker (nodescope-collector)
CLOUDFLARE_EMAIL='<见CREDENTIALS.local.md>' \
CLOUDFLARE_API_KEY='<见CREDENTIALS.local.md>' \
CLOUDFLARE_ACCOUNT_ID='972d4ee01963ef3bc26c44564404bf24' \
npm run deploy:collector

# 6. 线上真实流量验收（注意：API 只支持 GET，不支持 HEAD / curl -I）
curl -s https://node.winv.cc/api/stats | python3 -m json.tool | head -25
curl -s -D - -o /dev/null "https://node.winv.cc/api/subscription?format=clash&profile=verified&country=JP" | grep -iE "^HTTP|profile-title|content-disposition|x-nodescope-count"
curl -s https://nodescope-collector.github-972.workers.dev/health | python3 -m json.tool
```

---

## 5. 文档导航

- **AI 详细技术交接文档**：[`docs/AGENT-HANDOFF.md`](docs/AGENT-HANDOFF.md)（架构、状态表、代码地图、定时任务、共用资源边界、操作手册、从零重建、踩坑记录、待决事项）
- **非技术版项目说明**：[`docs/项目说明.md`](docs/项目说明.md)（功能说明、工作原理、外部服务、费用与到期日汇总表、风险说明）
- **本地机密凭据文件**：[`CREDENTIALS.local.md`](CREDENTIALS.local.md)（所有登录信息、API Key、Token、权限范围与轮换步骤，**已加入 `.gitignore`**）
- **变更日志**：[`CHANGELOG.md`](CHANGELOG.md)
