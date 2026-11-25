"""
MoviePilot 字幕机翻插件。

从媒体库（Emby）里搜索影视条目，用户点选后插件负责：
1. 按条目路径定位本地视频文件（自动把媒体服务器路径换算成容器内路径）；
2. ffprobe 判断是否已有中文字幕，有就跳过；
3. 提取内嵌文本字幕轨，分批交给大模型翻译；
4. 写回 ``<视频名>.zh.srt``（可选中英双语），并请求媒体服务器刷新。

详情页与配置页均由 Vue 联邦组件渲染（Vuetify 的 JSON 页面不支持输入框，
搜索框必须走 Vue 模式）。
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import tempfile
import threading
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from fastapi import Request

from app.schemas import RefreshMediaItem

# MoviePilot V3 把宿主接口收口到 app.sdk；V2 仍然在 app.helper / app.core / app.log。
# 这里两套都声明，运行在哪个宿主就用哪套，插件逻辑保持同一份。
try:  # MoviePilot V3
    from app.sdk.config import settings
    from app.sdk.logging import logger
    from app.sdk.plugin import _PluginBase
    from app.sdk.services import MediaServerHelper
    from app.schemas.types import MessageType as _NotifyType

    _IS_V3 = True
except ImportError:  # pragma: no cover - MoviePilot V2
    from app.core.config import settings
    from app.helper.mediaserver import MediaServerHelper
    from app.log import logger
    from app.plugins import _PluginBase
    from app.schemas.types import NotificationType as _NotifyType

    _IS_V3 = False

try:  # V3 宿主内置 HTTPX2
    import httpx2 as _http
except ImportError:  # pragma: no cover - V2 宿主只有 requests
    import requests as _http

# ─────────────────────────────────────────────
#  常量
# ─────────────────────────────────────────────

VIDEO_EXTS = {
    ".mkv", ".mp4", ".m2ts", ".ts", ".avi", ".mov",
    ".wmv", ".flv", ".rmvb", ".webm", ".mpg", ".mpeg",
}

CN_TOKENS = {
    "zh", "chi", "zho", "cn", "sc", "tc", "chs", "cht", "cmn", "yue",
    "zh-cn", "zh-hans", "zh-hant", "zh-tw", "zh-hk", "zh-sg",
    "中文", "中字", "简体", "繁体", "简中", "繁中", "中英",
}

# 中文标题里常见的整词，命中任意一个即认为带中文
CN_WORDS = ("中文", "中字", "简体", "繁体", "简中", "繁中", "中英", "双语")

EN_TOKENS = {"en", "eng", "english"}

BITMAP_CODECS = {
    "hdmv_pgs_subtitle", "dvd_subtitle", "dvdsub", "pgssub",
    "dvb_subtitle", "dvb_teletext", "xsub",
}

# 支持的翻译服务商
PROVIDERS: Dict[str, Dict[str, Any]] = {
    "deepseek": {
        "name": "DeepSeek",
        "model": "deepseek-flash",
        "base_url": "https://api.deepseek.com",
        "thinking_off": {"thinking": {"type": "disabled"}},
    },
    "siliconflow": {
        "name": "硅基流动",
        "model": "Qwen/Qwen3-8B",
        "base_url": "https://api.siliconflow.cn/v1",
        "thinking_off": {"enable_thinking": False},
    },
    "aliyun": {
        "name": "阿里云百炼",
        "model": "qwen-plus",
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "thinking_off": {"enable_thinking": False},
    },
    "moonshot": {
        "name": "月之暗面 Kimi",
        "model": "moonshot-v1-8k",
        "base_url": "https://api.moonshot.cn/v1",
        "thinking_off": {},
    },
    "zhipu": {
        "name": "智谱 BigModel",
        "model": "glm-4-flash",
        "base_url": "https://open.bigmodel.cn/api/paas/v4",
        "thinking_off": {"thinking": {"type": "disabled"}},
    },
    "openrouter": {
        "name": "OpenRouter",
        "model": "deepseek/deepseek-chat",
        "base_url": "https://openrouter.ai/api/v1",
        "thinking_off": {"reasoning": {"enabled": False}},
        "extra_headers": {
            "HTTP-Referer": "https://github.com/shawnxustudio",
            "X-Title": "MoviePilot SubtitleTranslator",
        },
    },
    "gemini": {
        "name": "Google Gemini",
        "model": "gemini-2.5-flash",
        "base_url": "https://generativelanguage.googleapis.com/v1beta",
        "kind": "gemini",
        "thinking_off": {},
    },
    "custom": {
        "name": "自定义 OpenAI 兼容",
        "base_url": "",
        "thinking_off": {},
    },
}

# 没填 Key 或接口拉不到时使用的常用模型，保证下拉框不是空的
FALLBACK_MODELS: Dict[str, List[str]] = {
    "deepseek": ["deepseek-chat", "deepseek-reasoner", "deepseek-flash", "deepseek-v4-pro"],
    "siliconflow": ["Qwen/Qwen3-8B", "deepseek-ai/DeepSeek-V3", "Qwen/Qwen2.5-72B-Instruct"],
    "aliyun": ["qwen-plus", "qwen-max", "qwen-turbo"],
    "moonshot": ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
    "zhipu": ["glm-4-flash", "glm-4-air", "glm-4-plus"],
    "openrouter": ["deepseek/deepseek-chat", "google/gemini-2.5-flash", "anthropic/claude-3.5-sonnet"],
    "gemini": ["gemini-2.5-flash", "gemini-2.5-pro"],
    "custom": [],
}

# 模型 id 里出现这些词就不是对话模型，拉列表时过滤掉
MODEL_EXCLUDE = [
    "embed", "whisper", "tts", "speech", "dall-e", "image", "vision",
    "rerank", "moderation", "audio", "video", "bge", "m3e", "jina",
    "gte-", "text2vec", "bce-", "ocr", "asr", "sd-", "stable-diffusion",
    "flux", "omni", "livetranslate", "realtime",
]

SYSTEM_PROMPT = """你是专业的影视字幕翻译。请严格遵守：
1. 把每一行原文翻译成简体中文，忠实原意，口语自然，符合中文观影习惯；
2. 人物称谓、专有名词按术语表统一；没有术语表时自行保持前后一致；
3. 严格按行输出，每行格式为「序号|译文」，序号与输入完全一致；
4. 不要合并或拆分原文的行，不要输出序号以外的任何解释、空行或说明；
5. 只输出译文，不要保留原文。"""

_NUMBERED_LINE_RE = re.compile(r"^\s*(\d{1,4})\s*[|｜丨:：.、)）]\s*(.*)$")


# ─────────────────────────────────────────────
#  纯函数
# ─────────────────────────────────────────────

class _HttpSession:
    """屏蔽 httpx2（V3）与 requests（V2）的差异，只暴露 get/post/close。"""

    def __init__(self, timeout: int = 180, proxy: Optional[str] = None) -> None:
        self.timeout = timeout
        self.proxies = {"http": proxy, "https": proxy} if proxy else None
        if _IS_V3:
            kwargs: Dict[str, Any] = {"timeout": timeout}
            if proxy:
                kwargs["proxy"] = proxy
            self._client = _http.Client(**kwargs)
        else:  # pragma: no cover - V2
            self._client = _http.Session()

    def request(self, method: str, url: str, **kwargs: Any) -> Any:
        """发一次请求，两个客户端都返回带 status_code / json() 的响应。"""
        if _IS_V3:
            return self._client.request(method, url, **kwargs)
        kwargs.pop("timeout", None)
        return self._client.request(
            method, url, timeout=self.timeout, proxies=self.proxies, **kwargs
        )

    def get(self, url: str, **kwargs: Any) -> Any:
        """GET 便捷方法。"""
        return self.request("GET", url, **kwargs)

    def post(self, url: str, **kwargs: Any) -> Any:
        """POST 便捷方法。"""
        return self.request("POST", url, **kwargs)

    def close(self) -> None:
        """释放连接池。"""
        try:
            self._client.close()
        except Exception:  # noqa: BLE001
            pass


def _emby_json(instance: Any, path: str, params: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
    """
    直接调用媒体服务器 REST 接口取 JSON。

    V2 的 Emby 实例没有 V3 的 ``get_data``，所以这里统一用实例上的地址与密钥自己发请求，
    两个版本走同一条路径。
    """
    host = str(getattr(instance, "_host", "") or "").rstrip("/")
    api_key = str(getattr(instance, "_apikey", "") or "")
    if not host or not api_key:
        return None
    query: Dict[str, Any] = {"api_key": api_key}
    query.update(params or {})
    try:
        response = _http.get(f"{host}/emby/{path}", params=query, timeout=30)
        if getattr(response, "status_code", 0) != 200:
            return None
        return response.json()
    except Exception as error:  # noqa: BLE001
        logger.debug(f"[字幕机翻] 媒体服务器接口失败 {path}: {error}")
        return None


def _which(name: str) -> Optional[str]:
    """按 PATH 查找可执行文件。"""
    return shutil.which(name)


def _ffprobe(path: Path, timeout: int = 30) -> Optional[Dict[str, Any]]:
    """读取媒体流信息，失败返回 None。"""
    exe = _which("ffprobe")
    if not exe:
        return None
    try:
        result = subprocess.run(
            [exe, "-v", "quiet", "-print_format", "json", "-show_streams", str(path)],
            capture_output=True, text=True, timeout=timeout,
        )
        if result.returncode != 0 or not result.stdout.strip():
            return None
        import json as _json
        return _json.loads(result.stdout)
    except Exception as error:  # noqa: BLE001
        logger.debug(f"[字幕机翻] ffprobe 失败 {path}: {error}")
        return None


def _extract_srt(video: Path, stream_index: int, out_path: Path, timeout: int = 900) -> Tuple[bool, str]:
    """把指定字幕流提取为 SRT。"""
    exe = _which("ffmpeg")
    if not exe:
        return False, "容器内找不到 ffmpeg"
    cmd = [
        exe, "-y", "-hide_banner", "-loglevel", "error",
        "-i", str(video), "-map", f"0:{stream_index}",
        "-c:s", "srt", str(out_path),
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        return False, "ffmpeg 提取超时"
    except Exception as error:  # noqa: BLE001
        return False, f"ffmpeg 调用异常: {error}"
    if result.returncode != 0:
        tail = [line.strip() for line in (result.stderr or "").splitlines() if line.strip()]
        return False, f"ffmpeg 提取失败: {tail[-1][:160] if tail else result.returncode}"
    if not out_path.exists() or out_path.stat().st_size == 0:
        return False, "提取结果为空"
    return True, ""


def _parse_srt(text: str) -> List[Dict[str, str]]:
    """把 SRT 解析成 [{time, text}]。"""
    blocks: List[Dict[str, str]] = []
    for chunk in re.split(r"\r?\n\s*\r?\n", text.strip()):
        lines = chunk.strip().splitlines()
        if not lines:
            continue
        offset = 1 if lines[0].strip().isdigit() else 0
        if len(lines) <= offset or "-->" not in lines[offset]:
            continue
        body = "\n".join(lines[offset + 1:]).strip()
        if body:
            blocks.append({"time": lines[offset].strip(), "text": body})
    return blocks


def _render_srt(blocks: List[Dict[str, str]], bilingual: bool) -> str:
    """重建 SRT。"""
    chunks: List[str] = []
    for index, block in enumerate(blocks, start=1):
        text = block["text"]
        if bilingual and block.get("origin"):
            # 原项目的行为：双语时译文在上、原文在下
            text = f"{text}\n{block['origin']}"
        chunks.append(f"{index}\n{block['time']}\n{text}\n")
    return "\n".join(chunks)


def _parse_numbered(raw: str, expected: int) -> List[str]:
    """解析「序号|译文」，行数不齐时抛 ValueError。"""
    found: Dict[int, str] = {}
    for line in (raw or "").splitlines():
        match = _NUMBERED_LINE_RE.match(line)
        if not match:
            continue
        index = int(match.group(1))
        if 1 <= index <= expected and index not in found:
            found[index] = match.group(2).strip()
    missing = [i for i in range(1, expected + 1) if not found.get(i)]
    if missing:
        raise ValueError(f"译文缺 {len(missing)} 行（首缺第 {missing[0]} 行）")
    return [found[i] for i in range(1, expected + 1)]


def _build_user_prompt(texts: List[str], glossary: str) -> str:
    """组装单批提示词。"""
    parts: List[str] = []
    if glossary.strip():
        parts.append(f"术语表（原文=译文）：\n{glossary.strip()}\n")
    numbered = "\n".join(f"{i}|{text}" for i, text in enumerate(texts, start=1))
    parts.append(f"待翻译共 {len(texts)} 行：\n{numbered}")
    return "\n".join(parts)


def _has_cn_token(value: str) -> bool:
    """判断语言标记或标题是否代表中文。"""
    token = (value or "").strip().lower()
    if not token:
        return False
    if token in CN_TOKENS:
        return True
    # 「简体中文」「繁体中字」这类整词，包含关键词即认为命中
    if any(word in token for word in CN_WORDS):
        return True
    return any(part in CN_TOKENS for part in re.split(r"[.\-_\s]+", token) if part)


# ─────────────────────────────────────────────
#  翻译客户端
# ─────────────────────────────────────────────

class _ChatClient:
    """最小化的大模型调用封装。"""

    def __init__(
        self,
        provider: str,
        api_key: str,
        model: str,
        base_url: str,
        timeout: int = 180,
        proxy: Optional[str] = None,
    ) -> None:
        self.provider = provider
        self.preset = PROVIDERS.get(provider) or PROVIDERS["custom"]
        self.api_key = (api_key or "").strip()
        self.model = (model or "").strip() or str(self.preset.get("model") or "")
        self.base_url = (base_url or "").strip().rstrip("/") or str(self.preset.get("base_url") or "")
        proxy_value = proxy if proxy and str(proxy).startswith("http") else None
        self.client = _HttpSession(timeout=timeout, proxy=proxy_value)

    def close(self) -> None:
        """释放连接池。"""
        try:
            self.client.close()
        except Exception:  # noqa: BLE001
            pass

    def chat(self, system: str, user: str) -> str:
        """发一次对话请求。"""
        if self.preset.get("kind") == "gemini":
            return self._chat_gemini(system, user)
        return self._chat_openai(system, user)

    def _chat_openai(self, system: str, user: str) -> str:
        """OpenAI 兼容接口。"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        headers.update(self.preset.get("extra_headers") or {})
        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.3,
            "max_tokens": 4096,
        }
        payload.update(self.preset.get("thinking_off") or {})
        response = self.client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
        if response.status_code == 400:
            changed = False
            for key in ("thinking", "enable_thinking", "reasoning", "temperature"):
                if key in payload:
                    payload.pop(key, None)
                    changed = True
            if changed:
                response = self.client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
        response.raise_for_status()
        data = response.json()
        choice = (data.get("choices") or [{}])[0]
        return ((choice.get("message") or {}).get("content") or "").strip()

    def _chat_gemini(self, system: str, user: str) -> str:
        """Gemini 原生接口。"""
        payload: Dict[str, Any] = {"contents": [{"parts": [{"text": user}]}]}
        if system:
            payload["system_instruction"] = {"parts": [{"text": system}]}
        if any(mark in self.model for mark in ("2.5", "gemini-3")):
            payload["generationConfig"] = {"thinkingConfig": {"thinkingBudget": 0}}
        url = f"{self.base_url}/models/{self.model}:generateContent"
        response = self.client.post(url, params={"key": self.api_key}, json=payload)
        if response.status_code == 400 and "thinking" in (response.text or "").lower():
            payload.pop("generationConfig", None)
            response = self.client.post(url, params={"key": self.api_key}, json=payload)
        response.raise_for_status()
        data = response.json()
        candidates = data.get("candidates") or []
        if not candidates:
            raise ValueError("Gemini 未返回候选结果")
        parts = ((candidates[0].get("content") or {}).get("parts") or [])
        return "".join(part.get("text", "") for part in parts).strip()


def _list_models(provider: str, api_key: str, base_url: str = "", proxy: Optional[str] = None) -> List[str]:
    """拉取服务商的对话模型列表。"""
    preset = PROVIDERS.get(provider) or PROVIDERS["custom"]
    base = (base_url or "").strip().rstrip("/") or str(preset.get("base_url") or "")
    if not base:
        return []
    session = _HttpSession(
        timeout=25, proxy=proxy if proxy and str(proxy).startswith("http") else None
    )
    try:
        client = session
        if preset.get("kind") == "gemini":
            response = client.get(f"{base}/models", params={"key": api_key, "pageSize": 200})
            response.raise_for_status()
            models = []
            for item in response.json().get("models", []):
                if "generateContent" not in (item.get("supportedGenerationMethods") or []):
                    continue
                models.append(str(item.get("name", "")).replace("models/", ""))
        else:
            headers: Dict[str, str] = {}
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"
            headers.update(preset.get("extra_headers") or {})
            response = client.get(f"{base}/models", headers=headers)
            response.raise_for_status()
            payload = response.json()
            raw = payload.get("data", payload) if isinstance(payload, dict) else payload
            models = [str(item.get("id", "")) for item in raw if isinstance(item, dict)]
    finally:
        session.close()
    result = []
    for model in models:
        lowered = model.lower()
        if not model or any(word in lowered for word in MODEL_EXCLUDE):
            continue
        result.append(model)
    return sorted(set(result))


def _translate_chunk(client: _ChatClient, texts: List[str], glossary: str, retries: int) -> Tuple[List[str], int]:
    """翻译一批，失败二分重试到单行。"""
    last_error: Optional[Exception] = None
    for attempt in range(retries + 1):
        try:
            raw = client.chat(SYSTEM_PROMPT, _build_user_prompt(texts, glossary))
            return _parse_numbered(raw, len(texts)), 0
        except Exception as error:  # noqa: BLE001
            last_error = error
            if attempt < retries:
                time.sleep(1.5 ** (attempt + 1))
    if len(texts) > 1:
        middle = len(texts) // 2
        left, left_failed = _translate_chunk(client, texts[:middle], glossary, retries)
        right, right_failed = _translate_chunk(client, texts[middle:], glossary, retries)
        return left + right, left_failed + right_failed
    logger.warning(f"[字幕机翻] 单条翻译失败，保留原文：{last_error}")
    return [texts[0]], 1


# ─────────────────────────────────────────────
#  插件主体
# ─────────────────────────────────────────────

class SubtitleTranslator(_PluginBase):
    """字幕机翻插件。"""

    plugin_name = "字幕机翻"
    plugin_desc = "搜索媒体库影视，提取内嵌字幕并用大模型翻译为中文，写回同目录并刷新媒体服务器。"
    plugin_icon = "Moviepilot_A.png"
    plugin_version = "2.7.0"
    plugin_author = "shawnxu"
    author_url = "https://github.com/shawnxustudio"
    plugin_config_prefix = "subtitletranslator_"
    plugin_order = 21
    auth_level = 2

    def __init__(self) -> None:
        """初始化运行时状态。"""
        super().__init__()
        self._enabled = False
        self._notify = True
        self._refresh_server = True
        self._provider = "deepseek"
        self._api_key = ""
        self._api_keys: Dict[str, str] = {}
        self._model = ""
        self._api_url = ""
        self._batch_size = 20
        self._delay = 0.5
        self._retries = 2
        self._glossary = ""
        self._output_mode = "zh"
        self._overwrite = False

        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._worker: Optional[threading.Thread] = None
        self._state: Dict[str, Any] = self._empty_state()
        self._roots_cache: Optional[List[Path]] = None

    # ── 生命周期 ──────────────────────────────

    def init_plugin(self, config: Optional[Dict[str, Any]] = None) -> None:
        """读取配置。"""
        config = config or {}
        self._enabled = bool(config.get("enabled"))
        self._notify = bool(config.get("notify", True))
        self._refresh_server = bool(config.get("refresh_server", True))
        self._provider = str(config.get("provider") or "deepseek")
        if self._provider not in PROVIDERS:
            self._provider = "deepseek"
        raw_keys = config.get("api_keys")
        self._api_keys = (
            {str(k): str(v) for k, v in raw_keys.items() if k and v}
            if isinstance(raw_keys, dict) else {}
        )
        self._api_key = str(config.get("api_key") or "") or self._api_keys.get(self._provider, "")
        self._model = str(config.get("model") or "")
        self._api_url = str(config.get("api_url") or "")
        self._glossary = str(config.get("glossary") or "")
        self._output_mode = "zh" if str(config.get("output_mode") or "") == "zh" else "zh-en"
        self._overwrite = bool(config.get("overwrite"))
        try:
            self._batch_size = min(60, max(1, int(config.get("batch_size") or 20)))
        except (TypeError, ValueError):
            self._batch_size = 20
        try:
            self._delay = max(0.0, float(config.get("delay") or 0))
        except (TypeError, ValueError):
            self._delay = 0.5
        try:
            self._retries = min(5, max(0, int(config.get("retries") or 2)))
        except (TypeError, ValueError):
            self._retries = 2

        # 恢复上次的任务记录；上次若正在跑，进程已经换过，标记为中断
        saved = self.get_data("state")
        state = self._empty_state()
        if isinstance(saved, dict):
            state["queue"] = saved.get("queue") or []
            state["history"] = saved.get("history") or []
            current = saved.get("current")
            if isinstance(current, dict) and current.get("state") in ("running", "queued"):
                current["state"] = "interrupted"
                current["message"] = "插件重载或重启，任务已中断"
                state["history"].insert(0, self._task_summary(current))
                del state["history"][10:]
        self._state = state

    def get_state(self) -> bool:
        """返回是否启用。"""
        return self._enabled

    def stop_service(self) -> None:
        """停止后台任务线程并保存状态。"""
        self._stop.set()
        thread = self._worker
        if thread and thread.is_alive():
            thread.join(timeout=5)
        self._worker = None
        with self._lock:
            current = self._state.get("current")
            if isinstance(current, dict) and current.get("state") in ("running", "queued"):
                current["state"] = "stopped"
                current["finished"] = time.strftime("%Y-%m-%d %H:%M:%S")
                current["finished_ts"] = time.time()
                self._state["history"].insert(0, self._task_summary(current))
                del self._state["history"][10:]
                self._state["current"] = None
            self._state["queue"] = []
            self._persist()

    def close(self) -> None:
        """资源释放钩子。"""
        self.stop_service()

    @staticmethod
    def get_render_mode() -> Tuple[str, str]:
        """详情页与配置页都使用 Vue 联邦组件。

        宿主会在入口地址后追加 ``?v=<plugin_version>``，所以改动前端后
        必须同步提升 plugin_version，旧缓存才会被击穿。
        """
        return "vue", "dist/assets"

    def get_form(self) -> Tuple[Optional[List[Dict[str, Any]]], Dict[str, Any]]:
        """Vue 模式下配置页由前端组件渲染。"""
        return None, {
            "enabled": False,
            "notify": True,
            "refresh_server": True,
            "provider": "deepseek",
            "api_key": "",
            "api_keys": {},
            "model": "",
            "api_url": "",
            "batch_size": 20,
            "delay": 0.5,
            "retries": 2,
            "glossary": "",
            "output_mode": "zh-en",
            "overwrite": False,
        }

    def get_page(self) -> Optional[List[Dict[str, Any]]]:
        """Vue 模式下详情页由前端组件渲染。"""
        return None

    def get_api(self) -> List[Dict[str, Any]]:
        """注册搜索、翻译、状态、模型列表接口。"""
        return [
            {
                "path": "/search",
                "endpoint": self.api_search,
                "methods": ["GET"],
                "auth": "bear",
                "summary": "搜索媒体库影视",
            },
            {
                "path": "/probe",
                "endpoint": self.api_probe,
                "methods": ["GET"],
                "auth": "bear",
                "summary": "探测条目的字幕流",
            },
            {
                "path": "/translate",
                "endpoint": self.api_translate,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "对选中的影视执行字幕机翻",
            },
            {
                "path": "/status",
                "endpoint": self.api_status,
                "methods": ["GET"],
                "auth": "bear",
                "summary": "查询任务状态",
            },
            {
                "path": "/stop",
                "endpoint": self.api_stop,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "停止当前任务",
            },
            {
                "path": "/models",
                "endpoint": self.api_models,
                "methods": ["POST"],
                "auth": "bear",
                "summary": "拉取服务商模型列表",
            },
        ]

    # ── 媒体库访问 ────────────────────────────

    def _emby_instance(self) -> Any:
        """取一个可用的媒体服务器实例（当前以 Emby 为主）。"""
        try:
            services = MediaServerHelper().get_services()
        except Exception as error:  # noqa: BLE001
            logger.error(f"[字幕机翻] 读取媒体服务器配置失败：{error}")
            return None
        for _, service in services.items():
            instance = getattr(service, "instance", None)
            # V3 的实例有 get_data；V2 只有 _host/_apikey，两个版本都按真实属性识别
            if instance is not None and getattr(instance, "_apikey", None) is not None:
                return instance
        return None

    def _roots(self) -> List[Path]:
        """枚举容器内可能存放媒体的一级、二级目录，用于媒体服务器路径换算。"""
        if self._roots_cache is not None:
            return self._roots_cache
        roots: List[Path] = []
        for base in ("/video", "/media", "/mnt", "/tv", "/movie", "/data"):
            path = Path(base)
            if not path.is_dir():
                continue
            roots.append(path)
            try:
                for child in path.iterdir():
                    if child.is_dir() and not child.name.startswith("."):
                        roots.append(child)
            except OSError:
                continue
        self._roots_cache = roots
        return roots

    def _resolve_local(self, server_path: str) -> Optional[Path]:
        """
        把媒体服务器返回的路径换算成本地可访问路径。

        媒体服务器与 MoviePilot 的挂载点常常不同（例如媒体服务器里的 /media 对应
        本容器内的 /media/library），这里按路径尾部逐级匹配容器内实际存在的目录。
        """
        if not server_path:
            return None
        direct = Path(server_path)
        if direct.exists():
            return direct
        parts = direct.parts
        if not parts:
            return None
        for root in self._roots():
            for depth in range(2, min(5, len(parts)) + 1):
                candidate = root.joinpath(*parts[-depth:])
                if candidate.exists():
                    return candidate
        return None

    @staticmethod
    def _emby_path(instance: Any, item_id: Optional[str] = None) -> str:
        """拼出 Emby 的条目接口路径，有用户上下文时带上用户。"""
        user = str(getattr(instance, "user", "") or "")
        prefix = f"Users/{user}/" if user else ""
        return f"{prefix}Items/{item_id}" if item_id else f"{prefix}Items"

    def _item_json(self, item_id: str, fields: str) -> Optional[Dict[str, Any]]:
        """按条目 ID 读取 Emby 详情。"""
        instance = self._emby_instance()
        if instance is None:
            return None
        return _emby_json(instance, self._emby_path(instance, item_id), {"Fields": fields})

    def _search_items(self, keyword: str, item_type: str, limit: int) -> List[Dict[str, Any]]:
        """通过媒体服务器接口搜索影视条目。"""
        instance = self._emby_instance()
        if instance is None:
            return []
        types = item_type if item_type in ("Movie", "Series") else "Movie,Series"
        # 不带关键词时按入库时间倒序，最新入库的排最前；带关键词时按名称排便于对照
        if keyword.strip():
            sort_by, sort_order = "SortName", "Ascending"
        else:
            sort_by, sort_order = "DateCreated", "Descending"
        query: Dict[str, Any] = {
            "Recursive": "true",
            "IncludeItemTypes": types,
            "Limit": limit,
            "Fields": "Path,MediaSources,ProductionYear,ImageTags,DateCreated",
            "SortBy": sort_by,
            "SortOrder": sort_order,
        }
        if keyword.strip():
            query["SearchTerm"] = keyword.strip()
        payload = _emby_json(instance, self._emby_path(instance), query)
        if not payload:
            return []

        results: List[Dict[str, Any]] = []
        for item in payload.get("Items") or []:
            item_id = str(item.get("Id") or "")
            if not item_id:
                continue
            streams: List[Dict[str, Any]] = []
            for source in item.get("MediaSources") or []:
                for stream in source.get("MediaStreams") or []:
                    if stream.get("Type") != "Subtitle":
                        continue
                    streams.append({
                        "index": stream.get("Index"),
                        "lang": str(stream.get("Language") or "").lower(),
                        "codec": str(stream.get("Codec") or ""),
                        "title": stream.get("DisplayTitle") or "",
                    })
            has_cn = any(
                _has_cn_token(stream.get("lang", "")) or _has_cn_token(stream.get("title", ""))
                for stream in streams
            )
            results.append({
                "id": item_id,
                "title": item.get("Name") or "",
                "year": item.get("ProductionYear") or "",
                "type": item.get("Type") or "",
                "path": item.get("Path") or "",
                "poster": self._poster_url(instance, item_id, item.get("ImageTags") or {}),
                "has_cn": has_cn,
                "sub_count": len(streams),
                "sub_langs": sorted({stream["lang"] for stream in streams if stream["lang"]}),
                "created": str(item.get("DateCreated") or "")[:10],
            })
        return results

    @staticmethod
    def _poster_url(instance: Any, item_id: str, image_tags: Dict[str, Any]) -> str:
        """拼出可直接访问的海报地址。"""
        host = str(getattr(instance, "_host", "") or "").rstrip("/")
        api_key = str(getattr(instance, "_apikey", "") or "")
        tag = str(image_tags.get("Primary") or "")
        if not host or not api_key:
            return ""
        url = f"{host}/emby/Items/{item_id}/Images/Primary?maxHeight=360&api_key={api_key}"
        if tag:
            url += f"&tag={tag}"
        return url

    # ── API ───────────────────────────────────

    def api_search(self, request: Request) -> Dict[str, Any]:
        """搜索媒体库影视条目。"""
        if not self._enabled:
            return {"success": False, "message": "插件未启用"}
        params = request.query_params
        q = params.get("q", "")
        item_type = params.get("type", "")
        try:
            limit = int(params.get("limit") or 40)
        except (TypeError, ValueError):
            limit = 40
        try:
            items = self._search_items(q, item_type, max(1, min(100, limit)))
        except Exception as error:  # noqa: BLE001
            logger.error(f"[字幕机翻] 搜索失败：{error}")
            return {"success": False, "message": f"搜索失败：{error}"}
        # 媒体服务器配置里写的常是 127.0.0.1，浏览器访问不到，换成用户实际访问主机名
        host = (request.headers.get("host") or "").split(":")[0]
        if host and host not in ("127.0.0.1", "localhost"):
            for item in items:
                poster = item.get("poster") or ""
                if poster:
                    item["poster"] = poster.replace("127.0.0.1", host).replace("localhost", host)
        return {"success": True, "items": items, "count": len(items)}

    def api_probe(self, request: Request) -> Dict[str, Any]:
        """探测条目里有哪些字幕轨，供前端手动选择。"""
        if not self._enabled:
            return {"success": False, "message": "插件未启用"}
        params = request.query_params
        item_id = params.get("id", "")
        server_path = params.get("path", "")
        local = self._resolve_local(server_path)
        if local is None and item_id:
            detail = self._item_json(item_id, "Path")
            if detail:
                local = self._resolve_local(str(detail.get("Path") or ""))
        if local is None:
            return {"success": False, "message": "无法定位本地文件"}
        if local.is_dir():
            videos = self._videos_in(local)
            if not videos:
                return {"success": False, "message": "目录里没有视频文件"}
            streams = self._probe_streams(videos[0])
            return {
                "success": True,
                "multi": True,
                "video": videos[0].name,
                "files": len(videos),
                "existing": sum(1 for v in videos if self._has_output(v)),
                "streams": streams,
                "message": f"剧集共 {len(videos)} 集，将按同样规则逐集选轨（以下为第 1 集的字幕轨）",
            }
        return {
            "success": True,
            "multi": False,
            "video": local.name,
            "files": 1,
            "existing": 1 if self._has_output(local) else 0,
            "streams": self._probe_streams(local),
        }

    @staticmethod
    def _has_output(video: Path) -> bool:
        """该视频是否已经有中文字幕文件（单语或双语）。"""
        return (video.parent / f"{video.stem}.zh.srt").exists() or \
            (video.parent / f"{video.stem}.zh-en.srt").exists()

    @staticmethod
    def _probe_streams(video: Path) -> List[Dict[str, Any]]:
        """读取视频里的字幕轨信息。"""
        info = _ffprobe(video)
        if info is None:
            return []
        streams: List[Dict[str, Any]] = []
        for stream in info.get("streams") or []:
            if stream.get("codec_type") != "subtitle":
                continue
            tags = stream.get("tags") or {}
            codec = str(stream.get("codec_name") or "")
            streams.append({
                "index": stream.get("index"),
                "lang": str(tags.get("language") or "").lower(),
                "title": str(tags.get("title") or ""),
                "codec": codec,
                "bitmap": codec in BITMAP_CODECS,
            })
        return streams

    @staticmethod
    def _videos_in(folder: Path) -> List[Path]:
        """列出目录下的视频文件。"""
        return [
            path for path in sorted(folder.rglob("*"))
            if path.is_file() and path.suffix.lower() in VIDEO_EXTS
        ]

    async def api_translate(self, request: Request) -> Dict[str, Any]:
        """对选中的影视条目启动字幕机翻。"""
        if not self._enabled:
            return {"success": False, "message": "插件未启用"}
        try:
            payload = await request.json()
        except Exception:  # noqa: BLE001
            payload = {}
        payload = payload or {}
        item_id = str(payload.get("id") or "")
        server_path = str(payload.get("path") or "")
        if not item_id and not server_path:
            return {"success": False, "message": "缺少条目信息"}
        if not self._api_key:
            return {"success": False, "message": "请先在配置中填写 API Key"}
        try:
            stream_index = payload.get("stream_index")
            stream_index = int(stream_index) if stream_index is not None and stream_index != "" else None
        except (TypeError, ValueError):
            stream_index = None
        force = payload.get("force")
        if force is None:
            force = self._overwrite
        return self._enqueue(
            item_id=item_id, server_path=server_path,
            title=str(payload.get("title") or ""), stream_index=stream_index,
            force=bool(force),
        )

    def api_status(self) -> Dict[str, Any]:
        """返回当前任务、队列和历史。"""
        with self._lock:
            current = self._state.get("current")
            queue = list(self._state.get("queue") or [])
            history = list(self._state.get("history") or [])
        payload: Optional[Dict[str, Any]] = None
        if current:
            payload = dict(current)
            payload["log"] = (payload.get("log") or [])[-12:]
            elapsed = int(max(0, time.time() - current.get("started_ts", 0)))
            payload["elapsed"] = elapsed
            lines_done = current.get("lines_done") or 0
            lines_total = current.get("lines_total") or 0
            if lines_done > 5 and lines_total > lines_done and elapsed > 0 and current.get("state") == "running":
                speed = lines_done / elapsed
                if speed > 0:
                    payload["eta"] = int((lines_total - lines_done) / speed)
        return {
            "success": True,
            "current": payload,
            "queue": [{"id": t.get("id"), "title": t.get("title")} for t in queue],
            "history": history,
        }

    def api_stop(self) -> Dict[str, Any]:
        """停止当前任务并清空队列。"""
        self._stop.set()
        with self._lock:
            dropped = len(self._state.get("queue") or [])
            self._state["queue"] = []
            self._persist()
        message = "已发送停止信号"
        if dropped:
            message += f"，并清空队列 {dropped} 个"
        return {"success": True, "message": message}

    async def api_models(self, request: Request) -> Dict[str, Any]:
        """按服务商拉取可用的对话模型列表。"""
        try:
            payload = await request.json()
        except Exception:  # noqa: BLE001
            payload = {}
        payload = payload or {}
        provider = str(payload.get("provider") or self._provider)
        api_key = str(payload.get("api_key") or self._api_key)
        api_url = str(payload.get("api_url") or "")
        note = ""
        models: List[str] = []
        try:
            models = _list_models(provider, api_key, api_url, self._proxy())
        except Exception as error:  # noqa: BLE001
            note = f"拉取失败：{error}"
        if not models:
            models = list(FALLBACK_MODELS.get(provider) or [])
            if not api_key:
                note = "未填写 API Key，下面是常用模型；填好 Key 后可拉取完整列表"
            elif not note:
                note = "没取到列表，下面是常用模型"
        return {
            "success": bool(models),
            "models": models,
            "message": note or f"共 {len(models)} 个模型",
        }

    def _proxy(self) -> Optional[str]:
        """取宿主配置的代理地址。"""
        candidate = getattr(settings, "PROXY_HOST", None)
        if isinstance(candidate, str) and candidate.startswith("http"):
            return candidate
        return None

    # ── 任务队列 ──────────────────────────────

    @staticmethod
    def _empty_state() -> Dict[str, Any]:
        """初始化任务状态容器。"""
        return {"queue": [], "current": None, "history": []}

    @staticmethod
    def _new_task(item_id: str, server_path: str, title: str,
                  stream_index: Optional[int]) -> Dict[str, Any]:
        """构造一个排队中的任务。"""
        return {
            "id": f"t{int(time.time() * 1000)}",
            "item_id": item_id,
            "path": server_path,
            "title": title or item_id,
            "stream_index": stream_index,
            "force": False,
            "stage": "queued",
            "state": "queued",
            "total": 0, "done": 0,
            "lines_total": 0, "lines_done": 0,
            "current": "", "message": "",
            "started": "", "started_ts": 0.0,
            "finished": "", "finished_ts": 0.0,
            "results": [], "log": [],
        }

    @staticmethod
    def _task_summary(task: Dict[str, Any]) -> Dict[str, Any]:
        """任务的历史摘要，去掉日志等大字段。"""
        return {
            "id": task.get("id"),
            "title": task.get("title"),
            "state": task.get("state"),
            "total": task.get("total", 0),
            "ok": task.get("ok", 0),
            "skip": task.get("skip", 0),
            "fail": task.get("fail", 0),
            "message": task.get("message", ""),
            "started": task.get("started", ""),
            "finished": task.get("finished", ""),
            "finished_ts": task.get("finished_ts", 0.0),
            "results": (task.get("results") or [])[:20],
        }

    def _log(self, message: str) -> None:
        """写插件日志，并追加到当前任务日志里。"""
        logger.info(f"【字幕机翻】{message}")
        current = self._state.get("current")
        if not current:
            return
        with self._lock:
            log = current.setdefault("log", [])
            log.append({"ts": time.strftime("%H:%M:%S"), "msg": message})
            if len(log) > 40:
                del log[:-40]

    def _persist(self) -> None:
        """把队列与历史落库，插件重载或页面刷新后还能看到。"""
        try:
            self.save_data("state", {
                "queue": self._state.get("queue") or [],
                "current": self._state.get("current"),
                "history": (self._state.get("history") or [])[:10],
            })
        except Exception as error:  # noqa: BLE001
            logger.warning(f"[字幕机翻] 保存任务状态失败：{error}")

    def _enqueue(self, item_id: str, server_path: str, title: str,
                 stream_index: Optional[int], force: bool = False) -> Dict[str, Any]:
        """把翻译请求加入队列，并给出粗略耗时估算。"""
        task = self._new_task(item_id, server_path, title, stream_index)
        # 用户主动点翻译就按用户的意思来，默认重翻已有字幕
        task["force"] = bool(force)
        try:
            count = max(1, len(self._collect_videos(item_id, server_path)))
        except Exception:  # noqa: BLE001 - 估不出来也不影响入队
            count = 1

        # 实测约 0.145 秒/行，字幕行数约等于时长（分钟）× 12.5；
        # 剧集没有单集时长，按每集 4 分钟估
        if count == 1:
            minutes = self._item_duration_minutes(item_id)
            seconds = minutes * 12.5 * 0.145 + 30 if minutes > 0 else 240.0
        else:
            seconds = 240.0 * count
        eta_low = max(2, int(round(seconds * 0.7 / 60)))
        eta_high = max(eta_low + 2, int(round(seconds * 1.45 / 60)))
        task["files"] = count
        task["eta_low"] = eta_low
        task["eta_high"] = eta_high

        with self._lock:
            self._state["queue"].append(task)
            position = len(self._state["queue"]) + (1 if self._state.get("current") else 0)
            self._persist()
        self._ensure_worker()
        payload = {
            "success": True,
            "task_id": task["id"],
            "position": position,
            "files": count,
            "eta_low": eta_low,
            "eta_high": eta_high,
        }
        if position > 1:
            payload["message"] = f"已加入队列，前面还有 {position - 1} 个"
        else:
            payload["message"] = "任务已启动"
        return payload

    def _ensure_worker(self) -> None:
        """确保工作线程在跑。"""
        with self._lock:
            if self._worker and self._worker.is_alive():
                return
            self._stop.clear()
            self._worker = threading.Thread(
                target=self._work_loop, daemon=True, name="SubtitleTranslator",
            )
            self._worker.start()

    def _work_loop(self) -> None:
        """顺序消费队列。"""
        while True:
            with self._lock:
                if self._stop.is_set() or not self._state["queue"]:
                    self._state["queue"] = []
                    self._state["current"] = None
                    self._worker = None
                    self._persist()
                    return
                task = self._state["queue"].pop(0)
                task["state"] = "running"
                task["started"] = time.strftime("%Y-%m-%d %H:%M:%S")
                task["started_ts"] = time.time()
                self._state["current"] = task
                self._persist()

            try:
                self._run_task(task)
            except Exception as error:  # noqa: BLE001
                logger.error(f"[字幕机翻] 任务异常：{error}")
                task["state"] = "failed"
                task["message"] = str(error)

            with self._lock:
                task["finished"] = time.strftime("%Y-%m-%d %H:%M:%S")
                task["finished_ts"] = time.time()
                self._state["history"].insert(0, self._task_summary(task))
                del self._state["history"][10:]
                self._state["current"] = None
                self._persist()

            self._notify_result(task)

    def _run_task(self, task: Dict[str, Any]) -> None:
        """执行单个任务：展开视频、逐集翻译、刷新媒体库。"""
        videos = self._collect_videos(task.get("item_id", ""), task.get("path", ""))
        if not videos:
            task["state"] = "failed"
            task["message"] = "没有定位到可处理的视频文件"
            self._log("没有定位到可处理的视频文件")
            return

        with self._lock:
            task["total"] = len(videos)
            task["stage"] = "prepare"

        client = _ChatClient(
            provider=self._provider, api_key=self._api_key,
            model=self._model, base_url=self._api_url, proxy=self._proxy(),
        )
        touched: Dict[str, Path] = {}
        try:
            for index, video in enumerate(videos, start=1):
                if self._stop.is_set():
                    task["state"] = "stopped"
                    task["message"] = "已手动停止"
                    break
                with self._lock:
                    task["current"] = video.name
                    task["stage"] = "probe"
                status, message = self._process_video(
                    task, client, video, task.get("stream_index"), bool(task.get("force")),
                )
                with self._lock:
                    task["done"] = index
                    task["results"].append({
                        "name": video.name, "status": status,
                        "message": message, "ts": time.strftime("%H:%M:%S"),
                    })
                    if status == "ok":
                        task["ok"] = task.get("ok", 0) + 1
                        touched[str(video.parent)] = video.parent
                    elif status == "skip":
                        task["skip"] = task.get("skip", 0) + 1
                    else:
                        task["fail"] = task.get("fail", 0) + 1
                    self._persist()
                self._log(f"({index}/{len(videos)}) {video.name} → {message}")
        finally:
            client.close()

        if touched and self._refresh_server:
            with self._lock:
                task["stage"] = "refresh"
            self._refresh_libraries(list(touched.values()))

        with self._lock:
            task["current"] = ""
            task["stage"] = "done"
            if task["state"] == "running":
                task["state"] = "done"
                task["message"] = (
                    f"成功 {task.get('ok', 0)}，跳过 {task.get('skip', 0)}，失败 {task.get('fail', 0)}"
                )

    def _item_duration_minutes(self, item_id: str) -> float:
        """读取条目时长（分钟），用于估算翻译耗时。"""
        if not item_id:
            return 0.0
        detail = self._item_json(item_id, "RunTimeTicks")
        if not detail:
            return 0.0
        try:
            ticks = float(detail.get("RunTimeTicks") or 0)
        except Exception:  # noqa: BLE001
            return 0.0
        return ticks / 10_000_000 / 60

    def _collect_videos(self, item_id: str, server_path: str) -> List[Path]:
        """把选中的条目展开成一组本地视频文件。"""
        local = self._resolve_local(server_path)
        if local is None and item_id:
            detail = self._item_json(item_id, "Path")
            if detail:
                local = self._resolve_local(str(detail.get("Path") or ""))
        if local is None:
            self._log(f"无法定位本地文件：{server_path}")
            return []
        if local.is_file():
            return [local] if local.suffix.lower() in VIDEO_EXTS else []
        return self._videos_in(local)

    def _process_video(self, task: Dict[str, Any], client: _ChatClient,
                       video: Path, forced_index: Optional[int] = None,
                       force: bool = False) -> Tuple[str, str]:
        """处理单个视频：判重、抽字幕、翻译、写回。"""
        # 与原项目一致：双语写 .zh-en.srt，仅译文写 .zh.srt；任一已存在都算翻过
        tag = "zh-en" if self._output_mode == "zh-en" else "zh"
        out_path = video.parent / f"{video.stem}.{tag}.srt"
        other = video.parent / f"{video.stem}.{'zh' if tag == 'zh-en' else 'zh-en'}.srt"
        if (out_path.exists() or other.exists()) and not (force or self._overwrite):
            return "skip", "已存在中文外挂字幕（可勾选重新翻译）"
        if force or self._overwrite:
            # 重翻时清掉另一种命名的旧文件，避免同一视频挂两条字幕轨
            try:
                other.unlink(missing_ok=True)
            except OSError:
                pass

        subs = self._probe_streams(video)
        if not subs:
            return "fail", "没有字幕轨（或 ffprobe 读取失败）"
        source = self._pick_source(subs, forced_index, force=force or self._overwrite)
        if source is None:
            if any(_has_cn_token(item.get("lang", "")) or _has_cn_token(item.get("title", "")) for item in subs):
                return "skip", "已有中文字幕轨（可勾选重新翻译）"
            return "fail", "没有可提取的文本字幕轨（可能是 PGS 图形字幕）"

        work_dir = Path(tempfile.mkdtemp(prefix="subtr_"))
        srt_path = work_dir / "source.srt"
        with self._lock:
            task["stage"] = "extract"
        try:
            ok, error = _extract_srt(video, int(source["index"]), srt_path)
            if not ok:
                return "fail", error
            blocks = _parse_srt(srt_path.read_text(encoding="utf-8", errors="replace"))
            if not blocks:
                return "fail", "解析字幕为空"

            with self._lock:
                task["stage"] = "translate"
                task["lines_total"] = len(blocks)
                task["lines_done"] = 0
            self._log(f"已提取 {len(blocks)} 条字幕，开始翻译")

            texts = [" ".join(block["text"].splitlines()) for block in blocks]
            translated, failed = self._translate_all(task, client, texts)
            if failed and failed >= len(texts):
                return "fail", "全部字幕行翻译失败"

            for block, original, zh in zip(blocks, texts, translated):
                block["origin"] = original
                block["text"] = zh or original
            with self._lock:
                task["stage"] = "write"
            out_path.write_text(_render_srt(blocks, self._output_mode == "zh-en"), encoding="utf-8")

            message = f"已写入 {out_path.name}（{len(blocks)} 条"
            if failed:
                message += f"，{failed} 条保留原文"
            message += "）"
            return "ok", message
        except Exception as error:  # noqa: BLE001
            return "fail", str(error)
        finally:
            shutil.rmtree(work_dir, ignore_errors=True)

    @staticmethod
    def _pick_source(subs: List[Dict[str, Any]],
                     forced_index: Optional[int] = None,
                     force: bool = False) -> Optional[Dict[str, Any]]:
        """挑一条可提取的文本字幕轨；指定了轨道就优先用指定的那条。"""
        if forced_index is not None:
            for item in subs:
                if item.get("index") == forced_index and item.get("codec") not in BITMAP_CODECS:
                    return item
        usable = [
            item for item in subs
            if item.get("codec") not in BITMAP_CODECS and item.get("index") is not None
        ]
        if not usable:
            return None
        non_cn = [
            item for item in usable
            if not _has_cn_token(item.get("lang", "")) and not _has_cn_token(item.get("title", ""))
        ]
        candidates = non_cn or usable
        for item in candidates:
            if item.get("lang", "").lower() in EN_TOKENS:
                return item
        return candidates[0]

    def _translate_all(self, task: Dict[str, Any], client: _ChatClient,
                       texts: List[str]) -> Tuple[List[str], int]:
        """分批翻译整条字幕，并把批次与行进度写进任务状态。"""
        results: List[str] = []
        failed_total = 0
        total = len(texts)
        for batch_index, start in enumerate(range(0, total, self._batch_size), start=1):
            if self._stop.is_set():
                break
            chunk = texts[start:start + self._batch_size]
            translated, failed = _translate_chunk(client, chunk, self._glossary, self._retries)
            results.extend(translated)
            failed_total += failed
            finished = min(start + self._batch_size, total)
            with self._lock:
                task["lines_done"] = finished
            if batch_index % 10 == 0:
                self._log(f"翻译进度 {finished}/{total} 行")
            if self._delay and finished < total:
                time.sleep(self._delay)
        if len(results) < len(texts):
            results.extend(texts[len(results):])
        return results, failed_total

    def _refresh_libraries(self, directories: List[Path]) -> None:
        """请求媒体服务器刷新。"""
        try:
            items = [RefreshMediaItem(target_path=directory) for directory in directories]
            for name, service in MediaServerHelper().get_services().items():
                instance = getattr(service, "instance", None)
                if instance is None:
                    continue
                if hasattr(instance, "refresh_library_by_items"):
                    instance.refresh_library_by_items(items)
                elif hasattr(instance, "refresh_root_library"):
                    instance.refresh_root_library()
                else:
                    continue
                self._log(f"已请求 {name} 刷新媒体库")
        except Exception as error:  # noqa: BLE001
            logger.error(f"[字幕机翻] 刷新媒体库失败：{error}")

    def _notify_result(self, task: Dict[str, Any]) -> None:
        """推送单个任务的完成通知。"""
        if not self._notify:
            return
        state = task.get("state")
        if state == "done":
            title = "【字幕机翻】完成"
        elif state == "stopped":
            title = "【字幕机翻】已停止"
        else:
            title = "【字幕机翻】失败"
        elapsed = int(max(0, task.get("finished_ts", 0) - task.get("started_ts", 0)))
        lines = [f"{task.get('title', '')}"]
        lines.append(
            f"成功 {task.get('ok', 0)}，跳过 {task.get('skip', 0)}，失败 {task.get('fail', 0)}"
            f"，用时 {elapsed // 60} 分 {elapsed % 60} 秒"
        )
        failures = [r for r in (task.get("results") or []) if r.get("status") == "fail"]
        if failures:
            lines.append("失败原因：" + failures[0].get("message", "")[:120])
        try:
            self.post_message(mtype=_NotifyType.Plugin, title=title, text="\n".join(lines))
        except Exception as error:  # noqa: BLE001
            logger.warning(f"[字幕机翻] 通知发送失败：{error}")
