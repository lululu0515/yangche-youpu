# 图标源文件

- `icon.svg`：新图标的矢量源文件（1024×1024），可直接改色或调形后重新导出
- `icon.png`：1024×1024 渲染稿，用于生成各平台图标

应用内使用的尺寸在 `../src/icons/`：`icon-1024 / 512 / 192 / 180` 与 `maskable-512`。
Android 的 mipmap 与启动图已按各密度生成好，替换图标后重新执行 `npm run build && npx cap sync` 即可。

`icon.svg` 为矢量源，`icon.png` 为 1024 渲染稿，`splash.png` 为 2732×2732 启动图源。
