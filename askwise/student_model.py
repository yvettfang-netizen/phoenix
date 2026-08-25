from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List


MAX_FIRST_STEP_SAMPLES = 10


@dataclass
class TopicKnowledge:
    attempts: int = 0
    correct_count: int = 0
    last_outcome_correct: bool | None = None
    first_step_times: List[float] = field(default_factory=list)
    updated_at: str | None = None

    def record_attempt(self, correct: bool) -> None:
        self.attempts += 1
        if correct:
            self.correct_count += 1
        self.last_outcome_correct = correct
        self.updated_at = datetime.now().isoformat()

    def add_first_step_time(self, seconds: float) -> None:
        self.first_step_times.append(seconds)
        if len(self.first_step_times) > MAX_FIRST_STEP_SAMPLES:
            self.first_step_times.pop(0)

    @property
    def accuracy(self) -> float:
        if self.attempts == 0:
            return 0.0
        return self.correct_count / self.attempts

    @property
    def mastery(self) -> float:
        if self.attempts == 0:
            return 0.0
        recency_boost = 0.0 if self.last_outcome_correct is None else 0.1
        if self.last_outcome_correct:
            recency_boost = 0.2
        return max(0.0, min(1.0, self.accuracy * 0.75 + recency_boost))

    @property
    def avg_first_step_time(self) -> float | None:
        if not self.first_step_times:
            return None
        return sum(self.first_step_times) / len(self.first_step_times)


class StudentProfile:
    def __init__(self, name: str = "David") -> None:
        self.name = name
        self.subject_strengths: Dict[str, float] = {}
        self.subject_weaknesses: Dict[str, float] = {}
        self.knowledge_state: Dict[str, Dict[str, TopicKnowledge]] = {}
        self.hint_dependency: Dict[str, List[str]] = {}
        self.first_step_time_history: Dict[str, List[float]] = {}

        self.hint_dependency["politics:联系多样性 vs 矛盾特殊性"] = [
            "概念辨别",
            "概念关系判断",
        ]
        self.hint_dependency["math:line-intersects-ellipse-vieta"] = [
            "二次方程标准形式",
            "代入与根的关系",
        ]

    def _ensure_state(self, subject: str, topic: str) -> TopicKnowledge:
        if subject not in self.knowledge_state:
            self.knowledge_state[subject] = {}
        if topic not in self.knowledge_state[subject]:
            self.knowledge_state[subject][topic] = TopicKnowledge()
        return self.knowledge_state[subject][topic]

    def record_first_step(self, subject: str, topic: str, seconds: float) -> None:
        key = f"{subject}:{topic}"
        if key not in self.first_step_time_history:
            self.first_step_time_history[key] = []
        self.first_step_time_history[key].append(seconds)
        if len(self.first_step_time_history[key]) > MAX_FIRST_STEP_SAMPLES:
            self.first_step_time_history[key].pop(0)
        self._ensure_state(subject, topic).add_first_step_time(seconds)

    def get_first_step_history(self, subject: str, topic: str) -> List[float]:
        return self._ensure_state(subject, topic).first_step_times.copy()

    def topic_mastery(self, subject: str, topic: str) -> float:
        return self._ensure_state(subject, topic).mastery

    def is_unknown(self, subject: str, topic: str) -> bool:
        return self._ensure_state(subject, topic).attempts == 0

    def is_forgotten(self, subject: str, topic: str) -> bool:
        state = self._ensure_state(subject, topic)
        if state.attempts == 0:
            return False
        return state.mastery < 0.45

    def knowledge_label(self, subject: str, topic: str) -> str:
        if self.is_unknown(subject, topic):
            return "unknown"
        if self.is_forgotten(subject, topic):
            return "forgotten"
        if self._ensure_state(subject, topic).mastery >= 0.8:
            return "proficient"
        return "known"

    def add_hint_dependency(self, topic_key: str, prerequisite: str) -> None:
        self.hint_dependency.setdefault(topic_key, [])
        if prerequisite not in self.hint_dependency[topic_key]:
            self.hint_dependency[topic_key].append(prerequisite)

    def get_hint_dependencies(self, topic_key: str) -> List[str]:
        return self.hint_dependency.get(topic_key, [])

    def _adjust_subject_profile(self, subject: str, correct: bool) -> None:
        curr_strength = self.subject_strengths.get(subject, 0.5)
        curr_weakness = self.subject_weaknesses.get(subject, 0.5)
        if correct:
            self.subject_strengths[subject] = min(1.0, curr_strength + 0.08)
            self.subject_weaknesses[subject] = max(0.0, curr_weakness - 0.08)
        else:
            self.subject_strengths[subject] = max(0.0, curr_strength - 0.05)
            self.subject_weaknesses[subject] = min(1.0, curr_weakness + 0.06)

    def update_after_interaction(
        self,
        subject: str,
        topic: str,
        correct: bool,
        first_step_time: float | None = None,
    ) -> None:
        state = self._ensure_state(subject, topic)
        state.record_attempt(correct)
        if first_step_time is not None:
            self.record_first_step(subject, topic, first_step_time)
        self._adjust_subject_profile(subject, correct)
