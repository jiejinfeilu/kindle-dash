# Kindle PW6 免越狱信息仪表盘（AiDash v3）

为 Kindle Paperwhite 6（PW6，1072×1448 灰阶屏）设计的单文件网页仪表盘。所有内容在 `index.html` 顶部的 `CONFIG` 配置区修改，无需懂代码。

## 功能与模块

| 模块 | 内容 | 数据来源 |
|---|---|---|
| 时钟 | 可爱风格时钟（每秒更新）+ 问候语 | 本机时间 |
| 天气预报 | 实时天气 + 未来三天预报 | OpenWeather（需免费 Key） |
| 国内内容 | B站热搜 / 知乎热榜 / 微博热搜 / B站UP主动态 | 对应平台接口 + CORS 代理 |
| 股市大盘 | 上证、深成、创业板、恒生等指数 | 腾讯行情接口（免费无 Key） |
| DeepSeek 余额 | 余额 + 单价 + 按输出价估算可用 tokens | DeepSeek 官方接口（或手动填写） |
| 重要倒计时 | 自定义日期倒数 | 你填的日期 |
| 待办事项 | 可勾选任务 + 进度条，状态自动保存 | 浏览器缓存 |
| 每日一图 | 必应每日壁纸或自定义图片直链 | Bing / 自定义 URL |
| 每日一言 | 每日一句名言 | 内置列表 |

## 一、必须配置的内容

### 1. 天气（默认 Open-Meteo，完全免费、无需注册和 Key）

方案 A：Open-Meteo（默认，推荐）

- 什么都不用填。`weatherApi` 保持 `"openmeteo"`，`weatherLat` / `weatherLon` 填你所在城市的经纬度（已默认温州 27.99,120.70；上海 31.23,121.47；北京 39.90,116.41）。

方案 B：OpenWeather（免费 Key）

1. 到 https://openweathermap.org 免费注册，My API keys 复制 Key，填进 `openWeatherKey`，`city` 填英文拼音。
2. `weatherApi` 改成 `"openweather"`，`openweatherUseProxy` 保持 `true`（走 CORS 代理，国内网络才能访问）。
3. 新 Key 最长需等约 2 小时激活；代理偶尔不稳定，失败时页面会显示提示。

方案 C：和风天气（可选，免费个人版需实名认证）

- 填 `qweatherKey` 和 `qweatherLocation`（温州 101210701），`weatherApi` 改成 `"qweather"`。

### 2. 股市大盘（默认已配好，无需 Key）

默认显示上证、深成、创业板、恒生。想加纳斯达克/道琼斯，在 `stocks` 里加：

```js
{ name: "纳斯达克", code: "usIXIC" }
```

### 3. DeepSeek 余额

在 `deepseek` 里填：

- `apiKey`：你的 DeepSeek API Key。
- `priceInPerM` / `priceOutPerM`：当前单价（元/百万 tokens）。2026-08 官方预告新价：V4-Flash 输入 1 / 输出 2；V4-Pro 输入 3 / 输出 6（缓存命中更便宜）。**价格会变，以 DeepSeek 官网为准。**
- `manualBalance`：如果浏览器直连 DeepSeek 被 CORS 拦截（大概率会发生），把余额数字手动填这里兜底。

两个重要限制：

- DeepSeek 官方**没有“查某个 Key 已用多少 token”的接口**，只能查余额。页面显示的是余额和“按输出单价估算还能用多少 tokens”，不是真实用量统计。
- **公开网页里填 API Key 有泄露风险**。GitHub Pages 是公开仓库，任何人都能看到你的 Key。建议：使用后去 DeepSeek 后台删除/重置该 Key；或者把 `manualBalance` 手动填数字代替填 Key。
- **`manualBalance` 是手动填的静态数字，不会自动更新**。想自动更新只能填 `apiKey`（余额每次刷新自动查）；填 `manualBalance` 的话，余额变了需要手动改文件里的数字再上传。

### 4. 国内内容源

默认已配置 B站热搜、知乎热榜、微博热搜。

- 想看 B站UP主动态：在 `bilibiliUids` 里按行添加，每行一个：`{ name: "显示名", uid: "UP主UID" }`。UID 获取：B站网页打开UP主主页，地址栏 `space.bilibili.com/` 后面的数字。想加几个就加几行。
- 小红书：**没有公开接口**，博主内容无法直接抓取（需要自建 RSSHub 并配置小红书 Cookie，对新手不现实）。以后若自建成功，把生成的 RSS 地址填进 `xiaohongshuRssUrl`；否则建议关注博主是否同步发布到 B站/微博/公众号。
- 想加任意 RSS：在 `feeds` 里加 `{ name: "标题", type: "rss", url: "https://example.com/feed", count: 3 }`。

### 5. 倒计时与待办

- `countdowns`：`{ name: "名称", date: "YYYY-MM-DD" }`。
- `todos`：`{ text: "内容", done: false }`；页面勾选后状态会记住。

## 二、部署（重新上传）

从 v12 开始，内容源改为 **GitHub Actions 定时抓取**（在 GitHub 服务器上抓热榜，写入 data/feeds.json），页面只读同源 JSON，**不再依赖浏览器跨域和代理**，Kindle 也能稳定显示。

需要上传的文件（共 3 个，保持目录结构）：

- `index.html`（覆盖旧的）
- `.github/workflows/feeds.yml`（新建）
- `scripts/fetch-feeds.js`（新建）

上传方法（网页方式）：

1. 仓库页面 → Add file → Upload files → 把 `index.html` 拖进去上传覆盖。
2. 再点 Add file → **Create new file**，文件名输入 `.github/workflows/feeds.yml`，把本机该文件的内容粘贴进去 → Commit。同样方式新建 `scripts/fetch-feeds.js`。
3. 等 1~3 分钟 Pages 更新后，进仓库 **Actions** 标签 → 左侧 “Fetch hotlists” → 点 **Run workflow** → 绿色 Run，手动触发第一次抓取。
4. 抓取完成后（Actions 变绿勾），页面会自动显示热榜、UP主动态和**每日壁纸**（壁纸也由 Actions 每天下载到 data/wallpaper.jpg，页面读同源图片，不再依赖外站图源）；之后每 30 分钟自动更新一次。

电脑打开 `https://你的用户名.github.io/kindle-dash/` 验证；Kindle 浏览器若显示旧页面：清缓存后重新打开。

## 三、Kindle 访问与常亮

1. 设置 → Wi-Fi 与蓝牙 → 连接 Wi-Fi。
2. 主页右上角 `⋮` → 体验版网页浏览器 → 输入 `https://你的用户名.github.io/kindle-dash/`。
3. 若被重排成“文章模式”，点“网页模式”按钮切回，确认“启用 JavaScript”已开。
4. 主页搜索框输入 `~ds` 回车禁用休眠（重启后失效需重输）。

## 四、在网页上直接编辑倒计时与待办

1. 打开仪表盘页面，点底部“**编辑**”按钮。
2. 在弹出的编辑区里：改名字和日期、点“删除”删掉一行、点“+ 添加倒计时 / + 添加待办”新增一行。
3. 点“**保存**”生效；点“**恢复默认**”清空本机修改、回到文件里配置的内容。
4. 说明：
   - 编辑结果保存在这台设备的浏览器缓存里，**以后不用再改文件、重新上传**。
   - 只在保存的那台设备生效（Kindle 上改的只影响 Kindle）。
   - 清除浏览器缓存会丢失去编辑结果，恢复成文件里的默认配置。
   - 天气、内容源、股票、DeepSeek 等模块仍需要在文件里改（涉及 API Key，不适合放网页上编辑）。

### 为什么网页编辑不能自动更新 GitHub 仓库里的文件？

GitHub Pages 是静态托管，网页里的 JavaScript 没有权限写你的仓库。想让网页自动改仓库文件，只能把 GitHub 的写权限令牌放进公开页面——那样任何人都能改你的仓库，风险极大，不建议。所以网页编辑结果默认保存在本机浏览器里。

### 可选：多设备同步（推荐 GitHub Gist，国内可访问）

用你已有的 GitHub 账号，一次配置永久同步：

1. 打开 https://gist.github.com 新建 Gist，**文件名填 `kindle-dash.json`**，内容随便填 `{"countdowns":[],"todos":[]}`，点创建。
2. 复制网址里的 Gist ID（`gist.github.com/你的用户名/` 后面那串字母数字）。
3. 打开 GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token → **只勾选 `gist` 权限** → Generate → 复制 token（以 `ghp_` 开头）。
4. 把 Gist ID 和 token 填进 `index.html` 的 `github.gistId` 和 `github.token`，重新上传。
5. 之后在任意设备点“编辑”→“保存”，底部显示“已同步云端(GitHub)”；其他设备打开自动读取。

说明：这个 token 只有 gist 权限，只能读写你的 Gist（就是这份倒计时/待办数据），动不了账号，风险可控。jsonblob 保留为备选（国内可能连不上）；两者都不配置则编辑只存在本机浏览器。

## 五、常见问题

- **新闻/内容源加载失败**：页面会按顺序尝试多个 CORS 代理；若全部失败，把当前网络能用的代理地址加进 `proxies` 列表（格式如 `"https://corsproxy.io/?url="`）。知乎/微博走热榜聚合接口，B站UP主动态走多个 RSSHub 实例自动切换。
- **行情显示模拟数据**：东方财富直连失败时会自动切腾讯接口（走代理），两者都不通才显示模拟数据。
- **DeepSeek 显示“CORS 拦截”**：正常现象，把余额手动填进 `manualBalance`。
- **壁纸不显示**：必应被墙时把 `wallpaperUrl` 填成任意图片直链。
- **页面超出一屏**：把某个模块的 `on` 改成 `false`。
- **天气报错**：国内优先用和风天气（填 `qweatherKey` + 城市 ID）；新 Key 需要等待激活；若坚持 OpenWeather，确认 Key 完整、`city` 用英文拼音、网络能访问 openweathermap.org。
- **本地直接双击 index.html 打开时接口全部失败**：浏览器安全策略会拦截跨域请求，属正常。本地测试请在文件所在文件夹的终端运行 `python -m http.server 8000`（启动一个本地测试服务器），然后访问 `http://localhost:8000`；正式使用以 GitHub Pages 的 https 网址为准。
- **上传后打开还是旧版本**：先看页面底部“版本”是否显示 `v13-20260810`。若不是：① 电脑上按 Ctrl+F5 强制刷新，或网址后面加 `?v=1` 打开；② 等 2~3 分钟让 Pages 更新；③ 确认仓库里 index.html 在根目录、提交时间是刚刚；④ Kindle 上清浏览器缓存后再开。新版每 30 分钟自动刷新时会自动带新参数绕过缓存。
- **云端同步显示 HTTP 401**：401 说明网络通、但 token 无效。请重新生成：GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)** → Generate new token (classic) → **只勾选 `gist`** → 生成后完整复制（`ghp_` 开头、不要带空格），填回 `github.token` 重新上传。不要用“fine-grained”令牌。
- **内容源显示“暂无内容”**：先确认仓库 Actions 里的 “Fetch hotlists” 是否运行成功（绿勾）。首次需手动 Run workflow；之后每 30 分钟自动跑。

## 六、验证清单

- 电脑打开网址：天气为真实数据、三天预报有内容、大盘指数有真实点位、内容源有标题、DeepSeek 显示余额或手动值。
- Kindle 打开：一屏显示、30 分钟后自动刷新（看“上次更新”变化）。
- 输入 `~ds` 后按电源键不进入屏保。
