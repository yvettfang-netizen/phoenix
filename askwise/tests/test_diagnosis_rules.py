from diagnosis_engine import diagnose


def test_politics_wrong_concept_maps_to_p4():
    d = diagnose("Politics", "联系多样性 vs 矛盾特殊性", "我想用矛盾特殊性来解释")
    assert d.error_type == "P4"


def test_politics_incomplete_expression_maps_to_p3():
    d = diagnose("Politics", "联系多样性 vs 矛盾特殊性", "")
    assert d.error_type == "P3"


def test_math_recognizes_vieta_path():
    d = diagnose("Math", "line intersects ellipse with Vieta", "我先把直线代入椭圆方程并用韦达")
    assert d.error_type is None


def test_math_method_mismatch_maps_to_k4():
    d = diagnose("Math", "line intersects ellipse with Vieta", "先用判别式判断是否有交点")
    assert d.error_type == "K4"
