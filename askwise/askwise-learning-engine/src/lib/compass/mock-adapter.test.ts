import { describe, expect, it, beforeEach } from "vitest";

import {
  clearMockAdapterState,
  getCompassSession,
  __mockAdapterInternals,
  registerAssessmentMapping,
  registerIdMappings,
  registerStudentMapping,
  startCompassSession,
} from "./mock-adapter";

describe("Compass Mock Adapter - Contract V1.1", () => {
  beforeEach(() => {
    clearMockAdapterState();
  });

  const baseInput = {
    student_id: "stu_david_001",
    assessment_id: "assess_pol_day01",
    subject_focus: "联系多样性 vs 矛盾特殊性",
    learning_bottleneck: "知识地图定位不清",
    priority_issue: "抓概念边界",
    recommended_learning_goal: "先对比两概念差异",
    family_id: "fam_qa_001",
    education_system: "GAOKAO",
    grade_level: "高一",
    source_version: "compass_payload_v0.9.2",
    integration_version: "v1.0",
  };

  it("normal request returns solvable payload and mapping", () => {
    registerIdMappings({
      student_id: baseInput.student_id,
      askwise_student_id: "askwise_student_001",
      assessment_id: baseInput.assessment_id,
      askwise_experiment_id: "askwise_exp_001",
    });

    const result = startCompassSession(baseInput);
    expect(result.status).toBe("created");
    if (result.status === "error") {
      expect.fail("normal request should not error");
    }

    expect(result.askwise_session_id).toMatch(/^sess_\d{4}$/);
    expect(result.student_id).toBe(baseInput.student_id);
    expect(result.assessment_id).toBe(baseInput.assessment_id);
    expect(result.subject).toBe("Politics");
    expect(result.outcome).toBe("in_progress");
    expect(result.hint_count).toBe(0);
    expect(result.retry_count).toBe(0);
    expect(result.integration_version).toBe("v1.0");

    const snapshot = getCompassSession(result.askwise_session_id);
    if (snapshot.status === "error") {
      expect.fail("session should be retrievable");
    }
    expect(snapshot.status).toBe("existing");
    expect(snapshot.idempotency_key.length).toBeGreaterThan(10);
  });

  it("defaults missing integration_version to v1.0", () => {
    const { integration_version, ...withoutVersion } = baseInput;
    registerIdMappings({
      student_id: baseInput.student_id,
      askwise_student_id: "askwise_student_001",
      assessment_id: baseInput.assessment_id,
      askwise_experiment_id: "askwise_exp_001",
    });
    const result = startCompassSession(withoutVersion);
    if (result.status === "error") {
      expect.fail("missing integration_version should pass");
    }
    expect(result.integration_version).toBe("v1.0");
  });

  it("missing required field returns EC_INCOMPLETE_INPUT", () => {
    registerStudentMapping({
      external_student_id: baseInput.student_id,
      askwise_student_id: "askwise_student_001",
    });

    const result = startCompassSession({
      ...baseInput,
      learning_bottleneck: "  ",
    });

    if (result.status === "error") {
      expect(result.error_code).toBe("EC_INCOMPLETE_INPUT");
      expect(__mockAdapterInternals.sessionsById.size).toBe(0);
    } else {
      expect.fail("missing field should fail");
    }
  });

  it("illegal enum returns EC_INVALID_FORMAT", () => {
    registerStudentMapping({
      external_student_id: baseInput.student_id,
      askwise_student_id: "askwise_student_001",
    });

    const result = startCompassSession({
      ...baseInput,
      education_system: "MATHCOUNTS",
    });

    if (result.status === "error") {
      expect(result.error_code).toBe("EC_INVALID_FORMAT");
      expect(__mockAdapterInternals.sessionsById.size).toBe(0);
    } else {
      expect.fail("illegal enum should fail");
    }
  });

  it("validation failure repeated calls do not create session", () => {
    const result1 = startCompassSession({
      ...baseInput,
      education_system: "INVALID_SYS",
    });
    const result2 = startCompassSession({
      ...baseInput,
      education_system: "INVALID_SYS",
    });
    if (result1.status === "error" && result2.status === "error") {
      expect(result1.error_code).toBe("EC_INVALID_FORMAT");
      expect(result2.error_code).toBe("EC_INVALID_FORMAT");
      expect(__mockAdapterInternals.sessionsById.size).toBe(0);
      expect(__mockAdapterInternals.sessionsByIdempotency.size).toBe(0);
    } else {
      expect.fail("validation failures should not create sessions");
    }
  });

  it("repeated request returns same askwise_session_id (idempotency)", () => {
    registerIdMappings({
      student_id: baseInput.student_id,
      askwise_student_id: "askwise_student_001",
      assessment_id: baseInput.assessment_id,
      askwise_experiment_id: "askwise_exp_001",
    });

    const first = startCompassSession(baseInput);
    const second = startCompassSession(baseInput);

    if (first.status === "error" || second.status === "error") {
      expect.fail("idempotent requests should succeed");
    }

    expect(first.status).toBe("created");
    expect(second.status).toBe("existing");
    expect(first.askwise_session_id).toBe(second.askwise_session_id);
    expect(first.idempotency_key).toBe(second.idempotency_key);
  });

  it("student id mapping missing returns EC_IDMAP_MISSING", () => {
    registerAssessmentMapping({
      external_assessment_id: baseInput.assessment_id,
      askwise_experiment_id: "askwise_exp_001",
    });

    const result = startCompassSession(baseInput);
    if (result.status === "error") {
      expect(result.error_code).toBe("EC_IDMAP_MISSING");
      expect(result.missing_mapping_field).toBe("student_id");
      expect(__mockAdapterInternals.sessionsById.size).toBe(0);
    } else {
      expect.fail("missing student mapping should fail");
    }
  });

  it("assessment id mapping missing returns EC_IDMAP_MISSING", () => {
    registerStudentMapping({
      external_student_id: baseInput.student_id,
      askwise_student_id: "askwise_student_001",
    });

    const result = startCompassSession(baseInput);
    if (result.status === "error") {
      expect(result.error_code).toBe("EC_IDMAP_MISSING");
      expect(result.missing_mapping_field).toBe("assessment_id");
      expect(__mockAdapterInternals.sessionsById.size).toBe(0);
    } else {
      expect.fail("missing assessment mapping should fail");
    }
  });

  it("version incompatible returns EC_VERSION_MISMATCH", () => {
    registerIdMappings({
      student_id: baseInput.student_id,
      askwise_student_id: "askwise_student_001",
      assessment_id: baseInput.assessment_id,
      askwise_experiment_id: "askwise_exp_001",
    });

    const result = startCompassSession({
      ...baseInput,
      integration_version: "v0.9",
    });

    if (result.status === "error") {
      expect(result.error_code).toBe("EC_VERSION_MISMATCH");
      expect(__mockAdapterInternals.sessionsById.size).toBe(0);
    } else {
      expect.fail("version mismatch should fail");
    }
  });

  it("get unknown askwise_session_id returns EC_SESSION_NOT_FOUND", () => {
    const result = getCompassSession("sess_unknown_0001");
    if (result.status === "error") {
      expect(result.error_code).toBe("EC_SESSION_NOT_FOUND");
    } else {
      expect.fail("unknown session should fail");
    }
  });
});
