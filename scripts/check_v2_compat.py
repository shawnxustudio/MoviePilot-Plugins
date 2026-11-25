#!/usr/bin/env python3
"""在只有 MoviePilot V2 模块结构的桩环境里导入插件，验证 V2 回退分支可用。

用途：CI 里没有 V2 宿主时，至少能证明插件的 ``except ImportError`` 分支
（app.plugins / app.helper.mediaserver / app.core.config / app.log）能被正确
加载，且 HTTP 客户端回退到 requests。

用法：
    python3 scripts/check_v2_compat.py
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
PLUGIN = REPO_ROOT / "plugins/subtitletranslator/__init__.py"

STUBS = {
    "app/__init__.py": "",
    "app/plugins/__init__.py": '''
        class _PluginBase:
            def __init__(self):
                self.chain = None
                self.plugindata = None
                self.systemconfig = None
            def get_data(self, key=None, plugin_id=None): return None
            def save_data(self, key, value, plugin_id=None): pass
            def update_config(self, config, plugin_id=None): return True
            def get_data_path(self, plugin_id=None): return None
            def post_message(self, **kwargs): pass
        ''',
    "app/helper/__init__.py": "",
    "app/helper/mediaserver.py": '''
        class MediaServerHelper:
            def get_services(self, *args, **kwargs): return {}
        ''',
    "app/core/__init__.py": "",
    "app/core/config.py": '''
        class _Settings:
            PROXY_HOST = None
            def MP_DOMAIN(self, path=""): return "http://localhost/" + path
        settings = _Settings()
        ''',
    "app/log.py": '''
        class _Logger:
            def info(self, msg, *a, **k): pass
            def warning(self, msg, *a, **k): pass
            def error(self, msg, *a, **k): pass
            def debug(self, msg, *a, **k): pass
        logger = _Logger()
        ''',
    "app/schemas/__init__.py": '''
        from pathlib import Path
        class RefreshMediaItem:
            def __init__(self, title=None, year=None, type=None, category=None, target_path=None):
                self.title = title
                self.year = year
                self.type = type
                self.category = category
                self.target_path = Path(target_path) if target_path else None
        ''',
    "app/schemas/types.py": '''
        from enum import Enum
        class NotificationType(Enum):
            Plugin = "插件"
        class EventType(Enum):
            PluginAction = "plugin.action"
        ''',
    "fastapi.py": '''
        class Request:
            pass
        ''',
}

CHECK = textwrap.dedent(
    '''
    import importlib.util, sys
    from pathlib import Path

    plugin = Path(sys.argv[1])
    spec = importlib.util.spec_from_file_location("subtitletranslator_v2", plugin)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    assert module._IS_V3 is False, "应命中 V2 回退分支"
    assert module._http.__name__ == "requests", "V2 应回退到 requests"
    assert module._PluginBase.__module__ == "app.plugins"
    assert module.MediaServerHelper.__module__ == "app.helper.mediaserver"
    assert module._NotifyType.__name__ == "NotificationType"
    assert module._NotifyType.Plugin.value == "插件"

    # 实例化与关键纯逻辑仍应可用
    instance = module.SubtitleTranslator()
    subs = [
        {"index": 1, "lang": "chi", "title": "简体", "codec": "subrip"},
        {"index": 2, "lang": "eng", "title": "English", "codec": "subrip"},
    ]
    assert instance._pick_source(subs)["index"] == 2, "应优先英文字幕轨"
    assert module._has_cn_token("zh-en") and module._has_cn_token("简体中文")
    rendered = module._render_srt(
        [{"time": "00:00:01,000 --> 00:00:02,000", "text": "译文", "origin": "origin"}],
        True,
    )
    assert "译文\\norigin" in rendered, "双语应为译文在上、原文在下"
    print("V2 兼容分支检查通过：", plugin.name)
    '''
)


def main() -> int:
    """搭桩环境并执行检查，返回进程退出码。"""
    if not PLUGIN.is_file():
        print(f"找不到插件源码：{PLUGIN}", file=sys.stderr)
        return 1

    with tempfile.TemporaryDirectory(prefix="mp_v2_stub_") as temp:
        root = Path(temp)
        for relative, content in STUBS.items():
            target = root / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(textwrap.dedent(content), encoding="utf-8")

        result = subprocess.run(
            [sys.executable, "-c", CHECK, str(PLUGIN)],
            env={"PYTHONPATH": str(root), "PATH": "/usr/bin:/bin"},
            capture_output=True,
            text=True,
        )
        sys.stdout.write(result.stdout)
        sys.stderr.write(result.stderr)
        return result.returncode


if __name__ == "__main__":
    sys.exit(main())
