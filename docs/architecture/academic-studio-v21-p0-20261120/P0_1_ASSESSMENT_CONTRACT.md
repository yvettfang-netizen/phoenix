# P0.1 Assessment and Growth Timeline Contract

**Status:** PROPOSED FOR JIMSON / academic reviewer review · no SQL or runtime change authorized  
**Founder decision:** separate assessment systems, one longitudinal growth timeline

## 1. Binding principles

1. CAT4, DSE, A-Level, IELTS, JLPT and Cantonese capability assessment remain distinct instrument systems.
2. Preserve the original score, grade, scale, dimension and instrument edition. Never overwrite an original result with a normalized score.
3. Do not calculate cross-instrument averages, rankings or conversions without a documented, independently reviewed and Founder-approved comparability model.
4. A single timeline is a presentation/read projection over separately governed records, not a shared scoring model.
5. AI-proposed observations are not formal assessment results. Teacher review and publication are separate state transitions.
6. Parent visibility requires current authority and applicable Consent; student self-view is limited to their own record; teacher visibility is assignment-specific.

## 2. Instrument contracts

| Instrument | Record without loss | Do not infer |
|---|---|---|
| CAT4 | edition, battery, age/norm reference where permitted, Verbal/Non-verbal/Quantitative/Spatial dimensions, standard age score or other exact reported scale, report evidence | Do not convert to DSE/A-Level grades or general IQ claim |
| DSE | examination year/session, subject, level/paper where relevant, reported grade and result status | Do not equate grade letters to A-Level letters or percentages |
| A-Level | awarding body, syllabus/specification, examination series, subject, AS/A2/full A-Level stage, grade and raw mark only when officially reported | Do not assume all exam boards share identical grade boundaries |
| IELTS | test type, test date, test report reference, Overall and Listening/Reading/Writing/Speaking bands, half-band precision and validity where relevant | Do not infer university admission eligibility from score alone |
| JLPT | test year/session, N5–N1 level, reported total and section scores where supplied, result evidence | Do not translate N-level to CEFR or other language scales without approved mapping |
| Cantonese | framework/rubric version, skill domain (listening/speaking/reading/writing/interaction), task context, assessor, rubric levels and evidence | Do not fabricate an official standardized grade where none exists |

No instrument licence, official scale, norm table or third-party score conversion is assumed to be available.

## 3. Minimum provenance for every assessment attempt/result

- stable assessment/result ID;
- instrument code and version/edition;
- subject or capability dimension;
- original score value and explicit score unit/scale code;
- assessment date/time and timezone where relevant;
- awarding body/provider/assessor/source;
- evidence document/reference and integrity metadata;
- entry actor and entry time;
- review state and reviewer identity/time;
- publication audience and publication/retraction event;
- correction/supersession link, never silent overwrite;
- Consent and retention basis;
- source type: OFFICIAL_RESULT / TEACHER_ASSESSMENT / SELF_REPORT / AI_PROPOSAL, with AI clearly distinguished.

## 4. Suggested lifecycle

`DRAFT → SUBMITTED → VERIFIED → REVIEWED → PUBLISHED`

Exceptions:
- `REJECTED`: evidence or scale invalid; preserve reason and actor.
- `RETRACTED`: remove from future family/student views but retain necessary audit and provenance.
- `SUPERSEDED`: a newer verified result replaces the current display while preserving the historical attempt.

A self-reported score may be visible as self-reported but must not be presented as verified. AI-proposed capability observations must remain in a separate evidence class until a qualified human reviewer approves an appropriate record.

## 5. Existing object reuse and gap

- `education.score_record`: generic subject, numeric score, date and source; lacks an explicit instrument edition, score scale schema, dimension, review/publication lifecycle and full evidence provenance.
- `education.language_test`: generic test_kind and score_json; useful existing fact store but does not guarantee schema validation per instrument, edition, subscale, verification or publication policy.
- `education.academic_record`: school/level and evidence; not a full assessment attempt.
- `learning.stage_report`: teacher-authored stage report with draft/submitted/published/retracted lifecycle; useful for learning progress narrative, not a substitute for formal instrument result.
- `docs.documents` / versions: reuse evidence references and version provenance where supported.
- `audit`: reuse write/access audit; confirm exact required audit function and permissions in Jimson review.

No object named `education.study_enrollments` was found in formal migrations 0001–0037; do not conflate it with `learning.enrollment`.

## 6. Timeline projection contract

Each timeline item contains source kind, source ID, source revision, event/assessment date, verified/published date, display title, instrument identity, original result representation, review state, evidence reference (viewer-authorized only), and current visibility decision.

Sort by the event date while exposing publication/review timing where it materially changes interpretation. Never merge scores into one numeric progress bar across incompatible scales. Progress comparisons within the same instrument are allowed only when instrument version, dimension and score scale are compatible and an approved comparison rule exists.

## 7. Negative tests

- DSE grade is not rendered as an A-Level grade.
- CAT4 standard age score is not displayed as an IELTS band.
- JLPT N2 is not automatically converted to CEFR.
- Cantonese teacher rubric is labelled with its rubric version and assessor.
- Unverified/self-reported score is visibly labelled and not promoted to verified.
- AI proposal is invisible to parent until reviewed and published.
- Revoked Consent / guardian authority removes access on next protected read.
- Retraction removes item from future projection while retaining authorized audit.
- Teacher without active assignment cannot read the assessment.
- Student A and Family A cannot read Student B's result.
- Evidence reference is not disclosed to a viewer lacking document permission.

## 8. Founder / academic approvals still required

- Exact CAT4 report fields and permissible storage/licence terms.
- DSE and A-Level awarding-body metadata required for official result evidence.
- IELTS and JLPT evidence retention and validity display policy.
- Cantonese rubric owner, versioning, assessor qualification and evidence requirements.
- Parent publication policy by student age/assent and assessment type.
- Retention, correction, deletion and retraction rules.
- Whether any within-instrument trend/benchmark is authorized.

**Recommendation:** do not create a single generic score table with an unconstrained JSON blob as the canonical assessment authority. First approve the instrument contracts and evidence policy; then compare the smallest normalized schema against existing education records. No migration number allocated.
