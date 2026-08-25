import json
from pathlib import Path

import pytest

from agent_policy import HINT_LEVELS, build_hint
from diagnosis_engine import POLITICS_TAXONOMY, MATH_TAXONOMY, diagnose
from learning_engine import (
    LearningMode,
    choose_learning_mode,
)
from student_model import StudentProfile


def test_politics_error_taxonomy_complete():
    subject = "Politics"
    topic = "联系多样性 vs 矛盾特殊性"
    cases = {
        "P1": "这个题目里有“联系”概念",
        "P2": "我不知道这两个概念怎么讲",
        "P3": "",
        "P4": "我只会用矛盾特殊性回答",
        "P5": "我先想下政治制度的背景",
    }
    for expected, student_input in cases.items():
        d = diagnose(subject, topic, student_input)
        assert d.error_type == expected, f"{expected} expected but got {d.error_type}"
    # sanity check taxonomy completeness
    assert set(POLITICS_TAXONOMY.keys()) == {"P1", "P2", "P3", "P4", "P5"}


def test_math_error_taxonomy_complete():
    subject = "Math"
    topic = "line intersects ellipse with Vieta"
    cases = {
        "K1": "",
        "K2": "这题看起来像普通方程，我先整理",
        "K3": "已知有两个交点，设直线与椭圆交点坐标",
        "K4": "先用判别式判断是否有交点",
        "K5": "用联立代入去消元，得到一元二次",
        "K6": "我用韦达公式了，算错了",
        "K7": "先做函数图像比较",
    }
    for expected, student_input in cases.items():
        d = diagnose(subject, topic, student_input)
        assert d.error_type == expected, f"{expected} expected but got {d.error_type}"
    assert set(MATH_TAXONOMY.keys()) == {"K1", "K2", "K3", "K4", "K5", "K6", "K7"}


def test_learning_mode_selection_covers_all_five_modes():
    politics_topic = "联系多样性 vs 知识差异"
    math_topic = "line intersects ellipse with Vieta"

    teach_profile = StudentProfile()
    teach_d = diagnose("Politics", politics_topic, "")
    assert choose_learning_mode(teach_profile, "Politics", politics_topic, teach_d).mode == LearningMode.TEACHING

    recall_profile = StudentProfile()
    recall_profile.update_after_interaction("Politics", politics_topic, correct=False)
    recall_d = diagnose("Politics", politics_topic, "")
    assert choose_learning_mode(recall_profile, "Politics", politics_topic, recall_d).mode == LearningMode.RECALL

    transfer_profile = StudentProfile()
    transfer_profile.update_after_interaction("Math", math_topic, correct=True)
    transfer_d = diagnose("Math", math_topic, "我先把直线代入椭圆方程并用韦达")
    assert choose_learning_mode(transfer_profile, "Math", math_topic, transfer_d).mode == LearningMode.TRANSFER

    thinking_profile = StudentProfile()
    thinking_profile.update_after_interaction("Politics", politics_topic, correct=True)
    thinking_d = diagnose("Politics", politics_topic, "我想到联系")
    assert choose_learning_mode(thinking_profile, "Politics", politics_topic, thinking_d).mode == LearningMode.THINKING

    debug_profile = StudentProfile()
    debug_profile.update_after_interaction("Math", math_topic, correct=True)
    debug_d = diagnose("Math", math_topic, "我用韦达求根，但算错了")
    assert choose_learning_mode(debug_profile, "Math", math_topic, debug_d).mode == LearningMode.DEBUG


def test_hint_progression_and_labels():
    for level in range(0, 6):
        assert level in HINT_LEVELS


@pytest.mark.parametrize("level", range(1, 6))
def test_early_hints_do_not_reveal_full_answer(level):
    banned_phrase = [
        "完整答案",
        "直接答案",
        "答案是",
        "最终结果是",
        "根即为",
    ]
    for subject, topic in [
        ("Politics", "politics:联系多样性 vs 矛盾特殊性"),
        ("Mathematics", "math:line-intersects-ellipse-vieta"),
    ]:
        hint = build_hint(subject, topic, level, LearningMode.RECALL)
        assert hint not in ("", None)
        assert all(token not in hint for token in banned_phrase)


def test_hint_level_zero_is_no_hint():
    for subject, topic in [
        ("Politics", "politics:联系多样性 vs 矛盾特殊性"),
        ("Mathematics", "math:line-intersects-ellipse-vieta"),
    ]:
        assert build_hint(subject, topic, 0, LearningMode.RECALL) == ""


def test_session_log_contains_all_required_fields(tmp_path: Path):
    from session_log import SessionLog

    log_path = tmp_path / "acceptance_session_log.json"
    logger = SessionLog(str(log_path))
    logger.append(
        subject="Math",
        topic="line intersects ellipse with Vieta",
        student_input="我先代入并用韦达",
        diagnosis="已点出核心思路",
        error_type="OK",
        learning_mode="Transfer Mode",
        hint_level=1,
        outcome="correct",
        first_step_time=1.2,
    )

    with log_path.open(encoding="utf-8") as f:
        rows = json.load(f)
    assert len(rows) == 1
    row = rows[0]
    for key in [
        "timestamp",
        "subject",
        "topic",
        "student_input",
        "diagnosis",
        "error_type",
        "learning_mode",
        "hint_level",
        "first_step_time",
        "outcome",
    ]:
        assert key in row
