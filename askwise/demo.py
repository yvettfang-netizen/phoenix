from __future__ import annotations

import argparse
import time
from dataclasses import dataclass

from diagnosis_engine import Diagnosis, diagnose
from learning_engine import LearningMode, choose_learning_mode
from agent_policy import build_hint, next_hint_level
from session_log import SessionLog
from student_model import StudentProfile


@dataclass
class StepResult:
    attempt: int
    student_input: str
    diagnosis: Diagnosis
    learning_mode: str
    hint_level: int
    hint: str | None
    outcome: str
    first_step_time: float | None


SCENARIOS = {
    "politics": {
        "subject": "Politics",
        "topic": "联系多样性 vs 矛盾特殊性",
        "topic_key": "politics:联系多样性 vs 矛盾特殊性",
        "prompt": (
            "A. 联系多样性与矛盾特殊性都属于统一性框架中的概念，\n"
            "请先说出它们的关键区别点（请不要给完整答案，先给出你的第一步）。"
        ),
        "max_attempts": 6,
    },
    "math": {
        "subject": "Mathematics",
        "topic": "line intersects ellipse with Vieta",
        "topic_key": "math:line-intersects-ellipse-vieta",
        "prompt": (
            "B. 某条直线与椭圆有两个交点，如何快速判断并设出两点和相关关系？\n"
            "请先写出你准备做的第一步（请不要给完整答案）。"
        ),
        "max_attempts": 6,
    },
}


def _subject_display(subject: str, topic: str) -> str:
    return f"\n=== {subject}: {topic} ==="


def _print_learning_status(profile: StudentProfile, subject: str, topic: str) -> None:
    label = profile.knowledge_label(subject, topic)
    deps = profile.get_hint_dependencies(f"{subject.lower()}:{topic.lower()}")
    if not deps:
        topic_key = f"{subject}:{topic}"
        deps = profile.get_hint_dependencies(topic_key)
    dep_text = "，".join(deps) if deps else "未设置"
    print(f"[知识状态] {label} | 已知依赖提示: {dep_text}")


def run_demo_flow(
    profile: StudentProfile,
    logger: SessionLog,
    scenario_key: str,
) -> None:
    scenario = SCENARIOS[scenario_key]
    subject = scenario["subject"]
    topic = scenario["topic"]
    topic_key = scenario["topic_key"]

    print(_subject_display(subject, topic))
    print(scenario["prompt"])
    _print_learning_status(profile, subject, topic)

    hint_level = 0
    start = time.perf_counter()

    for attempt in range(1, int(scenario["max_attempts"]) + 1):
        raw = input(f"\n第{attempt}步（输入你的思考）：").strip()
        first_step_time = None
        if attempt == 1:
            first_step_time = time.perf_counter() - start

        diagnosis = diagnose(subject, topic, raw)
        if diagnosis.is_correct:
            mode = choose_learning_mode(profile, subject, topic, diagnosis)
            profile.update_after_interaction(
                subject,
                topic,
                correct=True,
                first_step_time=first_step_time,
            )
            logger.append(
                subject=subject,
                topic=topic,
                student_input=raw,
                diagnosis=diagnosis.explanation,
                error_type="OK",
                learning_mode=mode.mode,
                hint_level=hint_level,
                first_step_time=first_step_time,
                outcome="correct",
            )
            print("很好，你已建立正确方法路径。继续补齐完整解答即可。")
            return

        mode = choose_learning_mode(profile, subject, topic, diagnosis)
        profile.update_after_interaction(
            subject, topic, correct=False, first_step_time=first_step_time
        )

        hint_level = next_hint_level(hint_level, last_outcome_correct=False)
        hint = build_hint(subject, topic_key, hint_level, mode.mode)
        logger.append(
            subject=subject,
            topic=topic,
            student_input=raw,
            diagnosis=diagnosis.explanation,
            error_type=diagnosis.error_type or "UNKNOWN",
            learning_mode=mode.mode,
            hint_level=hint_level,
            first_step_time=first_step_time,
            outcome="incorrect",
        )

        print(f"\n诊断: [{diagnosis.error_type}] {diagnosis.explanation}")
        print(f"学习模式: {mode.mode} | 下一步提示级别: {hint_level}")
        print(f"引导问题: {hint}")

    print("\n本次演示达到上限：先停在这里，不给完整答案，留到下一轮再接续。")


def run_scripted_demo(
    profile: StudentProfile,
    logger: SessionLog,
    scenario_key: str,
    steps: list[str],
    max_attempts: int | None = None,
) -> list[StepResult]:
    scenario = SCENARIOS[scenario_key]
    subject = scenario["subject"]
    topic = scenario["topic"]
    topic_key = scenario["topic_key"]
    attempts = max_attempts or int(scenario["max_attempts"])
    hint_level = 0
    start = time.perf_counter()

    records: list[StepResult] = []
    for idx, raw in enumerate(steps[:attempts], start=1):
        raw = raw.strip()
        first_step_time = (time.perf_counter() - start) if idx == 1 else None

        diagnosis = diagnose(subject, topic, raw)
        if diagnosis.is_correct:
            mode = choose_learning_mode(profile, subject, topic, diagnosis)
            profile.update_after_interaction(
                subject,
                topic,
                correct=True,
                first_step_time=first_step_time,
            )
            logger.append(
                subject=subject,
                topic=topic,
                student_input=raw,
                diagnosis=diagnosis.explanation,
                error_type="OK",
                learning_mode=mode.mode,
                hint_level=hint_level,
                first_step_time=first_step_time,
                outcome="correct",
            )
            records.append(
                StepResult(
                    attempt=idx,
                    student_input=raw,
                    diagnosis=diagnosis,
                    learning_mode=mode.mode,
                    hint_level=hint_level,
                    hint=None,
                    outcome="correct",
                    first_step_time=first_step_time,
                )
            )
            break

        mode = choose_learning_mode(profile, subject, topic, diagnosis)
        profile.update_after_interaction(
            subject, topic, correct=False, first_step_time=first_step_time
        )
        hint_level = next_hint_level(hint_level, last_outcome_correct=False)
        hint = build_hint(subject, topic_key, hint_level, mode.mode)

        logger.append(
            subject=subject,
            topic=topic,
            student_input=raw,
            diagnosis=diagnosis.explanation,
            error_type=diagnosis.error_type or "UNKNOWN",
            learning_mode=mode.mode,
            hint_level=hint_level,
            first_step_time=first_step_time,
            outcome="incorrect",
        )
        records.append(
            StepResult(
                attempt=idx,
                student_input=raw,
                diagnosis=diagnosis,
                learning_mode=mode.mode,
                hint_level=hint_level,
                hint=hint,
                outcome="incorrect",
                first_step_time=first_step_time,
            )
        )

    return records


def parse_args():
    parser = argparse.ArgumentParser(description="ASKWISE Prototype V0.1")
    parser.add_argument(
        "--flow",
        choices=["politics", "math", "both"],
        default="both",
        help="Run one or both demo flows.",
    )
    parser.add_argument(
        "--log",
        default="askwise_session_log.json",
        help="Session log JSON path.",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    profile = StudentProfile(name="David")
    logger = SessionLog(args.log)

    print("ASKWISE Prototype V0.1")
    print("Core principle: Diagnose First. Answer Later.")

    flows = (
        [args.flow]
        if args.flow in SCENARIOS
        else ["politics", "math"]
    )

    for flow_key in flows:
        run_demo_flow(profile, logger, flow_key)

    print("\nDemo complete. 互动记录已写入:", args.log)


if __name__ == "__main__":
    main()
