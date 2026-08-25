from __future__ import annotations

from dataclasses import dataclass
from typing import Callable


POLITICS_TAXONOMY = {
    "P1": "knowledge-map location error",
    "P2": "principle recall failure",
    "P3": "incomplete expression",
    "P4": "principle-method mismatch",
    "P5": "material recognition error",
}

MATH_TAXONOMY = {
    "K1": "formula/knowledge",
    "K2": "problem-type recognition",
    "K3": "condition recognition",
    "K4": "method selection",
    "K5": "key transformation",
    "K6": "calculation",
    "K7": "question-reading error",
}


@dataclass
class Diagnosis:
    subject: str
    topic: str
    student_input: str
    error_type: str | None
    explanation: str
    method_selected: bool = False
    execution_error: bool = False
    correct_reasoning: bool = False

    @property
    def is_correct(self) -> bool:
        return self.error_type is None


def _normalize(text: str) -> str:
    return text.replace(" ", "").replace("\n", "")


def _contains_any(text: str, keywords: list[str]) -> bool:
    return any(token in text for token in keywords)


def _diagnose_politics(student_input: str) -> Diagnosis:
    text = _normalize(student_input)

    if not text:
        return Diagnosis(
            subject="Politics",
            topic="联系多样性 vs 矛盾特殊性",
            student_input=student_input,
            error_type="P3",
            explanation="空输入通常代表表达未完成，属于不完整表达。",
            method_selected=False,
            execution_error=False,
            correct_reasoning=False,
        )

    if _contains_any(text, ["联系多样性"]) and _contains_any(text, ["矛盾特殊性"]):
        return Diagnosis(
            subject="Politics",
            topic="联系多样性 vs 矛盾特殊性",
            student_input=student_input,
            error_type=None,
            explanation="学生已提到两个目标概念，可继续比较它们的差异并给出判断。",
            method_selected=True,
            execution_error=False,
            correct_reasoning=True,
        )

    if "矛盾特殊性" in text and "联系多样性" not in text:
        return Diagnosis(
            subject="Politics",
            topic="联系多样性 vs 矛盾特殊性",
            student_input=student_input,
            error_type="P4",
            explanation="回答聚焦在“矛盾特殊性”，但题目要求对比“联系多样性”，方法对象选择偏离。",
            method_selected=False,
            execution_error=False,
            correct_reasoning=False,
        )

    if _contains_any(text, ["不知道", "不会", "没概念", "不太清楚"]):
        return Diagnosis(
            subject="Politics",
            topic="联系多样性 vs 矛盾特殊性",
            student_input=student_input,
            error_type="P2",
            explanation="出现原理回忆性停滞，可能是对基础定义回忆不足。",
            method_selected=False,
            execution_error=False,
            correct_reasoning=False,
        )

    if _contains_any(text, ["定义", "本质", "关键", "区别"]) and "联系多样性" in text:
        return Diagnosis(
            subject="Politics",
            topic="联系多样性 vs 矛盾特殊性",
            student_input=student_input,
            error_type=None,
            explanation="回答方向正确，已开始触及定义层次。",
            method_selected=True,
            execution_error=False,
            correct_reasoning=True,
        )

    if "联系" in text or "多样性" in text or "特殊性" in text:
        return Diagnosis(
            subject="Politics",
            topic="联系多样性 vs 矛盾特殊性",
            student_input=student_input,
            error_type="P1",
            explanation="学生抓到部分关键字，但未明确定位到知识地图中的正确对照关系。",
            method_selected=False,
            execution_error=False,
            correct_reasoning=False,
        )

    return Diagnosis(
        subject="Politics",
        topic="联系多样性 vs 矛盾特殊性",
        student_input=student_input,
        error_type="P5",
        explanation="使用了题目外相关材料，无法直接用于该概念辨析。",
        method_selected=False,
        execution_error=False,
        correct_reasoning=False,
    )


def _diagnose_math(student_input: str) -> Diagnosis:
    text = _normalize(student_input)

    if not text:
        return Diagnosis(
            subject="Mathematics",
            topic="line intersects ellipse with Vieta",
            student_input=student_input,
            error_type="K1",
            explanation="未动笔展开，无法判断所用公式与知识点。",
            method_selected=False,
            execution_error=False,
            correct_reasoning=False,
        )

    if _contains_any(text, ["周长", "面积", "体积", "角度", "切线", "函数图像"]):
        return Diagnosis(
            subject="Mathematics",
            topic="line intersects ellipse with Vieta",
            student_input=student_input,
            error_type="K7",
            explanation="问题表述识别偏差，当前回答更像在处理其他题型。",
            method_selected=False,
            execution_error=False,
            correct_reasoning=False,
        )

    if _contains_any(text, ["韦达", "Vieta", "vieta", "根的关系", "积"]):
        # correct method identified
        if _contains_any(text, ["算错", "=-", "结果是", "=-1", "错误", "错了"]):
            return Diagnosis(
                subject="Mathematics",
                topic="line intersects ellipse with Vieta",
                student_input=student_input,
                error_type="K6",
                explanation="已识别了韦达思路，但运算步骤出现误差。",
                method_selected=True,
                execution_error=True,
                correct_reasoning=True,
            )
        return Diagnosis(
            subject="Mathematics",
            topic="line intersects ellipse with Vieta",
            student_input=student_input,
            error_type=None,
            explanation="已点出关键思路：先代入得一元二次并用韦达关系。",
            method_selected=True,
            execution_error=False,
            correct_reasoning=True,
        )

    if _contains_any(text, ["判别式", "画图", "导数", "几何"]):
        return Diagnosis(
            subject="Mathematics",
            topic="line intersects ellipse with Vieta",
            student_input=student_input,
            error_type="K4",
            explanation="未选择到“代入+韦达/根关系”，当前方法不匹配。",
            method_selected=False,
            execution_error=False,
            correct_reasoning=False,
        )

    if _contains_any(text, ["联立", "代入", "消元"]) and _contains_any(
        text, ["一元", "二次"]
    ):
        return Diagnosis(
            subject="Mathematics",
            topic="line intersects ellipse with Vieta",
            student_input=student_input,
            error_type="K5",
            explanation="关键变形方向已接近，但还未转化为可直接用根关系的标准形式。",
            method_selected=True,
            execution_error=False,
            correct_reasoning=True,
        )

    if _contains_any(text, ["已知", "设", "条件", "范围"]):
        return Diagnosis(
            subject="Mathematics",
            topic="line intersects ellipse with Vieta",
            student_input=student_input,
            error_type="K3",
            explanation="已看到条件线索，但对“‘两交点’所含条件”识别仍不完整。",
            method_selected=True,
            execution_error=False,
            correct_reasoning=False,
        )

    return Diagnosis(
        subject="Mathematics",
        topic="line intersects ellipse with Vieta",
        student_input=student_input,
        error_type="K2",
        explanation="未识别到本题主要问题类型，思路停在普通代数演算。",
        method_selected=False,
        execution_error=False,
        correct_reasoning=False,
    )


RULES: dict[str, Callable[[str], Diagnosis]] = {
    "politics": _diagnose_politics,
    "math": _diagnose_math,
}


def diagnose(subject: str, topic: str, student_input: str) -> Diagnosis:
    key = subject.strip().lower()
    if key not in RULES:
        return Diagnosis(
            subject=subject,
            topic=topic,
            student_input=student_input,
            error_type="P1",
            explanation=f"未定义的学科 '{subject}'，默认按定位不足处理。",
            method_selected=False,
            execution_error=False,
            correct_reasoning=False,
        )
    d = RULES[key](student_input)
    d.topic = topic
    return d
