import { type Subject, type ErrorType, type DiagnosisResult } from "./engine-types";

type DiagnoseRule = (input: string) => DiagnosisResult;

export const POLITICS_TAXONOMY: Record<string, string> = {
  P1: "knowledge-map location error",
  P2: "principle recall failure",
  P3: "incomplete expression",
  P4: "principle-method mismatch",
  P5: "material recognition error",
};

export const MATH_TAXONOMY: Record<string, string> = {
  K1: "formula/knowledge",
  K2: "problem-type recognition",
  K3: "condition recognition",
  K4: "method selection",
  K5: "key transformation",
  K6: "calculation",
  K7: "question-reading error",
};

const normalize = (text: string) => text.replace(/\s+/g, "").replace(/\n+/g, "");

const containsAny = (text: string, tokens: string[]) => tokens.some((token) => text.includes(token));

const politicsDiagnosis = (studentInput: string): DiagnosisResult => {
  const text = normalize(studentInput);
  const raw = studentInput;

  if (!raw.trim()) {
    return {
      subject: "Politics",
      topic: "联系多样性 vs 矛盾特殊性",
      studentInput: raw,
      errorType: "P3",
      explanation: "空输入通常代表表达未完成，属于不完整表达。",
      methodSelected: false,
      executionError: false,
      correctReasoning: false,
    };
  }

  if (text.includes("联系多样性") && text.includes("矛盾特殊性")) {
    return {
      subject: "Politics",
      topic: "联系多样性 vs 矛盾特殊性",
      studentInput: raw,
      errorType: null,
      explanation: "学生已提到两个目标概念，可继续比较它们的差异并给出判断。",
      methodSelected: true,
      executionError: false,
      correctReasoning: true,
    };
  }

  if (text.includes("矛盾特殊性") && !text.includes("联系多样性")) {
    return {
      subject: "Politics",
      topic: "联系多样性 vs 矛盾特殊性",
      studentInput: raw,
      errorType: "P4",
      explanation: "回答聚焦在“矛盾特殊性”，但题目要求对比“联系多样性”，方法对象选择偏离。",
      methodSelected: false,
      executionError: false,
      correctReasoning: false,
    };
  }

  if (containsAny(text, ["不知道", "不会", "没概念", "不太清楚"])) {
    return {
      subject: "Politics",
      topic: "联系多样性 vs 矛盾特殊性",
      studentInput: raw,
      errorType: "P2",
      explanation: "出现原理回忆性停滞，可能是对基础定义回忆不足。",
      methodSelected: false,
      executionError: false,
      correctReasoning: false,
    };
  }

  if (
    containsAny(text, ["定义", "本质", "关键", "区别"]) &&
    text.includes("联系多样性")
  ) {
    return {
      subject: "Politics",
      topic: "联系多样性 vs 矛盾特殊性",
      studentInput: raw,
      errorType: null,
      explanation: "回答方向正确，已开始触及定义层次。",
      methodSelected: true,
      executionError: false,
      correctReasoning: true,
    };
  }

  if (text.includes("联系") || text.includes("多样性") || text.includes("特殊性")) {
    return {
      subject: "Politics",
      topic: "联系多样性 vs 矛盾特殊性",
      studentInput: raw,
      errorType: "P1",
      explanation: "学生抓到部分关键字，但未明确定位到知识地图中的正确对照关系。",
      methodSelected: false,
      executionError: false,
      correctReasoning: false,
    };
  }

  return {
    subject: "Politics",
    topic: "联系多样性 vs 矛盾特殊性",
    studentInput: raw,
    errorType: "P5",
    explanation: "使用了题目外相关材料，无法直接用于该概念辨析。",
    methodSelected: false,
    executionError: false,
    correctReasoning: false,
  };
};

const mathDiagnosis = (studentInput: string): DiagnosisResult => {
  const text = normalize(studentInput);
  const raw = studentInput;

  if (!raw.trim()) {
    return {
      subject: "Mathematics",
      topic: "line intersects ellipse with Vieta",
      studentInput: raw,
      errorType: "K1",
      explanation: "未动笔展开，无法判断所用公式与知识点。",
      methodSelected: false,
      executionError: false,
      correctReasoning: false,
    };
  }

  if (containsAny(text, ["周长", "面积", "体积", "角度", "切线", "函数图像"])) {
    return {
      subject: "Mathematics",
      topic: "line intersects ellipse with Vieta",
      studentInput: raw,
      errorType: "K7",
      explanation: "问题表述识别偏差，当前回答更像在处理其他题型。",
      methodSelected: false,
      executionError: false,
      correctReasoning: false,
    };
  }

  if (containsAny(text, ["韦达", "Vieta", "vieta", "根的关系", "积"])) {
    if (containsAny(text, ["算错", "=-", "结果是", "=-1", "错误", "错了"])) {
      return {
        subject: "Mathematics",
        topic: "line intersects ellipse with Vieta",
        studentInput: raw,
        errorType: "K6",
        explanation: "已识别了韦达思路，但运算步骤出现误差。",
        methodSelected: true,
        executionError: true,
        correctReasoning: true,
      };
    }

    return {
      subject: "Mathematics",
      topic: "line intersects ellipse with Vieta",
      studentInput: raw,
      errorType: null,
      explanation: "已点出关键思路：先代入得一元二次并用韦达关系。",
      methodSelected: true,
      executionError: false,
      correctReasoning: true,
    };
  }

  if (containsAny(text, ["判别式", "画图", "导数", "几何"])) {
    return {
      subject: "Mathematics",
      topic: "line intersects ellipse with Vieta",
      studentInput: raw,
      errorType: "K4",
      explanation: "未选择到“代入+韦达/根关系”，当前方法不匹配。",
      methodSelected: false,
      executionError: false,
      correctReasoning: false,
    };
  }

  if (
    containsAny(text, ["联立", "代入", "消元"]) &&
    containsAny(text, ["一元", "二次"])
  ) {
    return {
      subject: "Mathematics",
      topic: "line intersects ellipse with Vieta",
      studentInput: raw,
      errorType: "K5",
      explanation: "关键变形方向已接近，但还未转化为可直接用根关系的标准形式。",
      methodSelected: true,
      executionError: false,
      correctReasoning: true,
    };
  }

  if (containsAny(text, ["已知", "设", "条件", "范围"])) {
    return {
      subject: "Mathematics",
      topic: "line intersects ellipse with Vieta",
      studentInput: raw,
      errorType: "K3",
      explanation: "已看到条件线索，但对“‘两交点’所含条件”识别仍不完整。",
      methodSelected: true,
      executionError: false,
      correctReasoning: false,
    };
  }

  return {
    subject: "Mathematics",
    topic: "line intersects ellipse with Vieta",
    studentInput: raw,
    errorType: "K2",
    explanation: "未识别到本题主要问题类型，思路停在普通代数演算。",
    methodSelected: false,
    executionError: false,
    correctReasoning: false,
  };
};

const RULES: Record<string, DiagnoseRule> = {
  politics: politicsDiagnosis,
  math: mathDiagnosis,
  mathematics: mathDiagnosis,
};

export function diagnose(subject: Subject, _topic: string, studentInput: string): DiagnosisResult {
  const key = subject.toLowerCase();
  if (!RULES[key]) {
    return {
      subject,
      topic: _topic,
      studentInput,
      errorType: "P1",
      explanation: `未定义的学科 '${subject}'，默认按定位不足处理。`,
      methodSelected: false,
      executionError: false,
      correctReasoning: false,
    };
  }
  const result = RULES[key](studentInput);
  return { ...result, topic: _topic };
}
