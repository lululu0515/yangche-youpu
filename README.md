# 养车有谱

一款 iOS 26「液态玻璃」风格的养车记账 App。不是网页 Demo —— 它包含完整的原生工程，可以直接装到手机上。

- **Web 层**：手写 HTML / CSS / JavaScript，零框架、零依赖，单页离线可用
- **原生壳**：Capacitor 7（iOS + Android），系统分享、状态栏、安全区都已接好
- **PWA**：`www/` 部署到任意静态服务器即可「添加到主屏幕」，全屏无浏览器 UI 运行
- **云备份**：内置 WebDAV 客户端，账本可备份到坚果云、Nextcloud、群晖等自有存储

当前版本：**v1.11.3** · 开源协议：MIT

## 目录结构

```
yangche-youpu/
├── src/                  # Web 源码（改这里）
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── webdav.js         # WebDAV 协议客户端
│   ├── cars.js           # SVG 车模（轿车 / SUV / 跑车 / 皮卡 / 两厢）
│   └── sw.js             # Service Worker
├── scripts/
│   ├── build-web.cjs     # src → www，同步到 iOS / Android
│   └── harden-web.cjs    # 发布构建的压缩与混淆流水线
├── www/                  # 构建产物（git 忽略，由 npm run build 生成）
├── ios/                  # Xcode 工程（CocoaPods）
├── android/              # Android Studio / Gradle 工程
├── src/icons/            # 应用图标（1024 / 512 / 192 / 180 / maskable）
└── capacitor.config.json
```

## 运行

### 从源码构建（首次必做）

`www/` 是构建产物，不在仓库里。克隆后先构建一次：

```bash
npm install
npm run build        # 发布构建：压缩 + 混淆
# 或
npm run build:dev    # 调试构建：代码保持可读，方便断点
```

`npm run build` 会把 `src/` 同步到 `www/`，再同步进 iOS / Android 原生工程。

### Android

```bash
# 方式一：直接安装
# 从 Releases 下载 养车有谱-v1.11.3.apk，允许「安装未知来源应用」后安装

# 方式二：自己编译（需要 SDK 35 + JDK 21）
cd android
export ANDROID_HOME=/path/to/android-sdk
./gradlew assembleDebug
# 产物：android/app/build/outputs/apk/debug/app-debug.apk
```

也可以用 Android Studio 打开 `android/` 目录直接运行。

### iOS

需要 macOS + Xcode 16：

```bash
cd ios/App && pod install && cd ../..
npx cap sync ios
npx cap open ios
```

Xcode 里选真机或模拟器，Run 即可。Bundle ID 为 `com.yangche.youpu`，上架前替换成自己的开发者账号。

### PWA / 浏览器预览

```bash
npx serve www        # 或任意静态服务器
```

手机浏览器打开后「添加到主屏幕」，启动即是独立 App（`display: standalone`，带启动图与图标）。Service Worker 会缓存应用外壳，断网可用。

## 功能

| 模块 | 说明 |
|---|---|
| 首页 | 车辆场景卡、平均油耗、单公里成本、累计/本月四宫格、快速记账、燃油模块、最近记录 |
| 记账 | 底部抽屉 + 自建数字键盘，8 类支出，加油量 / 日期 / 里程 / 备注，保存即写入账本 |
| 账目 | 按月切换、类别筛选、按日分组、记录详情、编辑与删除 |
| 统计 | 环形占比、近 6 月柱状、单公里成本趋势（与近 6 月均值对比），可独立切月 |
| **年度报告** | 封面 + 月度节奏 + 类别排行 + 四个数字 + 年度瞬间 + 结尾，可调起系统分享 |
| 我的 | 车辆档案（含当前里程，可编辑）、三列数据、消息中心、导入导出、WebDAV 备份、演示数据管理、隐私与关于 |
| **WebDAV 云备份** | 连接测试、手动 / 自动备份、云端备份列表、一键恢复、保留最近 10 份 |
| **演示数据管理** | 「恢复示例数据」重建 42 条演示账目；「清空演示数据」只删 `seed-` 前缀的记录，自己记的不会被误删 |

所有数字都是**算出来的**：新增、修改或删除一笔记录，首页四宫格、账单汇总、环形图、柱状图、油耗、单公里成本、年度报告会一起重算，并持久化到 `localStorage`（键 `yangche.records.v2`）。车辆信息存 `yangche.vehicle.v1`，WebDAV 设置存 `yangche.settings.v1`。

## WebDAV 云备份

在「我的 → WebDAV 云备份」里填写：

| 字段 | 示例 | 说明 |
|---|---|---|
| 服务器 | `https://dav.jianguoyun.com/dav` | 坚果云、Nextcloud、群晖 WebDAV 均可 |
| 账号 | `you@example.com` | 建议使用「应用密码 / 授权码」 |
| 密码 | `••••••` | 只保存在本机，不会写进备份文件 |
| 目录 | `养车有谱` | 不存在会自动创建，支持多级目录 |

- **测试连接**：PROPFIND 校验目录，不存在则逐级 MKCOL 创建
- **立即备份**：上传 `yangche-YYYYMMDD-HHmmss.json`，自动清理只保留最近 10 份
- **云端备份列表**：按时间倒序列出，点任意一份可覆盖恢复（恢复前有确认）
- **自动备份**：开启后每次记账 / 导入 / 恢复，6 秒内自动上传一次
- 浏览器预览受同源策略限制，无法直连第三方 WebDAV（坚果云等不返回 CORS 头），仅适合配合本地测试服务调试

**Android 端为什么要单独写原生通道**

WebDAV 的目录探测用 `PROPFIND`、建目录用 `MKCOL`，这两个方法不在 HTTP/1.1 的标准方法里。Android 的 `HttpURLConnection.setRequestMethod()` 只接受
`GET / POST / HEAD / OPTIONS / PUT / DELETE / TRACE` 八种，传 `PROPFIND` 会直接抛 `ProtocolException: Invalid HTTP method: PROPFIND`。
Capacitor 的 `CapacitorHttp` 内部正是 `HttpURLConnection`，所以即便开了 `plugins.CapacitorHttp.enabled`，WebDAV 在 APK 里也一定失败——
表现是「连接测试」转一圈后提示无法连接，而不是 401/404 这类服务器错误。

`WebDavPlugin`（`android/app/src/main/java/com/yangche/youpu/WebDavPlugin.java`）用 OkHttp 发送原始方法，顺带绕开 WebView 同源限制。

`src/webdav.js` 怎么判断该走哪条通道：

1. 读 `window.Capacitor.Plugins['WebDavNative']['request']`——Capacitor 原生壳会按 `JSExport.getPluginJS()` 把每个插件的代理函数注入到这里，这是最直接的入口；
2. 代理不存在时退回 `window.Capacitor.nativePromise('WebDavNative', 'request', opts)`，两者底层是同一个 `toNative`；
3. 都没有才用浏览器 `fetch`。

**不要用 `Capacitor.registerPlugin()` 做探测条件**：那是 `@capacitor/core` 的 API，而本项目是手写 HTML、没有打包器，页面里只有 Capacitor 注入的 `native-bridge.js`，
它并不提供 `registerPlugin`（`typeof === undefined`）。拿它当判断依据会恒为假，静默退回 `fetch`，在 WebView 里被同源策略拦死——这正是 v1.11.1 失败的原因。

`YCWebDAV.channel()` 返回 `native` / `web`；连接成功后设置页会直接标注「· 原生通道」，装到手机上点一次「测试连接」即可确认走的哪条路。

备份文件结构：

```json
{
  "app": "yangche-youpu",
  "schema": 1,
  "version": "1.11.1",
  "createdAt": "2026-11-23T14:57:29.000Z",
  "vehicle": { "name": "小吉", "plate": "粤 B · 7F2K9", "...": "..." },
  "summary": { "count": 43, "total": 12324, "from": "2026-01-08", "to": "2026-11-23" },
  "records": [ { "id": "r-...", "cat": "fuel", "amount": 300, "date": "2026-11-23", "mileage": 8500, "liters": 40, "note": "" } ]
}
```

## 导入 / 导出

- **导出**：CSV，字段为 `日期 / 类别 / 金额 / 里程(km) / 加油量(L) / 备注`，带 BOM，Excel 直接打开。Android 端保存到 `下载/养车有谱/`，完成后弹窗显示完整路径，可直接调起系统分享
- **导入**：CSV 或备份 JSON。CSV 自动识别表头、兼容 UTF-8 与 GBK；按「日期 + 类别 + 金额 + 里程 + 备注 + 加油量」去重，只追加不覆盖

## 数字车库与液态玻璃

首页的「Lucas的车库」用 SVG 绘制的侧面车模展示座驾，车轮持续旋转，车尾带速度线。背景是一条平直的水平公路，车模视口底边就是地面线：轮胎底部略微压平并带接地暗影，车轮正好压在路面内，车身只做悬挂式轻微起伏，车轮不会离地。车模可在「车辆档案 → 编辑车辆信息」里切换：轿车 / SUV / 跑车 / 皮卡 / 两厢五种造型，配珍珠白、曜石黑、星际蓝、赤焰红、松石绿、暖沙金六种车漆。轻触车身可查看档案，拖动会产生视差。

底部导航沿用 `coolapk_liquid_glass_dock (5).html` 的胶囊造型。按 390 点设计宽度计算，静止选区是 74 × 58 点，按住后扩展为 94 × 80 点的玻璃透镜。底栏从中心轻微放大，镜片随拖速拉伸，松手吸附到最近的页面。点按切页时玻璃态保留 240 毫秒，点加号打开「记一笔」。v1.7 将底座与移动镜片的折射贴图和方向性高光随包提供。按压时，局部 WebGL 画布对图标、文字和加号执行六次分色采样。静止时由原生 HTML 按钮呈现图标与文字，持续慢帧时降低画布分辨率。

不支持 SVG 背景置换的 WebView 会显示渐变高光和背景模糊。应用也会响应系统的减少动态效果和减少透明度偏好。车库滚出视口或离开首页时会暂停循环动画。

在项目根目录运行 `npm run build`，可将 `src/` 同步到网页、iOS 和 Android 工程。预览请用本地静态服务器提供 `www/`，使用 localhost 或 HTTPS 验证离线缓存。若修改了原生插件，请安装依赖后执行 `npm run sync`。发布新的应用外壳时，递增 `src/sw.js` 的缓存版本。

## 自定义

- 主色：`src/styles.css` 顶部的 `--brand` / `--brand-ink`
- 车辆信息：App 内「我的 → 车辆管理 → 编辑车辆信息」；默认值在 `src/app.js` 的 `DEFAULT_VEHICLE`
- 保养间隔：默认 7200 km，可在车辆信息里改
- 示例数据：`src/app.js` 的 `seedData()`
- 图标：替换 `src/icons/` 下的 PNG（1024 / 512 / 192 / 180 / maskable），同步时会复制到 `www/icons/`

改完源码后：

```bash
./build.sh          # 拷贝到 www 并 cap sync
```

## 安全加固

发布构建（`npm run build`）会走一遍硬化流水线；本地调试用 `npm run build:dev`，保留可读源码。

**Web 层**

- Terser：压缩、局部变量重命名、删除 `console` / `debugger`
- javascript-obfuscator：十六进制标识符、字符串进池并乱序轮转（短标签仍会留在代码里），字符串池再封成一段 Base64 密文，运行时只解析一次
- `app.js` 额外包一层 IIFE，150 多个顶层函数名一起混淆
- HTML 去注释、CSS 压缩
- 刻意关闭 `controlFlowFlattening` / `deadCodeInjection` / `selfDefending` 与逐次 Base64 解码——实测这些会让冷启动多 100ms 以上、交互慢数倍

**原生层**

- R8：`minifyEnabled` + `shrinkResources`，类名/成员名混淆并收进单字母包，日志调用直接删除
- 启动时校验签名证书 SHA-256：二次打包必然换证书，校验失败直接退出
- 关闭 WebView 远程调试，`chrome://inspect` 无法附加
- `allowBackup=false`，`adb backup` 取不到本地账本

**性能**

4 倍 CPU 降速模拟低端机：冷启动 +16ms（约 5%），连续切换四个标签页的耗时与未混淆版本持平；APK 从 6.5MB 降到 4.8MB。

**注意**：签名校验会把“证书不一致”的安装包判定为篡改。如果通过会二次签名的应用商店分发，需要把商店证书摘要加进 `SecurityGuard.SEAL`；更换自己的 keystore 时也必须同步更新，否则装上去会直接退出。

**边界**：客户端做不到“绝对不可逆向”。这些措施挡的是改包、抄代码、抓接口这类低成本逆向；有足够动机的人仍可通过动态调试还原逻辑。账本只存在本机与用户自己的 WebDAV，服务端没有可窃取的密钥。

## 说明

- 数据默认只存在本机，没有账号、没有后端；只有主动使用 WebDAV 时才联网
- 示例数据覆盖本年度 12 个月共 42 笔，用于演示统计与年度报告，可在「我的 → 清空演示数据」一键清除
- 仓库不含签名文件。自行构建的 debug 包可直接运行（`isDebuggable` 时跳过签名校验）；要出正式包请用自己的 keystore，并把证书 SHA-256 写进 `SecurityGuard.SEAL`
- 平均油耗用连续加满法：最近两次同时有加油量与里程的记录，当次加油量 ÷ 里程差 × 100

## 开源

- 协议：[MIT](LICENSE)，可自由使用、修改、商用，保留版权声明即可
- 第三方组件与素材授权见 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)
- 欢迎提 Issue 与 PR。改动前建议先跑一次 `npm run build:dev`，确认界面与交互正常

**关于防逆向措施**：仓库里的 `scripts/harden-web.cjs` 与 `SecurityGuard.java` 是发布构建用的加固手段，默认对源码开发者透明。如果你 fork 后要发布自己的版本，记得替换 `SecurityGuard.SEAL` 里的证书摘要，否则装到手机上会因签名不匹配而退出。
