from __future__ import annotations

from typing import Dict

from learning_engine import LearningMode


HINT_LEVELS = {
    0: "no hint",
    1: "scope/model hint",
    2: "key-condition hint",
    3: "condition-to-tool question",
    4: "method-category hint",
    5: "first-step hint",
}


POLITICS_HINTS: Dict[int, str] = {
    0: "不提供直接答案。",
    1: "先回到知识地图：这是一道“同类概念辨析”题，先定位两个概念都属于什么层次？",
    2: "先说出“联系多样性”与“矛盾特殊性”各自的关键条件。",
    3: "你认为哪一个条件最能把这两者分开？（选择后告诉我）",
    4: "只要判断“关系层面的表现”即可：是偏向‘多方向并行’还是‘矛盾转化后特异化’？",
    5: "第一步只写：我先给出“联系多样性”这个概念的定义主语。",
}


MATH_HINTS: Dict[int, str] = {
    0: "不提供直接答案。",
    1: "先确认题型：这是“几何方程变代数”类问题，不是纯代数计算题。",
    2: "先写下“直线代入椭圆后得到什么类型的方程？”",
    3: "得到一元二次方程后，核心条件是？（根的关系/判别式/几何几何）",
    4: "你的工具优先级：先代入形成标准二次方程，再用什么关系式处理两交点信息？",
    5: "第一步：先把直线表达式代入椭圆方程并整理成标准一元二次。",
}


def next_hint_level(previous_level: int, last_outcome_correct: bool) -> int:
    if last_outcome_correct:
        return 0
    if previous_level < 0:
        return 1
    if previous_level >= 5:
        return 5
    return previous_level + 1


def build_hint(
    subject: str,
    topic: str,
    hint_level: int,
    learning_mode: str,
) -> str:
    if hint_level <= 0:
        return ""
    if hint_level not in HINT_LEVELS:
        hint_level = 1

    if learning_mode == LearningMode.TEACHING and hint_level <= 2:
        hint_level = max(1, hint_level)

    if "politic" in topic.lower() or "politics" in subject.lower():
        return POLITICS_HINTS.get(hint_level, POLITICS_HINTS[1])

    if "vieta" in topic.lower() or "ellipse" in topic.lower() or "math" in subject.lower():
        return MATH_HINTS.get(hint_level, MATH_HINTS[1])

    return "先从已知条件出发，说明你下一步准备做什么。"
