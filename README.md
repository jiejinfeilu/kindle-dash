# Kindle PW6 免越狱信息仪表盘（AiDash）

为 Kindle Paperwhite 6（PW6，1072×1448 灰阶屏）设计的单文件网页仪表盘：

- 实时时钟（每秒更新）
- 当天日期与星期
- 模拟天气、新闻、比特币/以太坊价格、每日名言
- 每 30 分钟自动刷新（JS `location.reload()`）
- 无外部资源，单文件约 15KB，一天流量约 0.7MB

## 文件

- `index.html` —— 完整仪表盘页面（部署到 GitHub Pages 时放在仓库根目录）

## 一、托管到 GitHub Pages

1. 打开 github.com，注册/登录后点右上角 `+` → New repository。
2. 仓库名填 `kindle-dashboard`，选 Public，点 Create repository。
3. 进入仓库 → Add file → Upload files → 上传 `index.html` → Commit changes。
   - 命令行方式：`git clone https://github.com/你的用户名/kindle-dashboard.git`，放入 `index.html` 后执行
     `git add .`、`git commit -m "add dashboard"`、`git push`。
4. 启用 Pages：仓库 → Settings → Pages → Source 选 “Deploy from a branch” → Branch 选 `main`、目录选 `/ (root)` → Save。
5. 等 1~2 分钟，电脑浏览器访问 `https://你的用户名.github.io/kindle-dashboard/` 验证。
   - 例如用户名为 `abc`，网址为 `https://abc.github.io/kindle-dashboard/`（大小写敏感）。

## 二、Kindle 访问

1. 设置 → Wi-Fi 与蓝牙 → 连接 Wi-Fi。
2. 主页右上角 `⋮` 菜单 → 体验版网页浏览器。
3. 点底部地址栏，输入完整网址（含 `https://`），回车加载。
4. 若页面被重排成“文章模式”（正文简化、JS 失效），点浏览器工具栏的“网页模式”按钮切回；再进浏览器菜单 → 设置，确认“启用 JavaScript”已开启。

## 三、保持屏幕常亮（关键）

1. 回 Kindle 主页，点顶部搜索框，输入 `~ds`，回车。
   - 无任何提示是正常的；此时按电源键无法休眠，即已生效。
   - 效果持续到下次重启，重启后需重新输入。
2. 附加设置：设置 → 设备选项 → 高级选项 → 省电模式 → 关闭。
   - 注意：关闭省电模式只是让唤醒更快，**不能**阻止休眠；真正防休眠的是 `~ds`。
3. 若 `~ds` 在你的固件上无效（个别新固件被移除该命令），官方设置里没有“永不锁屏”选项，只能每隔约 10 分钟点一下屏幕，或等待越狱方案。
4. 建议插着充电器使用；e-ink 静态画面几乎不耗电，耗电集中在每 30 分钟刷新瞬间。

## 四、验证清单

- 电脑打开网址：时钟每秒走动、日期正确、倒计时递减、四个板块齐全、无横向滚动。
- Kindle 打开：整页一屏显示（内容高度约 1116px < 1448px），30 分钟后自动刷新（观察“上次更新”时间变化）。
- `~ds` 验证：输入后按电源键不进入屏保；重启后屏保恢复。

## 注意事项

- 天气、新闻、价格为模拟数据；未来接真实 API 时需使用支持 HTTPS 且允许 CORS 的接口（代码末尾有 `XMLHttpRequest` 示例）。
- 网页无法调用系统 API 阻止休眠，屏幕常亮依赖 `~ds` 命令的可用性。
- 想更省电，可把 `index.html` 中 `CLOCK_MS` 从 `1000` 改为 `10000`（时钟每 10 秒更新）。
