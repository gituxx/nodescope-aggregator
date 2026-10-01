# NodeScope

**Source၊ တည်နေရာနှင့် connection စစ်ဆေးမှုအထောက်အထားကို ဖော်ပြထားသော public proxy node directory ဖြစ်သည်။** NodeScope သည် public feed နှင့် configuration များကို စုစည်းပြီး protocol၊ ဒေသနှင့် နိုင်ငံအလိုက် ရှာဖွေခြင်း၊ subscription ဖန်တီးခြင်းတို့ကို ပံ့ပိုးသည်။ ၎င်းသည် VPN ဝန်ဆောင်မှုပေးသူမဟုတ်ဘဲ public data index သာဖြစ်သည်။ စာရင်းပါ server များကို NodeScope က မလည်ပတ်သလို အတည်ပြုအာမခံမပေးပါ။

**ဘာသာစကားများ:** [English](README.md) · [简体中文](README.zh-CN.md) · [فارسی](README.fa.md) · [Русский](README.ru.md) · မြန်မာ

ဝဘ်ဆိုက်: [node.oinnn.top](https://node.oinnn.top/my/) · [Software downloads](https://node.oinnn.top/my/downloads/) · [Source အကြံပြုရန်](https://github.com/gituxx/nodescope-aggregator/issues/new?title=%5BSource%5D%20)

## လုပ်ဆောင်ချက်များ

- VLESS၊ VMess၊ Shadowsocks၊ Trojan နှင့် အခြား supported protocol များ၏ public configuration ကို စုစည်းသည်။
- Protocol၊ ဒေသ၊ နိုင်ငံ၊ ရရှိထားသော status နှင့် entry connection latency အလိုက် ရှာဖွေစစ်ထုတ်နိုင်သည်။
- Node အားလုံး၊ ထိပ်ဆုံး ၁၀၀၊ ဒေသ၊ နိုင်ငံ သို့မဟုတ် filter ပေါင်းစပ်မှုအတွက် Base64 သို့မဟုတ် raw URI subscription ဖန်တီးနိုင်သည်။
- Node တစ်ခုချင်းစီ၏ URI ကို သီးခြားကူးယူနိုင်သည်။ အများသုံး node-list API တွင် raw configuration နှင့် credential များမပါဝင်ပါ။
- Source health ကိုပြပြီး တည်နေရာ၊ status နှင့် latency ဒေတာ၏ အရင်းအမြစ်နှင့် ကန့်သတ်ချက်ကို ရှင်းပြသည်။
- Desktop နှင့် mobile open-source client များ၏ ဘာသာစကားစုံ download directory ပါဝင်သည်။ Official release သို့ link ပေးထားသည်။

## Source များစွာမှ စုဆောင်းခြင်းနှင့် ယုံကြည်စိတ်ချရမှု

Source တစ်ခု သို့မဟုတ် repository တစ်ခု ပျက်သွားလျှင် directory တစ်ခုလုံး မရပ်တန့်စေရန် အမှီအခိုကင်းသော collection path များကို အသုံးပြုထားသည်။

- GitHub aggregator နှင့် public repository များ: [MatinGhanbari/v2ray-configs](https://github.com/MatinGhanbari/v2ray-configs), [0xRadikal/Free-v2ray-Configs](https://github.com/0xRadikal/Free-v2ray-Configs), [Alirewa/V2ray-Configs](https://github.com/Alirewa/V2ray-Configs), [freenodess/freenodess](https://github.com/freenodess/freenodess), [morpheusadam/v2ray-config](https://github.com/morpheusadam/v2ray-config), [yuesuizhengrong/proxy-node-collector](https://github.com/yuesuizhengrong/proxy-node-collector), [Nexus-nodes](https://github.com/ninjastrikers/Nexus-nodes), [Au1rxx/free-vpn-subscriptions](https://github.com/Au1rxx/free-vpn-subscriptions) နှင့် [Free-Nodes](https://github.com/735754647/Free-Nodes)။
- [OpenProxyList](https://openproxylist.com/) public directory၊ [mfbpn/tg_mfbpn_sub](https://github.com/mfbpn/tg_mfbpn_sub) Telegram mirror နှင့် FreeNodeBiz public featured-subscription endpoint။
- Japan၊ South Korea၊ United States၊ Hong Kong၊ Singapore၊ Taiwan၊ Australia၊ India၊ Canada၊ United Kingdom၊ Germany၊ France နှင့် Netherlands အတွက် country feed များ။
- Base64 နှင့် raw URI subscription၊ Clash YAML proxy နှင့် RSS/Atom item text ကို parse လုပ်ပြီး node identity အလိုက် ထပ်နေသော entry များကို ဖယ်ရှားသည်။

Cloudflare Worker သည် feed များကို ၄ နာရီတိုင်း update လုပ်ပြီး ၂ မိနစ်တိုင်း မတူညီသော TCP entry ၂၀ အထိ စစ်ဆေးသည်။ GitHub Raw မရပါက jsDelivr မှ ထပ်ကြိုးစားသည်။ Collection quota ကို project owner အများအပြားအကြား ခွဲဝေထားသည်။ Data နှင့် probe result များကို Cloudflare KV တွင် သိမ်းဆည်းသည်။ Scheduled snapshot မရှိပါက Pages Function က on-demand collection လုပ်နိုင်သည်။ Update မအောင်မြင်ခြင်း သို့မဟုတ် node အရေအတွက် ရုတ်တရက်ကျသွားခြင်းတွင် နောက်ဆုံးအောင်မြင်သော snapshot ကို ထိန်းထားပြီး source error မှတ်တမ်းတင်ကာ retry ကို ကန့်သတ်သည်။ Stale snapshot ကို ၇ ရက်အထိ ပြနိုင်ပြီး probe result တစ်ခုချင်းစီသည် ၁၂ နာရီအကြာတွင် သက်တမ်းကုန်သည်။

Source အသစ်များကို GitHub Issue မှ တင်ပြနိုင်ပြီး ထည့်သွင်းမီ လူကိုယ်တိုင် စစ်ဆေးသည်။ User ပေးသော URL များကို အလိုအလျောက် fetch မလုပ်ပါ။

## Status နှင့် တည်နေရာ၏ အဓိပ္ပာယ်

- `reachable`: Cloudflare မှ node ၏ entry host နှင့် port သို့ TCP connection အောင်မြင်သည်။ Proxy handshake၊ authentication၊ routing သို့မဟုတ် exit ကို စမ်းသပ်ခြင်းမဟုတ်ပါ။
- `available`: Upstream project က မကြာသေးမီ benchmark result ထုတ်ပြန်ထားသည်။ NodeScope ၏ ကိုယ်တိုင် protocol test မဟုတ်ပါ။
- `upstream`: Upstream source က node ကို ရွေးချယ်ထားခြင်း သို့မဟုတ် အမှတ်အသားပြုထားခြင်းဖြစ်ပြီး NodeScope ၏ လွတ်လပ်သော validation မဟုတ်ပါ။
- `failed`: TCP entry စမ်းသပ်မှု မအောင်မြင်ပါ။ Cloudflare က ကန့်သတ်ထားသော destination နှင့် TCP ဖြင့် စစ်မရသော protocol များကို `unsupported` အဖြစ် ဖော်ပြသည်။
- `unknown` / `unsupported`: လတ်တလော result မရှိခြင်း သို့မဟုတ် probe နည်းလမ်း မသက်ဆိုင်ခြင်းဖြစ်သည်။
- နိုင်ငံကို upstream exit-IP report၊ country feed၊ node name သို့မဟုတ် entry-IP geolocation မှ ရယူနိုင်သည်။ **Entry IP ရှိသော နိုင်ငံသည် proxy exit နိုင်ငံကို မဆိုလိုပါ။** UI တွင် source ကို ဖော်ပြထားသည်။
- Latency သည် Cloudflare မှ entry သို့ TCP ချိတ်ဆက်ချိန်သာဖြစ်ပြီး end-to-end proxy latency သို့မဟုတ် service quality အာမခံမဟုတ်ပါ။

## Subscription API

```text
GET /api/subscription?format=base64&profile=all
GET /api/subscription?format=plain&profile=best100
GET /api/subscription?format=base64&profile=all&protocol=VLESS&region=apac&country=JP&country=KR
```

`format` သည် `base64` သို့မဟုတ် `plain` ဖြစ်သည်။ `profile` သည် `all`၊ `best100`၊ `apac`၊ `west` သို့မဟုတ် လက်ရှိ snapshot တွင်ရှိသော country code ကို လက်ခံသည်။ `region` သည် `apac`၊ `europe`၊ `americas` သို့မဟုတ် `west` ဖြစ်နိုင်သည်။ `protocol` နှင့် `country` ကို အကြိမ်ကြိမ်ပေးနိုင်ပြီး ရွေးထားသော filter များကို intersection ဖြင့် ပေါင်းစပ်သည်။ အဟောင်း link များအတွက် country code ကို `profile=JP` အဖြစ်လည်း ပေးနိုင်သည်။

အခြား endpoint များ: `GET /api/nodes` သည် raw URI မပါသော node metadata နှင့် source health ကို ပြန်ပေးသည်။ `GET /api/node?index=N&version=SNAPSHOT_TIME` သည် ကူးယူရန် node URI တစ်ခုကို ပြန်ပေးသည်။ `GET /api/stats` သည် အကျဉ်းချုပ်စာရင်းကို ပြန်ပေးသည်။

## ဘာသာစကား၊ Download နှင့် SEO

တည်ငြိမ်သော URL များမှာ `/` (တရုတ်ဘာသာ)၊ `/en/`၊ `/fa/`၊ `/ru/` နှင့် `/my/` ဖြစ်ပြီး ဘာသာစကားတိုင်းတွင် သက်ဆိုင်ရာ `/downloads/` စာမျက်နှာ ရှိသည်။ Build လုပ်စဉ် localized title၊ description၊ canonical URL၊ reciprocal `hreflang`၊ structured data နှင့် ဘာသာစကားစုံ sitemap ထုတ်ပေးသည်။ Persian UI သည် right-to-left layout ကို အသုံးပြုသည်။ IP အလိုက် အတင်းအကျပ် redirect မလုပ်ပါ။ အသုံးပြုသူက ဘာသာစကားကို ကိုယ်တိုင်ရွေးနိုင်သည်။

Download စာမျက်နှာသည် v2rayN၊ Clash Verge Rev၊ FlClash၊ Hiddify၊ v2rayNG၊ NekoBox နှင့် Karing တို့၏ official release သို့ link ပေးထားသည်။ Install မလုပ်မီ upstream release နှင့် သင့်စက်ပစ္စည်းအတွက် package ကို စစ်ဆေးပါ။

## Local development နှင့် Cloudflare deployment

လက်ရှိ Node.js LTS နှင့် npm လိုအပ်သည်။

```sh
npm install
npm run dev
npm run build
```

`npm run build` သည် Cloudflare Pages အတွက် `dist/` ထဲတွင် multilingual static route များနှင့် `sitemap.xml` ကို ထုတ်ပေးသည်။ Pages Functions ကို local စမ်းရန် `npm run dev:pages` ကို သုံးပါ။ `npm test` သည် Node test များကို လုပ်ဆောင်သည်။

Website ကို Cloudflare Pages Direct Upload မှ host လုပ်ပြီး scheduled collector ကို Cloudflare Worker ဖြင့် လုပ်ဆောင်သည်။ Pages နှင့် Worker နှစ်ခုလုံးအတွက် `NODESCOPE_DATA` KV namespace သတ်မှတ်ပြီး Pages project ၏ Custom domains တွင် `node.oinnn.top` ထည့်ပါ။

```sh
npx wrangler login
npm run build
npm run deploy:cloudflare
npm run deploy:collector
```

Repository သည် public ဖြစ်သည်။ Cloudflare API key၊ GitHub personal access token၊ private feed URL သို့မဟုတ် subscription credential များကို commit မလုပ်ပါနှင့်။ Wrangler authenticated session သို့မဟုတ် အခွင့်အရေးကန့်သတ်ထားသော secret ကို အသုံးပြုပါ။

## လုံခြုံရေးနှင့် လိုင်စင်

Public node များကို မသိသော third party များက လည်ပတ်နိုင်ပြီး အချိန်မရွေးပြောင်းလဲနိုင်သလို traffic ကို စောင့်ကြည့်နိုင်သည်။ Account၊ ငွေပေးချေမှု၊ ကိုယ်ရေးကိုယ်တာဆက်သွယ်ရေး သို့မဟုတ် အရေးကြီးသော traffic အတွက် မသုံးပါနှင့်။ သင့်ဒေသ၏ ဥပဒေနှင့် network စည်းမျဉ်းများကို လိုက်နာပါ။ NodeScope သည် ရရှိနိုင်မှု၊ privacy၊ anonymity သို့မဟုတ် security ကို အာမမခံပါ။ License သည် MIT ဖြစ်သည်၊ [LICENSE](LICENSE) ကို ကြည့်ပါ။
