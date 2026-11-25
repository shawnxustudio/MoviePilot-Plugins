"""字幕机翻插件目录、双版本索引与导入边界合同测试。"""

from __future__ import annotations

import ast
import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
V3_DIR = REPO_ROOT / "plugins.v3/subtitletranslator"
V2_DIR = REPO_ROOT / "plugins/subtitletranslator"


def _source(path: Path) -> str:
    """读取插件源码文本。"""
    return path.read_text(encoding="utf-8")


def _imports(source: str) -> list[ast.ImportFrom]:
    """读取插件源码中的 from-import 节点，供导入边界断言使用。"""
    return [
        node
        for node in ast.walk(ast.parse(source))
        if isinstance(node, ast.ImportFrom)
    ]


def test_directory_matches_lowercase_class_name() -> None:
    """插件目录必须是类名小写，主类定义在 __init__.py。"""
    for directory in (V3_DIR, V2_DIR):
        assert directory.is_dir()
        assert directory.name == "subtitletranslator"
        assert "class SubtitleTranslator(_PluginBase):" in _source(directory / "__init__.py")


def test_single_implementation_shared_by_both_generations() -> None:
    """V2 与 V3 共用同一份实现，避免两份代码各自漂移。"""
    v3_source = _source(V3_DIR / "__init__.py")
    v2_source = _source(V2_DIR / "__init__.py")
    assert v3_source == v2_source
    # 两份目录都要带联邦产物，否则其中一个版本加载不到页面
    for directory in (V3_DIR, V2_DIR):
        assert (directory / "dist/assets/remoteEntry.js").is_file()


def test_index_metadata_matches_source() -> None:
    """两个索引的版本、系统要求与代码声明必须一致。"""
    source = _source(V3_DIR / "__init__.py")
    version = "2.7.0"
    assert f'plugin_version = "{version}"' in source

    v3_entry = json.loads((REPO_ROOT / "package.v3.json").read_text(encoding="utf-8"))[
        "SubtitleTranslator"
    ]
    assert v3_entry["version"] == version
    assert v3_entry["system_version"] == ">=3.0.0"
    assert v3_entry["release"] is True
    assert v3_entry["history"][f"v{version}"]

    v2_entry = json.loads((REPO_ROOT / "package.json").read_text(encoding="utf-8"))[
        "SubtitleTranslator"
    ]
    assert v2_entry["version"] == version
    assert v2_entry["v2"] is True
    assert v2_entry["system_version"].startswith(">=2.")
    assert v2_entry["history"][f"v{version}"]


def test_imports_stay_on_stable_sdk() -> None:
    """主路径只用稳定 SDK；V2 兼容导入必须落在 except ImportError 分支里。"""
    source = _source(V3_DIR / "__init__.py")
    modules = {node.module or "" for node in _imports(source)}

    # V3 主路径
    assert "app.sdk.plugin" in modules
    assert "app.sdk.services" in modules
    assert "app.sdk.logging" in modules

    # V2 兼容导入只能出现在回退分支
    fallback_pos = source.index("except ImportError")
    for fallback in ("app.core.config", "app.helper.mediaserver", "app.plugins", "app.log"):
        assert source.index(f"from {fallback} import") > fallback_pos

    # 任何版本都不允许宿主内部目录与兼容桥接
    assert "app.sdk._legacy" not in modules
    for module in modules:
        assert not module.startswith(("app.application", "app.domain", "app.foundation", "app.adapters", "app.utils"))


def test_v2_compat_imports_are_declared() -> None:
    """V2 兼容分支必须声明 V2 真实存在的宿主路径。"""
    source = _source(V2_DIR / "__init__.py")
    for expected in (
        "from app.plugins import _PluginBase",
        "from app.helper.mediaserver import MediaServerHelper",
        "from app.core.config import settings",
        "from app.log import logger",
        "from app.schemas.types import NotificationType",
    ):
        assert expected in source


def test_vue_bundle_is_present() -> None:
    """Vue 联邦模式的构建产物必须随插件一起提交。"""
    source = _source(V3_DIR / "__init__.py")
    assert 'return "vue", "dist/assets"' in source
    assert (V3_DIR / "dist/assets/remoteEntry.js").is_file()
    assert any(path.suffix == ".css" for path in (V3_DIR / "dist/assets").iterdir())
