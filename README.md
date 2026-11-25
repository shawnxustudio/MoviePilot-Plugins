# MoviePilot 插件仓库 · 字幕机翻

MoviePilot V3 插件仓库，目前包含一个插件：

### 字幕机翻（SubtitleTranslator）

在 MoviePilot 里搜索媒体库影视，把内嵌字幕机翻成中文写回视频同目录，并刷新媒体服务器。

- 同时支持 **MoviePilot V2 与 V3**（同一份实现，按宿主自动适配接口）
- 搜索/点选翻译，不需要配置媒体目录，也不全盘扫描
- 可选字幕轨（自动优先英文），PGS 图形字幕会标灰
- 多服务商（DeepSeek / 硅基流动 / 百炼 / Kimi / 智谱 / OpenRouter / Gemini / 自定义），每个服务商单独记 Key
- 默认双语（译文在上、原文在下），可切仅译文
- 队列后台跑，带阶段指示（提取 → 翻译 → 写入 → 刷新），完成推送 MP 通知
<img width="659" height="406" alt="Snipaste_2026-11-25_11-06-16" src="https://github.com/user-attachments/assets/7291caad-c995-46c1-84b5-d7900fd371a5" />
<img width="508" height="277" alt="Snipaste_2026-11-25_11-06-29" src="https://github.com/user-attachments/assets/ca1731d7-eb0e-45d7-8247-ee91ec8ce1e1" />
<img width="618" height="379" alt="Snipaste_2026-11-25_11-10-02" src="https://github.com/user-attachments/assets/4572aa24-d0cc-4e22-ba89-23b780ba17cd" />

详细说明见 [plugins.v3/subtitletranslator/README.md](plugins.v3/subtitletranslator/README.md)。

## 目录结构

```
package.v3.json                     # V3 市场索引
package.json                        # V2 市场索引（条目声明 "v2": true）
plugins.v3/subtitletranslator/      # V3 插件本体（含 dist/ 与前端源码）
plugins/subtitletranslator/         # V2 插件本体（与 V3 同一份实现 + 同一份 dist）
tests/v3/subtitletranslator/        # 合同测试与纯逻辑测试
icons/subtitletranslator.png        # 插件图标
```

> `plugins/` 与 `plugins.v3/` 下的 `__init__.py` 必须**完全一致**，
> `tests` 里有断言防止两份实现漂移。

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
