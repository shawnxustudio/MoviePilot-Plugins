"""字幕机翻纯逻辑测试：SRT 解析、中文字幕识别、选轨与译文解析。"""

from __future__ import annotations

from app.plugins.subtitletranslator import (
    SubtitleTranslator,
    _has_cn_token,
    _parse_numbered,
    _parse_srt,
    _render_srt,
)

pick_source = SubtitleTranslator._pick_source

SAMPLE = """1
00:00:01,000 --> 00:00:02,000
Hello there.

2
00:00:03,000 --> 00:00:04,500
See you tomorrow.
"""


def test_parse_srt_reads_cues() -> None:
    """SRT 解析应保留时间轴与文本。"""
    blocks = _parse_srt(SAMPLE)
    assert len(blocks) == 2
    assert blocks[0]["time"] == "00:00:01,000 --> 00:00:02,000"
    assert blocks[1]["text"] == "See you tomorrow."


def test_render_srt_bilingual_puts_translation_first() -> None:
    """双语输出与原项目一致：译文在上、原文在下。"""
    blocks = _parse_srt(SAMPLE)
    for block in blocks:
        block["origin"] = block["text"]
        block["text"] = "译文"

    rendered = _render_srt(blocks, bilingual=True)
    assert "译文\nHello there." in rendered
    assert rendered.startswith("1\n00:00:01,000 --> 00:00:02,000")


def test_render_srt_single_keeps_translation_only() -> None:
    """仅译文模式不保留原文。"""
    blocks = _parse_srt(SAMPLE)
    for block in blocks:
        block["origin"] = block["text"]
        block["text"] = "译文"

    rendered = _render_srt(blocks, bilingual=False)
    assert "Hello there." not in rendered
    assert rendered.count("译文") == 2


def test_has_cn_token_recognises_chinese_markers() -> None:
    """中文字幕标记要覆盖 zh、zh-en、chi 与中文标题。"""
    for value in ("zh", "chi", "zho", "zh-CN", "zh-en", "简体中文", "中字"):
        assert _has_cn_token(value) is True
    for value in ("eng", "fre", "jpn", "", "und"):
        assert _has_cn_token(value) is False


def test_parse_numbered_requires_every_line() -> None:
    """译文缺行时必须抛错，交给上层二分重试。"""
    assert _parse_numbered("1|你好\n2|再见", 2) == ["你好", "再见"]
    try:
        _parse_numbered("1|你好", 2)
    except ValueError as error:
        assert "缺" in str(error)
    else:  # pragma: no cover - 防御性分支
        raise AssertionError("缺行时应当抛出 ValueError")


def test_pick_source_prefers_english_and_skips_bitmap() -> None:
    """默认选轨优先英文，并跳过图形字幕。"""
    subs = [
        {"index": 1, "lang": "chi", "title": "简体", "codec": "subrip"},
        {"index": 2, "lang": "eng", "title": "English", "codec": "subrip"},
        {"index": 3, "lang": "eng", "title": "PGS", "codec": "hdmv_pgs_subtitle"},
    ]
    assert pick_source(subs)["index"] == 2
    assert pick_source(subs, forced_index=1)["index"] == 1


def test_pick_source_without_non_chinese_track() -> None:
    """只有中文轨时默认不翻，强制模式下才用中文轨。"""
    subs = [{"index": 1, "lang": "chi", "title": "", "codec": "subrip"}]
    assert pick_source(subs)["index"] == 1  # 仍会返回可用轨，由调用方决定是否跳过
    assert pick_source(subs, force=True)["index"] == 1
