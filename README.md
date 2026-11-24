# MoviePilot 插件仓库 · 字幕机翻

MoviePilot V3 插件仓库，目前包含一个插件：

### 字幕机翻（SubtitleTranslator）

在 MoviePilot 里搜索媒体库影视，把内嵌字幕机翻成中文写回视频同目录，并刷新媒体服务器。

- 搜索/点选翻译，不需要配置媒体目录，也不全盘扫描
- 可选字幕轨（自动优先英文），PGS 图形字幕会标灰
- 多服务商（DeepSeek / 硅基流动 / 百炼 / Kimi / 智谱 / OpenRouter / Gemini / 自定义），每个服务商单独记 Key
- 默认双语（译文在上、原文在下），可切仅译文
- 队列后台跑，带阶段指示（提取 → 翻译 → 写入 → 刷新），完成推送 MP 通知

详细说明见 [plugins.v3/subtitletranslator/README.md](plugins.v3/subtitletranslator/README.md)。

## 目录结构

```
package.v3.json                     # 插件市场索引
plugins.v3/subtitletranslator/      # 插件本体（含前端构建产物 dist/）
icons/subtitletranslator.png        # 插件图标
frontend/                           # Vue 联邦组件源码（构建后产物复制到插件 dist/）
```

## 安装

MoviePilot V3 → 插件市场 → 添加仓库地址：

```
https://github.com/shawnxustudio/MoviePilot-Plugins
```

然后安装「字幕机翻」。

也可以直接把仓库地址填进系统的 `PLUGIN_MARKET` 环境变量。

## 前端开发

```bash
cd frontend
npm install
npm run build                       # 产物在 frontend/dist/assets
cp -r dist/assets ../plugins.v3/subtitletranslator/dist/
```

> 每次改动前端都要提升插件版本号：宿主用 `?v=<plugin_version>` 作为前端入口的缓存键，版本不变会拿到旧入口。

## 图标

`icons/subtitletranslator.png` 是本仓库自带图标。MoviePilot 的图标由宿主静态目录提供，
第三方插件想用自己的图标，把 `plugin_icon` 写成图片的 raw 地址即可（前端会走图片代理）：

```python
plugin_icon = "https://raw.githubusercontent.com/<你的仓库>/main/icons/subtitletranslator.png"
```

## 许可

MIT
