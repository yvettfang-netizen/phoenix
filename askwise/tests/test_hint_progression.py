from agent_policy import next_hint_level


def test_hint_progression_increases_step_by_step():
    assert next_hint_level(0, False) == 1
    assert next_hint_level(1, False) == 2
    assert next_hint_level(2, False) == 3
    assert next_hint_level(3, False) == 4
    assert next_hint_level(4, False) == 5


def test_hint_progression_caps_at_5():
    assert next_hint_level(5, False) == 5


def test_hint_reset_to_zero_when_correct():
    assert next_hint_level(5, True) == 0
    assert next_hint_level(2, True) == 0
