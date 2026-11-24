"""字幕机翻 V3 插件目录、索引与导入边界合同测试。"""

from __future__ import annotations

import ast
import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[3]
PLUGIN_DIR = REPO_ROOT / "plugins.v3/subtitletranslator"
SOURCE_PATH = PLUGIN_DIR / "__init__.py"


def _imports(source: str) -> list[ast.ImportFrom]:
    """读取插件源码中的 from-import 节点，供导入边界断言使用。"""
    return [
        node
        for node in ast.walk(ast.parse(source, filename=str(SOURCE_PATH)))
        if isinstance(node, ast.ImportFrom)
    ]


def test_directory_matches_lowercase_class_name() -> None:
    """插件目录必须是类名小写，且主类定义在 __init__.py。"""
    source = SOURCE_PATH.read_text(encoding="utf-8")
    assert PLUGIN_DIR.is_dir()
    assert "class SubtitleTranslator(_PluginBase):" in source
    assert PLUGIN_DIR.name == "subtitletranslator"


def test_index_metadata_matches_source() -> None:
    """索引版本、系统要求与代码声明必须一致。"""
    metadata = json.loads((REPO_ROOT / "package.v3.json").read_text(encoding="utf-8"))[
        "SubtitleTranslator"
    ]
    source = SOURCE_PATH.read_text(encoding="utf-8")
    version = metadata["version"]

    assert metadata["system_version"] == ">=3.0.0"
    assert metadata["release"] is True
    assert metadata["history"][f"v{version}"]
    assert f'plugin_version = "{version}"' in source


def test_imports_stay_on_stable_sdk() -> None:
    """新插件不得依赖宿主内部路径或兼容桥接层。"""
    source = SOURCE_PATH.read_text(encoding="utf-8")
    modules = {node.module or "" for node in _imports(source)}

    assert "app.sdk.plugin" in modules
    assert "app.sdk.services" in modules
    assert "app.sdk.logging" in modules
    for forbidden in ("app.core", "app.helper", "app.utils", "app.sdk._legacy"):
        assert not any(module == forbidden or module.startswith(f"{forbidden}.") for module in modules)
    for module in modules:
        assert not module.startswith(("app.application", "app.domain", "app.foundation", "app.adapters"))


def test_vue_bundle_is_present() -> None:
    """Vue 联邦模式的构建产物必须随插件一起提交。"""
    assets = PLUGIN_DIR / "dist/assets"
    source = SOURCE_PATH.read_text(encoding="utf-8")

    assert 'return "vue", "dist/assets"' in source
    assert (assets / "remoteEntry.js").is_file()
    assert any(path.suffix == ".css" for path in assets.iterdir())
