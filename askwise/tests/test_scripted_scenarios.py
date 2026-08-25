from demo import run_scripted_demo
from session_log import SessionLog
from student_model import StudentProfile
import json


def _run_profile_case(tmp_path, scenario_key, steps, prefill_correct: bool = False):
    profile = StudentProfile(name="David")
    if prefill_correct:
        topic = (
            "联系多样性 vs 矛盾特殊性"
            if scenario_key == "politics"
            else "line intersects ellipse with Vieta"
        )
        subject = "Politics" if scenario_key == "politics" else "Mathematics"
        profile.update_after_interaction(subject, topic, correct=True)

    log_path = tmp_path / f"{scenario_key}_scripted_log.json"
    logger = SessionLog(str(log_path))
    turns = run_scripted_demo(profile, logger, scenario_key, steps)
    return profile, logger, turns


def test_scripted_case_correct_answer(tmp_path):
    _, logger, turns = _run_profile_case(
        tmp_path=tmp_path,
        scenario_key="politics",
        steps=["包含联系多样性和矛盾特殊性，我先对比它们的关键条件。"],
    )

    assert len(turns) == 1
    assert turns[0].outcome == "correct"
    with logger.path.open(encoding="utf-8") as f:
        rows = json.load(f)
    assert rows[-1]["outcome"] == "correct"


def test_scripted_case_partial_answer(tmp_path):
    _, _, turns = _run_profile_case(
        tmp_path=tmp_path,
        scenario_key="math",
        steps=["我先写一些关系", "用联立得到一元方程并继续"],
        prefill_correct=True,
    )

    assert turns[0].outcome == "incorrect"
    assert turns[0].learning_mode == "Thinking Mode"
    assert turns[0].hint_level == 1


def test_scripted_case_unknown_answer(tmp_path):
    _, _, turns = _run_profile_case(
        tmp_path=tmp_path,
        scenario_key="politics",
        steps=[""],
    )

    assert turns[0].outcome == "incorrect"
    assert turns[0].learning_mode == "Teaching Mode"


def test_scripted_case_repeated_failure(tmp_path):
    _, _, turns = _run_profile_case(
        tmp_path=tmp_path,
        scenario_key="math",
        steps=["", "", "", ""],
    )

    assert [t.hint_level for t in turns] == [1, 2, 3, 4]
    assert turns[-1].hint is not None
    assert turns[-1].outcome == "incorrect"


def test_scripted_case_execution_error_with_correct_reasoning(tmp_path):
    profile = StudentProfile(name="David")
    logger = SessionLog(str(tmp_path / "math_exec_error.json"))
    profile.update_after_interaction("Mathematics", "line intersects ellipse with Vieta", correct=True)

    turns = run_scripted_demo(
        profile=profile,
        logger=logger,
        scenario_key="math",
        steps=["我先代入并用韦达，结果算错了。"],
    )

    assert turns[0].outcome == "incorrect"
    assert turns[0].learning_mode == "Debug Mode"
    assert turns[0].hint_level >= 1
