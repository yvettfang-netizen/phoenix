from __future__ import annotations

from dataclasses import dataclass

from diagnosis_engine import Diagnosis
from student_model import StudentProfile


class LearningMode:
    TEACHING = "Teaching Mode"
    RECALL = "Recall Mode"
    TRANSFER = "Transfer Mode"
    THINKING = "Thinking Mode"
    DEBUG = "Debug Mode"


@dataclass
class LearningDecision:
    mode: str
    rationale: str


def choose_learning_mode(
    profile: StudentProfile,
    subject: str,
    topic: str,
    diagnosis: Diagnosis,
) -> LearningDecision:
    if profile.is_unknown(subject, topic):
        return LearningDecision(
            mode=LearningMode.TEACHING,
            rationale="未出现该主题的历史解题轨迹，先补齐概念图谱。",
        )

    if profile.is_forgotten(subject, topic):
        return LearningDecision(
            mode=LearningMode.RECALL,
            rationale="有过接触但近期掌握度不稳，先触发记忆召回。",
        )

    if diagnosis.is_correct:
        return LearningDecision(
            mode=LearningMode.TRANSFER,
            rationale="回答已具备核心思路，可继续迁移到完整解答。",
        )

    if diagnosis.execution_error:
        return LearningDecision(
            mode=LearningMode.DEBUG,
            rationale="推理方向正确但执行有误，需要定位计算或代数步骤问题。",
        )

    if not diagnosis.method_selected:
        return LearningDecision(
            mode=LearningMode.THINKING,
            rationale="当前尚未确认可复用的方法路径，需要重新选择方法。",
        )

    if diagnosis.correct_reasoning:
        return LearningDecision(
            mode=LearningMode.TRANSFER,
            rationale="能应用到题目框架，但仍需从概念迁移到步骤。",
        )

    return LearningDecision(
        mode=LearningMode.RECALL,
        rationale="先纠正识别错误，补齐该知识类型的调用方式。",
    )
