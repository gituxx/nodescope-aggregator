# NodeScope

**公开代理节点目录，标注来源、地区和连通性证据。** NodeScope 聚合公开订阅与配置，提供搜索、筛选和组合订阅。它是公共数据索引，不是 VPN 服务商；本站不运营或背书目录中的服务器。

**语言：** [English](README.md) · 简体中文 · [فارسی](README.fa.md) · [Русский](README.ru.md) · [မြန်မာ](README.my.md)

网站：[node.oinnn.top](https://node.oinnn.top/) · [软件下载](https://node.oinnn.top/downloads/) · [提交来源](https://github.com/gituxx/nodescope-aggregator/issues/new?title=%5BSource%5D%20)

## 功能

- 聚合 VLESS、VMess、Shadowsocks、Trojan 等公开配置，按协议、地区、国家、状态和延迟搜索筛选。
- 生成全部节点、精选 100、亚太、欧美、单一国家或组合筛选订阅；支持 Base64 和原始 URI。
- 单独复制节点 URI 导入客户端；普通节点 API 不返回原始配置和凭据。
- 汇总公开采集源状态，并说明地区、状态与延迟的证据来源及限制。
- 提供多语言软件下载目录，链接到开源客户端的官方发布页。

## 多路径采集与容错

采集器同时使用多个相互独立的路径，避免单个仓库或来源失效后整个目录中断：

- GitHub 聚合项目和公开仓库，包括 [MatinGhanbari/v2ray-configs](https://github.com/MatinGhanbari/v2ray-configs)、[0xRadikal/Free-v2ray-Configs](https://github.com/0xRadikal/Free-v2ray-Configs)、[Alirewa/V2ray-Configs](https://github.com/Alirewa/V2ray-Configs)、[freenodess/freenodess](https://github.com/freenodess/freenodess)、[morpheusadam/v2ray-config](https://github.com/morpheusadam/v2ray-config)、[yuesuizhengrong/proxy-node-collector](https://github.com/yuesuizhengrong/proxy-node-collector)、[Nexus-nodes](https://github.com/ninjastrikers/Nexus-nodes)、[Au1rxx/free-vpn-subscriptions](https://github.com/Au1rxx/free-vpn-subscriptions) 和 [Free-Nodes](https://github.com/735754647/Free-Nodes)。
- [OpenProxyList](https://openproxylist.com/) 公开目录、[mfbpn Telegram 频道镜像](https://github.com/mfbpn/tg_mfbpn_sub) 和 FreeNodeBiz 公开精选订阅接口。
- 国家订阅分片覆盖日本、韩国、美国、香港、新加坡、台湾、澳大利亚、印度、加拿大、英国、德国、法国和荷兰。
- 支持 Base64 / 原始 URI 订阅、Clash YAML 代理以及 RSS/Atom 条目提取，并按节点身份去重。

Cloudflare Worker 每 4 小时刷新来源，每 2 分钟最多探测 20 个唯一 TCP 入口。GitHub Raw 失败时会尝试 jsDelivr；采集配额在项目所有者之间分配。数据和探测结果存放于 Cloudflare KV。定时快照缺失时，Pages Function 可按需采集；刷新失败或节点数量骤降时保留上次成功快照、记录错误并限制重试。过期快照最多可提供 7 天，单项探测结果 12 小时后过期。

新增来源通过 GitHub Issue 人工审核，用户提交的 URL 不会自动抓取。

## 状态与地区说明

- `reachable`：Cloudflare 到节点入口主机和端口的 TCP 连接成功。它不测试代理握手、认证、路由或出口。
- `available`：上游项目发布了近期测速结果，不代表 NodeScope 完成代理协议实测。
- `upstream`：上游来源标记或筛选过该节点，不等于本站独立验证。
- `failed`：TCP 入口测试失败。已知 Cloudflare 受限目标及不能通过 TCP 探测的协议会标为不支持，而非失败。
- `unknown` / `unsupported`：当前没有结果，或此类节点不适用现有探测方式。
- 国家位置可能来自上游出口 IP 报告、国家订阅分片、节点名称或入口 IP 地理库。**入口 IP 所在国家不代表代理出口国家。** 页面会展示识别依据。
- 延迟是 Cloudflare 到入口的 TCP 连接时间，不是端到端代理延迟，也不保证节点服务质量。

## 订阅 API

```text
GET /api/subscription?format=base64&profile=all
GET /api/subscription?format=plain&profile=best100
GET /api/subscription?format=base64&profile=all&protocol=VLESS&region=apac&country=JP&country=KR
```

`format` 为 `base64` 或 `plain`。`profile` 支持 `all`、`best100`、`apac`、`west`，也支持当前快照中的国家代码。`region` 支持 `apac`、`europe`、`americas`、`west`。可以重复传入 `protocol` 和 `country`；协议、地区与国家条件取交集。为兼容旧链接，国家代码也可直接作为 `profile=JP`。

其他接口：

- `GET /api/nodes` 返回节点元信息、采集源健康状态及状态/国家统计，不返回原始节点 URI 和凭据。
- `GET /api/node?index=N&version=SNAPSHOT_TIME` 返回单个 URI 以便复制；快照版本用于避免旧列表复制到另一节点。
- `GET /api/stats` 返回汇总统计。

## 多语言、下载与 SEO

界面和软件下载目录使用固定语言 URL：`/`（简体中文）、`/en/`、`/fa/`、`/ru/`、`/my/`，每种语言也有对应的 `/downloads/` 页面。构建时生成本地化标题、描述、canonical、互相对应的 `hreflang`、结构化数据和多语言 sitemap。波斯语界面使用从右到左布局；网站不按 IP 强制跳转，访客可自行选择语言。

下载页收录 v2rayN、Clash Verge Rev、FlClash、Hiddify、v2rayNG、NekoBox、Karing，并链接到项目官方发布页。安装前请核对上游项目及对应设备的软件包。

## 本地开发

需要较新的 Node.js LTS 与 npm。

```sh
npm install
npm run dev
npm run build
```

`npm run build` 会在 `dist/` 生成 Cloudflare Pages 站点、多语言静态路由与 `sitemap.xml`。使用 `npm run dev:pages` 可通过 Wrangler 本地运行 Pages Functions；`npm test` 运行 Node 测试。

## Cloudflare 部署

网站通过 Cloudflare Pages Direct Upload 部署，定时采集由 Cloudflare Worker 执行。为 Pages 项目和采集 Worker 配置 `NODESCOPE_DATA` KV，并在 Pages 项目 Custom domains 中添加 `node.oinnn.top`。

```sh
npx wrangler login
npm run build
npm run deploy:cloudflare
npm run deploy:collector
```

仓库为公开项目。切勿提交 Cloudflare API Key、GitHub Personal Access Token、私有 feed URL 或节点订阅凭据。部署请使用 Wrangler 登录会话或权限受限的密钥。

## 贡献

可以通过 GitHub Issue 提交公开来源、失效报告或改进建议。请附公开 URL、来源类型、更新频率以及许可/授权信息。不要提交私有订阅、访问令牌或含个人数据的来源。所有来源在启用前都会审核。

## 安全与合规

公开节点可能由未知第三方运营、随时变更或监控流量。不要使用它们处理账号登录、支付、私密通信或其他敏感流量。优先选择可信服务，并遵循所在地法律及网络规则。NodeScope 不保证可用性、隐私、匿名性或安全性。

## 许可证

MIT，详见 [LICENSE](LICENSE)。
