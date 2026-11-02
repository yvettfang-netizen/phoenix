import { redirect } from "next/navigation";

import CardShell from "@/components/ui/card-shell";
import AskwiseButton from "@/components/ui/button";
import { runAdvisorAssessment } from "@/lib/advisor/advisor-engine";
import type { AdvisorCaseDomain, AdvisorCaseInput } from "@/lib/advisor/advisor-types";
import { getLatestAdvisorAssessment, saveAdvisorAssessment } from "@/lib/db";

function lines(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function evidenceLines(value: FormDataEntryValue | null) {
  return lines(value).map((line) => {
    const [field = "", evidenceValue = "", source = ""] = line.split("|").map((item) => item.trim());
    return { field, value: evidenceValue, source };
  });
}

export default function AdvisorPage({ searchParams }: { searchParams?: { caseId?: string } }) {
  const stored = searchParams?.caseId ? getLatestAdvisorAssessment(searchParams.caseId) : null;

  async function submitAdvisorCase(formData: FormData) {
    "use server";
    const input: AdvisorCaseInput = {
      caseId: String(formData.get("caseId") || "").trim(),
      studentStage: String(formData.get("studentStage") || ""),
      currentEducationBackground: String(formData.get("currentEducationBackground") || ""),
      identityOrRegionContext: String(formData.get("identityOrRegionContext") || ""),
      academicEvidence: evidenceLines(formData.get("academicEvidence")),
      familyGoal: String(formData.get("familyGoal") || ""),
      constraints: String(formData.get("constraints") || ""),
      knownRisks: lines(formData.get("knownRisks")),
      currentJudgementQuestion: String(formData.get("currentJudgementQuestion") || ""),
      informationSources: lines(formData.get("informationSources")),
      advisorConfirmationStatus: String(formData.get("advisorConfirmationStatus") || "not_confirmed") as AdvisorCaseInput["advisorConfirmationStatus"],
      domains: [String(formData.get("domain") || "general") as AdvisorCaseDomain],
      sourceSystem: "askwise_internal",
      sourceVersion: "v1.1-candidate",
    };
    const assessment = runAdvisorAssessment(input);
    saveAdvisorAssessment(input, assessment);
    redirect(`/advisor?caseId=${encodeURIComponent(input.caseId)}`);
  }

  const output = stored?.assessment;

  return (
    <div className="grid">
      <h1>Internal Advisor Case Intake</h1>
      <CardShell
        title="Evidence first, preliminary judgment second"
        description="Use anonymous case IDs only. ASKWISE records an internal, rule-traceable assessment and never produces a final family-facing outcome."
      >
        <form action={submitAdvisorCase}>
          <label>Anonymous Case ID</label>
          <input name="caseId" required placeholder="case_anon_001" />

          <label>Student Stage</label>
          <input name="studentStage" required placeholder="e.g. Grade 10" />

          <label>Current Education Background</label>
          <textarea name="currentEducationBackground" rows={2} required />

          <label>Identity or Region Context</label>
          <textarea name="identityOrRegionContext" rows={2} required />

          <label>Academic Evidence</label>
          <textarea name="academicEvidence" rows={3} required placeholder="field | value | source&#10;mathematics_result | term assessment 78/100 | school report excerpt" />

          <label>Family Goal</label>
          <textarea name="familyGoal" rows={2} required />

          <label>Budget or Time Constraints</label>
          <textarea name="constraints" rows={2} required />

          <label>Known Risks (one per line; write “none reported” when applicable)</label>
          <textarea name="knownRisks" rows={2} />

          <label>Current Judgment Question</label>
          <textarea name="currentJudgementQuestion" rows={2} required />

          <label>Information Sources (one per line)</label>
          <textarea name="informationSources" rows={2} required />

          <label>Case Domain</label>
          <select name="domain" defaultValue="general">
            <option value="general">General internal planning</option>
            <option value="identity_pathway">Identity / region pathway</option>
            <option value="education_pathway">Education pathway</option>
            <option value="school_selection">School selection</option>
            <option value="long_term_planning">Long-term planning</option>
            <option value="family_complexity">Complex family case</option>
            <option value="learning_support">Learning Support handoff</option>
          </select>

          <label>Advisor Confirmation Status</label>
          <select name="advisorConfirmationStatus" defaultValue="not_confirmed">
            <option value="not_confirmed">Not yet confirmed</option>
            <option value="confirmed">Confirmed</option>
            <option value="rejected">Rejected</option>
          </select>

          <AskwiseButton type="submit" variant="primary">
            Check Case and Generate Internal Assessment
          </AskwiseButton>
        </form>
      </CardShell>

      {output ? (
        <CardShell title={`Assessment: ${output.caseId}`} description={`Status: ${output.status}`}>
          <p><strong>Preliminary judgment:</strong> {output.preliminaryJudgement ?? "Not generated until evidence gaps or conflicts are resolved."}</p>
          <p><strong>Human confirmation:</strong> {output.requiresHumanConfirmation ? "Required" : "Not required"}</p>
          <h3>Confirmed facts</h3>
          <ul>{output.confirmedFacts.map((item) => <li key={item}>{item}</li>)}</ul>
          <h3>Missing information</h3>
          <ul>{output.missingInformation.length ? output.missingInformation.map((item) => <li key={item}>{item}</li>) : <li>None detected.</li>}</ul>
          <h3>Conflicts</h3>
          <ul>{output.conflicts.length ? output.conflicts.map((item) => <li key={item}>{item}</li>) : <li>None detected.</li>}</ul>
          <h3>Uncertainty and next questions</h3>
          <ul>{[...output.uncertainty, ...output.nextQuestions].map((item) => <li key={item}>{item}</li>)}</ul>
          <h3>Possible work paths</h3>
          <ul>{output.possiblePaths.length ? output.possiblePaths.map((item) => <li key={item}>{item}</li>) : <li>Resolve intake gaps first.</li>}</ul>
          <h3>Rule trace</h3>
          <ul>{output.ruleTrace.map((trace) => <li key={trace.ruleId}>{trace.ruleId} {trace.version} — {trace.source}</li>)}</ul>
        </CardShell>
      ) : null}
    </div>
  );
}
