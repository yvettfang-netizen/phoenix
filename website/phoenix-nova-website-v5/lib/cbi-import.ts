import {
  CBI_ALLOWED_COUNTRY_CODES,
  type BilingualText,
  type CountryRecord,
  type CbiContentStatus,
  type CbiImportApprovalStatus,
  type CbiImportVerificationStatus,
  type CbiProvenance,
  type SchemaIssue,
  isStrictIsoDate,
  validateCountryRecord,
// @ts-expect-error Node's native TypeScript test runner needs the explicit extension; Next's bundler resolves it normally.
} from "./cbi-schema.ts";

export const CBI_IMPORT_MAX_ROWS = 5_000;
export const CBI_IMPORT_MAX_COLUMNS = 128;
export const CBI_IMPORT_MAX_BYTES = 20 * 1024 * 1024;
export const CBI_IMPORT_MAX_XLSX_ENTRIES = 2_000;
export const CBI_IMPORT_MAX_XLSX_UNCOMPRESSED_BYTES = 25 * 1024 * 1024;

export type CbiFileFormat = "CSV" | "JSON" | "XLSX";

export interface CbiImportSource {
  filename: string;
  bytes: Uint8Array | ArrayBuffer | string;
  mimeType?: string;
  original_version?: string | null;
  source_document?: string | null;
}

export interface CbiImportOptions {
  source_version?: string | null;
  original_version?: string | null;
  imported_by?: string | null;
  source_document?: string | null;
  max_rows?: number;
}

export interface CbiImportIssue extends SchemaIssue {
  row_number?: number;
  column?: string;
}

export interface CbiImportAudit {
  batch_id: string;
  import_batch_id: string;
  source_file: string;
  source_document: string | null;
  filename: string;
  file_hash: string;
  original_version: string | null;
  source_version: string | null;
  data_version: string | null;
  imported_at: string;
  imported_by: string | null;
  format: CbiFileFormat;
  created_at: string;
  status: "IMPORT_REVIEW";
  approval_status: CbiImportApprovalStatus;
  verification_status: CbiImportVerificationStatus;
  provenance: CbiProvenance;
  gate: "IMPORT_REVIEW";
  rows_seen: number;
  rows_blank: number;
  records_seen: number;
  records_valid: number;
  issue_count: number;
  append_only: true;
}

export interface CbiImportPreview {
  kind: "CBI_IMPORT_PREVIEW";
  batch_id: string;
  filename: string;
  format: CbiFileFormat;
  file_hash: string;
  original_version: string | null;
  source_version: string | null;
  status: "IMPORT_REVIEW";
  gate: "IMPORT_REVIEW";
  records: CountryRecord[];
  issues: CbiImportIssue[];
  audit: CbiImportAudit;
  approval: { eligible: false; reason: "IMPORT_REVIEW_ONLY" };
  rollback_candidate: CbiRollbackCandidate;
}

export interface CbiRollbackCandidate {
  kind: "CBI_ROLLBACK_CANDIDATE";
  batch_id: string;
  target_version: string | null;
  status: "ROLLBACK_CANDIDATE";
  requires_server_founder_approval: true;
  executes_rollback: false;
  append_only: true;
}

export interface CbiReleaseVersion {
  kind: "CBI_RELEASE_VERSION";
  batch_id: string;
  version_id: string;
  file_hash: string;
  original_version: string | null;
  source_version: string | null;
  records: CountryRecord[];
  approved_by: string;
  approved_at: string;
  append_only: true;
}

export interface CbiServerReleaseAuthorization {
  authorized: true;
  actor_id: string;
  actor_role: "FOUNDER";
  authorization_source: "SERVER_RBAC";
}

export interface CbiReleaseRepository {
  /** A transactional append adapter is required; no partial publication is allowed. */
  readonly transactional: true;
  /** The server loads the immutable, reviewed snapshot; browser fields are not trusted. */
  loadVerifiedReview(input: { batch_id: string; file_hash: string }): Promise<CbiVerifiedReviewSnapshot | null>;
  /** The adapter, not a browser payload, must prove Founder authorization. */
  authorizeImportReview(input: { batch_id: string; file_hash: string }): Promise<CbiServerReleaseAuthorization | { authorized: false; reason: string }>;
  /** Implementations must append a version. They must not update history in place. */
  appendVersion(version: CbiReleaseVersion): Promise<{ version_id: string }>;
}

export interface CbiVerifiedReviewSnapshot {
  immutable: true;
  batch_id: string;
  file_hash: string;
  audit: CbiImportAudit;
  records: CountryRecord[];
}

export interface CbiReleaseResult {
  ok: boolean;
  code: string;
  version_id?: string;
  issues?: CbiImportIssue[];
}

interface RawRows {
  headers: string[];
  rows: unknown[][];
  blankRowNumbers: number[];
  issues: CbiImportIssue[];
}

interface NormalisedRow {
  value: Record<string, unknown>;
  issues: CbiImportIssue[];
}

const dynamicImport = (): Promise<unknown> => import("exceljs");
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const nowIso = () => new Date().toISOString();
const newId = (prefix: string) => {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}_${randomUuid ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
};
const bytesOf = (input: CbiImportSource["bytes"]): Uint8Array => {
  if (typeof input === "string") return new TextEncoder().encode(input);
  if (input instanceof Uint8Array) return input;
  return new Uint8Array(input);
};
const utf8 = (bytes: Uint8Array) => new TextDecoder("utf-8", { fatal: false }).decode(bytes).replace(/^\uFEFF/, "");
const issue = (code: string, path: string, message: string, rowNumber?: number, severity: "error" | "warning" = "error"): CbiImportIssue => ({ code, path, message, severity, row_number: rowNumber });
const isBlank = (value: unknown) => value === null || value === undefined || (typeof value === "string" && value.trim() === "");
const isZip = (bytes: Uint8Array) => bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
const extension = (filename: string) => {
  const value = filename.toLowerCase().split("?")[0];
  const dot = value.lastIndexOf(".");
  return dot < 0 ? "" : value.slice(dot + 1);
};

export const sha256Hex = async (bytes: Uint8Array): Promise<string> => {
  if (!globalThis.crypto?.subtle) throw new Error("WebCrypto is required for file hashing; release is fail closed.");
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", copy.buffer);
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, "0")).join("");
};

export const detectCbiFormat = (source: CbiImportSource, bytes = bytesOf(source.bytes)): CbiFileFormat => {
  const ext = extension(source.filename);
  if (ext === "xlsm" || ext === "xlsb") throw new Error("UNSUPPORTED_SPREADSHEET_FORMAT: macro-enabled and binary spreadsheets are rejected.");
  const text = utf8(bytes).trimStart();
  const detected: CbiFileFormat = isZip(bytes) ? "XLSX" : text.startsWith("{") || text.startsWith("[") ? "JSON" : "CSV";
  if (ext === "xlsx" && detected !== "XLSX") throw new Error("FORMAT_SIGNATURE_MISMATCH: .xlsx must be a real ZIP/XLSX file.");
  if (ext === "json" && detected !== "JSON") throw new Error("FORMAT_SIGNATURE_MISMATCH: .json does not contain a JSON document.");
  if (ext === "csv" && detected !== "CSV") throw new Error("FORMAT_SIGNATURE_MISMATCH: .csv does not contain CSV text.");
  return detected;
};

/** CSV parser with quoted cells, escaped quotes and CRLF support. */
export const parseCbiCsv = (text: string): RawRows => {
  const rows: string[][] = [];
  const current: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell.length === 0) quoted = true;
    else if (char === ",") { current.push(cell); cell = ""; }
    else if (char === "\n") { current.push(cell.replace(/\r$/, "")); rows.push([...current]); current.length = 0; cell = ""; }
    else cell += char;
  }
  if (quoted) return { headers: [], rows: [], blankRowNumbers: [], issues: [issue("CSV_UNCLOSED_QUOTE", "file", "CSV contains an unclosed quoted cell.")] };
  if (cell.length > 0 || current.length > 0) { current.push(cell); rows.push([...current]); }
  const nonTrailing = rows.filter(row => row.some(value => value.trim() !== ""));
  if (nonTrailing.length === 0) return { headers: [], rows: [], blankRowNumbers: [], issues: [issue("EMPTY_FILE", "file", "The import file contains no data rows.")] };
  const headers = nonTrailing[0].map(value => value.trim());
  const issues: CbiImportIssue[] = [];
  const blankRowNumbers: number[] = [];
  const data = rows.slice(1);
  data.forEach((row, index) => {
    const rowNumber = index + 2;
    if (!row.some(value => value.trim() !== "")) { blankRowNumbers.push(rowNumber); issues.push(issue("BLANK_ROW_NOT_REVIEWED", `row[${rowNumber}]`, "Blank rows are retained as review issues and never auto-published.", rowNumber)); }
  });
  if (headers.length === 0 || headers.some(header => header === "")) issues.push(issue("INVALID_HEADERS", "headers", "CSV headers must be non-empty."));
  if (new Set(headers).size !== headers.length) issues.push(issue("DUPLICATE_HEADER", "headers", "CSV headers must be unique."));
  if (headers.length > CBI_IMPORT_MAX_COLUMNS) issues.push(issue("COLUMN_LIMIT_EXCEEDED", "headers", `At most ${CBI_IMPORT_MAX_COLUMNS} columns are supported.`));
  return { headers, rows: data, blankRowNumbers, issues };
};

const parseJsonValue = (value: unknown, path: string, rowNumber?: number): { value: unknown; issues: CbiImportIssue[] } => {
  if (typeof value !== "string") return { value, issues: [] };
  const trimmed = value.trim();
  if (!trimmed) return { value: null, issues: [] };
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return { value, issues: [] };
  try { return { value: JSON.parse(trimmed), issues: [] }; }
  catch { return { value: null, issues: [issue("INVALID_JSON_CELL", path, "Nested JSON cells must contain valid JSON.", rowNumber)] }; }
};

const bilingualFromColumns = (input: Record<string, unknown>, base: string): BilingualText | null | undefined => {
  if (!(base in input) && !(`${base}_zh` in input) && !(`${base}_en` in input)) return undefined;
  const direct = input[base];
  if (direct !== undefined && direct !== null && typeof direct !== "string") return direct as BilingualText;
  return { zh: isBlank(input[`${base}_zh`]) ? null : String(input[`${base}_zh`]), en: isBlank(input[`${base}_en`]) ? null : String(input[`${base}_en`]) };
};

const nullableString = (value: unknown): unknown => isBlank(value) ? null : value;

const normaliseRow = (headers: string[], row: unknown[], rowNumber: number): NormalisedRow => {
  const issues: CbiImportIssue[] = [];
  const input: Record<string, unknown> = {};
  headers.forEach((header, index) => { input[header] = row[index] ?? null; });
  const output: Record<string, unknown> = { ...input };
  for (const key of ["official_sources", "travel_access_data", "planning_details", "field_sources"] as const) {
    if (typeof output[key] === "string") {
      const parsed = parseJsonValue(output[key], key, rowNumber);
      output[key] = parsed.value;
      issues.push(...parsed.issues);
    }
  }
  for (const key of ["programme_name", "legal_basis", "government_fees", "due_diligence_fees", "family_eligibility", "residence_requirement", "interview_requirement", "source_of_funds_requirement", "processing_time", "dual_nationality_policy", "passport_validity", "passport_renewal", "official_authority"] as const) {
    const hasLocaleColumns = `${key}_zh` in input || `${key}_en` in input;
    const bilingual = bilingualFromColumns(input, key);
    if (hasLocaleColumns) output[key] = bilingual;
    else if (typeof output[key] === "string") {
      const parsed = parseJsonValue(output[key], key, rowNumber);
      output[key] = parsed.value;
      issues.push(...parsed.issues);
    }
    for (const locale of ["zh", "en"] as const) delete output[`${key}_${locale}`];
  }
  for (const key of ["country_id", "country_code", "country_name_zh", "country_name_en", "official_name", "flag_asset", "currency", "programme_id", "last_verified_at", "next_review_at", "data_version"] as const) output[key] = nullableString(output[key]);
  if (typeof output.minimum_investment === "string") {
    const trimmed = output.minimum_investment.trim();
    if (trimmed === "") output.minimum_investment = null;
    else if (/^\d+(?:\.\d+)?$/.test(trimmed)) output.minimum_investment = Number(trimmed);
    else if (!isBlank(trimmed)) issues.push(issue("AMBIGUOUS_AMOUNT", "minimum_investment", "Amounts must be plain decimal numbers; locale separators are rejected.", rowNumber));
  } else if (output.minimum_investment === undefined) output.minimum_investment = null;
  if (typeof output.investment_options === "string") {
    if (output.investment_options.trim() === "") output.investment_options = null;
    else {
      const parsed = parseJsonValue(output.investment_options, "investment_options", rowNumber);
      output.investment_options = parsed.value;
      issues.push(...parsed.issues);
    }
  } else if (output.investment_options === undefined) output.investment_options = null;
  if (output.travel_access_data === undefined) output.travel_access_data = null;
  if (output.official_sources === undefined || output.official_sources === null) output.official_sources = [];
  // IMPORT_REVIEW is a system gate, not a claim about the policy. Missing
  // content_status is therefore safely placed in review; no policy value is
  // inferred. A supplied PUBLISHED status is rejected by schema.
  if (output.content_status === undefined || output.content_status === null || output.content_status === "") output.content_status = "IMPORT_REVIEW";
  for (const field of ["programme_name", "legal_basis", "government_fees", "due_diligence_fees", "family_eligibility", "residence_requirement", "interview_requirement", "source_of_funds_requirement", "processing_time", "dual_nationality_policy", "passport_validity", "passport_renewal", "official_authority"] as const) if (output[field] === undefined) output[field] = null;
  for (const field of ["flag_asset", "programme_id", "last_verified_at", "next_review_at", "currency"] as const) if (output[field] === undefined) output[field] = null;
  return { value: output, issues };
};

const rowsToRaw = (raw: RawRows, maxRows: number): { records: unknown[]; issues: CbiImportIssue[] } => {
  const issues = [...raw.issues];
  if (raw.rows.length > maxRows) issues.push(issue("ROW_LIMIT_EXCEEDED", "file", `At most ${maxRows} data rows are supported.`));
  const records: unknown[] = [];
  raw.rows.slice(0, maxRows).forEach((row, index) => {
    const rowNumber = index + 2;
    if (!row.some(value => !isBlank(value))) return;
    if (row.length > raw.headers.length) issues.push(issue("TOO_MANY_COLUMNS", `row[${rowNumber}]`, "A row contains more cells than its header.", rowNumber));
    const normalised = normaliseRow(raw.headers, row, rowNumber);
    issues.push(...normalised.issues);
    records.push(normalised.value);
  });
  return { records, issues };
};

const jsonRows = (text: string, maxRows: number): { records: unknown[]; issues: CbiImportIssue[] } => {
  let parsed: unknown;
  try { parsed = JSON.parse(text.replace(/^\uFEFF/, "")); }
  catch { return { records: [], issues: [issue("INVALID_JSON", "file", "The file is not valid JSON.")] }; }
  const records = Array.isArray(parsed) ? parsed : isRecord(parsed) && Array.isArray(parsed.records) ? parsed.records : isRecord(parsed) ? [parsed] : [];
  const issues: CbiImportIssue[] = [];
  if (records.length === 0) issues.push(issue("EMPTY_FILE", "file", "The JSON file contains no records."));
  if (records.length > maxRows) issues.push(issue("ROW_LIMIT_EXCEEDED", "file", `At most ${maxRows} data rows are supported.`));
  const limited = records.slice(0, maxRows);
  const normalised = limited.map((record, index) => {
    if (!isRecord(record)) {
      issues.push(issue("INVALID_RECORD", `row[${index + 1}]`, "Each JSON item must be an object.", index + 1));
      return record;
    }
    const result = normaliseRow(Object.keys(record), Object.values(record), index + 1);
    issues.push(...result.issues);
    return result.value;
  });
  return { records: normalised, issues };
};

interface ExcelRow { values?: unknown[] }
interface ExcelWorksheet { rowCount?: number; getRow?: (index: number) => ExcelRow }
interface ExcelWorkbook { worksheets?: ExcelWorksheet[]; xlsx?: { load: (input: ArrayBuffer) => Promise<void> } }
interface ExcelJsLike { Workbook: new () => ExcelWorkbook }

const cellValue = (value: unknown, path: string, rowNumber: number, issues: CbiImportIssue[]): unknown => {
  if (isRecord(value) && "formula" in value) { issues.push(issue("FORMULA_NOT_ALLOWED", path, "Formula cells are rejected; cached formula results are not trusted.", rowNumber)); return null; }
  if (isRecord(value) && "text" in value && typeof value.text === "string") return value.text;
  return value;
};

const inspectXlsxZip = (bytes: Uint8Array): CbiImportIssue[] => {
  const issues: CbiImportIssue[] = [];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (offset: number) => view.getUint16(offset, true);
  const u32 = (offset: number) => view.getUint32(offset, true);
  let cursor = 0;
  let entries = 0;
  let uncompressed = 0;
  while (cursor + 30 <= bytes.byteLength && u32(cursor) === 0x04034b50) {
    if ((u16(cursor + 6) & 0x0001) !== 0) issues.push(issue("XLSX_ENCRYPTED_REJECTED", "file", "Encrypted XLSX files are rejected."));
    const compressed = u32(cursor + 18);
    const expanded = u32(cursor + 22);
    const nameLength = u16(cursor + 26);
    const extraLength = u16(cursor + 28);
    const nameStart = cursor + 30;
    const next = nameStart + nameLength + extraLength;
    if (next > bytes.byteLength) { issues.push(issue("XLSX_ZIP_TRUNCATED", "file", "XLSX local header is truncated.")); return issues; }
    const name = new TextDecoder().decode(bytes.slice(nameStart, nameStart + nameLength));
    if (/vbaProject\.bin$|\.xlsm$|\.bin$/i.test(name)) issues.push(issue("XLSX_SCRIPT_REJECTED", name, "XLSX scripts and macro payloads are rejected."));
    entries += 1;
    uncompressed += expanded;
    if (compressed > 0 && expanded / compressed > 1_000) issues.push(issue("XLSX_COMPRESSION_RATIO_EXCEEDED", name, "XLSX compression ratio exceeds the safety limit."));
    cursor = next + compressed;
    if (entries > CBI_IMPORT_MAX_XLSX_ENTRIES) { issues.push(issue("XLSX_ENTRY_LIMIT_EXCEEDED", "file", `At most ${CBI_IMPORT_MAX_XLSX_ENTRIES} XLSX entries are supported.`)); break; }
    if (uncompressed > CBI_IMPORT_MAX_XLSX_UNCOMPRESSED_BYTES) { issues.push(issue("XLSX_UNCOMPRESSED_LIMIT_EXCEEDED", "file", `XLSX declared uncompressed size exceeds ${CBI_IMPORT_MAX_XLSX_UNCOMPRESSED_BYTES} bytes.`)); break; }
  }
  if (entries === 0) issues.push(issue("XLSX_ZIP_INVALID", "file", "The XLSX signature does not contain readable ZIP entries."));
  // Local headers can legally defer sizes to the central directory. Inspect
  // central declarations as well so a ZIP bomb cannot hide behind zeros in a
  // data-descriptor local header.
  let centralEntries = 0;
  let centralUncompressed = 0;
  for (let offset = 0; offset + 46 <= bytes.byteLength; offset += 1) {
    if (u32(offset) !== 0x02014b50) continue;
    const flags = u16(offset + 8);
    const compressed = u32(offset + 20);
    const expanded = u32(offset + 24);
    const nameLength = u16(offset + 28);
    const extraLength = u16(offset + 30);
    const commentLength = u16(offset + 32);
    const nameStart = offset + 46;
    const next = nameStart + nameLength + extraLength + commentLength;
    if (next > bytes.byteLength) { issues.push(issue("XLSX_ZIP_TRUNCATED", "file", "XLSX central directory is truncated.")); break; }
    const name = new TextDecoder().decode(bytes.slice(nameStart, nameStart + nameLength));
    if ((flags & 0x0001) !== 0) issues.push(issue("XLSX_ENCRYPTED_REJECTED", name, "Encrypted XLSX entries are rejected."));
    if (compressed === 0xffffffff || expanded === 0xffffffff) issues.push(issue("XLSX_ZIP64_UNSUPPORTED", name, "ZIP64 XLSX size declarations are rejected until bounded parsing is available."));
    if (/vbaProject\.bin$|\.xlsm$|\.bin$/i.test(name)) issues.push(issue("XLSX_SCRIPT_REJECTED", name, "XLSX scripts and macro payloads are rejected."));
    centralEntries += 1;
    centralUncompressed += expanded;
    if (compressed > 0 && expanded / compressed > 1_000) issues.push(issue("XLSX_COMPRESSION_RATIO_EXCEEDED", name, "XLSX compression ratio exceeds the safety limit."));
  }
  if (centralEntries === 0) issues.push(issue("XLSX_CENTRAL_DIRECTORY_MISSING", "file", "XLSX central directory is missing."));
  if (centralEntries > CBI_IMPORT_MAX_XLSX_ENTRIES) issues.push(issue("XLSX_ENTRY_LIMIT_EXCEEDED", "file", `At most ${CBI_IMPORT_MAX_XLSX_ENTRIES} XLSX entries are supported.`));
  if (centralUncompressed > CBI_IMPORT_MAX_XLSX_UNCOMPRESSED_BYTES) issues.push(issue("XLSX_UNCOMPRESSED_LIMIT_EXCEEDED", "file", `XLSX declared uncompressed size exceeds ${CBI_IMPORT_MAX_XLSX_UNCOMPRESSED_BYTES} bytes.`));
  return issues;
};

const parseXlsx = async (bytes: Uint8Array, maxRows: number): Promise<{ records: unknown[]; issues: CbiImportIssue[] }> => {
  const zipIssues = inspectXlsxZip(bytes);
  if (zipIssues.some(item => item.severity === "error")) return { records: [], issues: zipIssues };
  let loaded: unknown;
  try { loaded = await dynamicImport(); }
  catch { return { records: [], issues: [issue("XLSX_DEPENDENCY_MISSING", "file", "XLSX preview requires the server-side exceljs dependency; publication is fail closed.")] }; }
  const excelModule = (isRecord(loaded) && "default" in loaded ? loaded.default : loaded) as ExcelJsLike;
  if (!excelModule || typeof excelModule.Workbook !== "function") return { records: [], issues: [issue("XLSX_DEPENDENCY_INVALID", "file", "The XLSX reader dependency is unavailable or invalid.")] };
  const workbook = new excelModule.Workbook();
  if (!workbook.xlsx?.load) return { records: [], issues: [issue("XLSX_READER_INVALID", "file", "The XLSX reader does not expose a read-only load method.")] };
  try { await workbook.xlsx.load(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer); }
  catch { return { records: [], issues: [...zipIssues, issue("XLSX_INVALID", "file", "The workbook could not be read as XLSX.")] }; }
  const worksheet = workbook.worksheets?.[0];
  if (!worksheet || typeof worksheet.getRow !== "function") return { records: [], issues: [issue("XLSX_NO_WORKSHEET", "file", "The XLSX file contains no readable worksheet.")] };
  const count = worksheet.rowCount ?? 0;
  const rows: unknown[][] = [];
  const issues: CbiImportIssue[] = [];
  for (let rowNumber = 1; rowNumber <= Math.min(count, maxRows + 1); rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    rows.push(values.map((value, index) => cellValue(value, `row[${rowNumber}].column[${index + 1}]`, rowNumber, issues)));
  }
  if (count > maxRows + 1) issues.push(issue("ROW_LIMIT_EXCEEDED", "file", `At most ${maxRows} data rows are supported.`));
  if (rows.length === 0) return { records: [], issues: [...issues, issue("EMPTY_FILE", "file", "The XLSX worksheet contains no rows.")] };
  const headers = (rows.shift() ?? []).map(value => String(value ?? "").trim());
  if (headers.some(value => value === "")) issues.push(issue("INVALID_HEADERS", "headers", "XLSX headers must be non-empty."));
  if (new Set(headers).size !== headers.length) issues.push(issue("DUPLICATE_HEADER", "headers", "XLSX headers must be unique."));
  const mapped = rowsToRaw({ headers, rows, blankRowNumbers: [], issues: [] }, maxRows);
  return { records: mapped.records, issues: [...zipIssues, ...issues, ...mapped.issues] };
};

const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
};
const recordKey = (value: unknown): string | null => {
  if (!isRecord(value) || typeof value.country_code !== "string" || value.country_code === "") return null;
  const programme = typeof value.programme_id === "string" && value.programme_id !== "" ? value.programme_id : "__COUNTRY__";
  return `${value.country_code}::${programme}`;
};
const withRow = (items: SchemaIssue[], rowNumber: number): CbiImportIssue[] => items.map(item => ({ ...item, path: `row[${rowNumber}].${item.path}`, row_number: rowNumber }));

const collectRecordValidation = (records: unknown[], issues: CbiImportIssue[]) => {
  const seen = new Map<string, { serialised: string; row: number }>();
  const countryIds = new Map<string, { countryCode: string; row: number }>();
  const valid: CountryRecord[] = [];
  records.forEach((value, index) => {
    const rowNumber = index + 2;
    const validation = validateCountryRecord(value);
    issues.push(...withRow(validation.errors, rowNumber), ...withRow(validation.warnings, rowNumber));
    if (validation.ok) valid.push(value as CountryRecord);
    if (isRecord(value) && typeof value.country_id === "string" && typeof value.country_code === "string") {
      const previousCountry = countryIds.get(value.country_id);
      if (previousCountry && previousCountry.countryCode !== value.country_code) issues.push(issue("COUNTRY_ID_CONFLICT", `row[${rowNumber}].country_code`, `country_id ${value.country_id} is already bound to ${previousCountry.countryCode}.`, rowNumber));
      else countryIds.set(value.country_id, { countryCode: value.country_code, row: rowNumber });
    }
    const key = recordKey(value);
    if (!key) return;
    const serialised = stable(value);
    const previous = seen.get(key);
    if (previous) {
      const previousRecord = records[previous.row - 2];
      const conflictCode = isRecord(previousRecord) && isRecord(value) && previousRecord.country_id !== value.country_id ? "COUNTRY_ID_CONFLICT" : previous.serialised === serialised ? "DUPLICATE_EXACT" : "DUPLICATE_CONFLICT";
      issues.push(issue(conflictCode, `row[${rowNumber}]`, `Duplicate country/programme key ${key} conflicts with row ${previous.row}.`, rowNumber));
    }
    else seen.set(key, { serialised, row: rowNumber });
  });
  return valid;
};

const hasError = (issues: CbiImportIssue[]) => issues.some(item => item.severity === "error");

export async function previewCbiImport(source: CbiImportSource, options: CbiImportOptions = {}): Promise<CbiImportPreview> {
  const bytes = bytesOf(source.bytes);
  const batchId = newId("cbi_batch");
  const fileHash = await sha256Hex(bytes);
  const format = detectCbiFormat(source, bytes);
  const maxRows = Math.min(options.max_rows ?? CBI_IMPORT_MAX_ROWS, CBI_IMPORT_MAX_ROWS);
  const issues: CbiImportIssue[] = [];
  const fileTooLarge = bytes.byteLength > CBI_IMPORT_MAX_BYTES;
  if (fileTooLarge) issues.push(issue("FILE_TOO_LARGE", "file", `Files must not exceed ${CBI_IMPORT_MAX_BYTES} bytes.`));
  let rawRecords: unknown[] = [];
  let rowsSeen = 0;
  let rowsBlank = 0;
  if (fileTooLarge) {
    // Do not parse or decompress oversized input. Hashing and the audit shell
    // remain available for an operator error report.
  } else if (format === "CSV") {
    const parsed = parseCbiCsv(utf8(bytes));
    rowsSeen = parsed.rows.length;
    rowsBlank = parsed.blankRowNumbers.length;
    const mapped = rowsToRaw(parsed, maxRows);
    rawRecords = mapped.records;
    issues.push(...mapped.issues);
  } else if (format === "JSON") {
    const parsed = jsonRows(utf8(bytes), maxRows);
    rawRecords = parsed.records;
    rowsSeen = rawRecords.length;
    issues.push(...parsed.issues);
  } else {
    const parsed = await parseXlsx(bytes, maxRows);
    rawRecords = parsed.records;
    rowsSeen = rawRecords.length;
    issues.push(...parsed.issues);
  }
  const records = collectRecordValidation(rawRecords, issues);
  const createdAt = nowIso();
  const originalVersion = options.original_version ?? source.original_version ?? null;
  const sourceVersion = options.source_version ?? null;
  const importedBy = options.imported_by ?? null;
  const sourceDocument = options.source_document ?? source.source_document ?? null;
  const recordVersions = [...new Set(records.map(record => record.data_version).filter(version => typeof version === "string" && version.trim() !== ""))];
  const dataVersion = sourceVersion ?? (recordVersions.length === 1 ? recordVersions[0] : null);
  const audit: CbiImportAudit = {
    batch_id: batchId,
    import_batch_id: batchId,
    source_file: source.filename,
    source_document: sourceDocument,
    filename: source.filename,
    file_hash: fileHash,
    original_version: originalVersion,
    source_version: sourceVersion,
    data_version: dataVersion,
    imported_at: createdAt,
    imported_by: importedBy,
    format,
    created_at: createdAt,
    status: "IMPORT_REVIEW",
    approval_status: "IMPORT_REVIEW",
    verification_status: "UNVERIFIED",
    provenance: "UNKNOWN",
    gate: "IMPORT_REVIEW",
    rows_seen: rowsSeen,
    rows_blank: rowsBlank,
    records_seen: rawRecords.length,
    records_valid: records.length,
    issue_count: issues.length,
    append_only: true,
  };
  return {
    kind: "CBI_IMPORT_PREVIEW",
    batch_id: batchId,
    filename: source.filename,
    format,
    file_hash: fileHash,
    original_version: originalVersion,
    source_version: sourceVersion,
    status: "IMPORT_REVIEW",
    gate: "IMPORT_REVIEW",
    records,
    issues,
    audit,
    approval: { eligible: false, reason: "IMPORT_REVIEW_ONLY" },
    rollback_candidate: { kind: "CBI_ROLLBACK_CANDIDATE", batch_id: batchId, target_version: sourceVersion, status: "ROLLBACK_CANDIDATE", requires_server_founder_approval: true, executes_rollback: false, append_only: true },
  };
}

export const createImportPreview = previewCbiImport;
export const previewImport = previewCbiImport;

export const createRollbackCandidate = (preview: Pick<CbiImportPreview, "batch_id" | "source_version">): CbiRollbackCandidate => ({
  kind: "CBI_ROLLBACK_CANDIDATE", batch_id: preview.batch_id, target_version: preview.source_version, status: "ROLLBACK_CANDIDATE", requires_server_founder_approval: true, executes_rollback: false, append_only: true,
});

const releasePreflight = (snapshot: CbiVerifiedReviewSnapshot): CbiImportIssue[] => {
  const issues: CbiImportIssue[] = [];
  if (snapshot.immutable !== true) issues.push(issue("IMMUTABLE_SNAPSHOT_REQUIRED", "snapshot", "Publication requires a server-loaded immutable review snapshot."));
  if (!snapshot.batch_id || snapshot.file_hash.length !== 64) issues.push(issue("INVALID_SNAPSHOT_IDENTITY", "snapshot", "The reviewed snapshot identity is invalid."));
  const audit = snapshot.audit;
  if (audit.import_batch_id !== snapshot.batch_id || audit.file_hash !== snapshot.file_hash) issues.push(issue("SNAPSHOT_AUDIT_MISMATCH", "audit", "Snapshot audit identity does not match the requested batch and file hash."));
  if (audit.status !== "IMPORT_REVIEW" || audit.approval_status !== "IMPORT_REVIEW") issues.push(issue("IMPORT_REVIEW_REQUIRED", "audit.approval_status", "Only IMPORT_REVIEW snapshots can enter the approval gate."));
  if (audit.verification_status !== "VERIFIED") issues.push(issue("BATCH_NOT_FULLY_VERIFIED", "audit.verification_status", "An official URL does not verify every row field; server review must mark the batch VERIFIED."));
  if (audit.provenance !== "OFFICIAL") issues.push(issue("NON_OFFICIAL_PROVENANCE", "audit.provenance", "Only explicitly verified OFFICIAL provenance can be released."));
  if (snapshot.records.length === 0) issues.push(issue("EMPTY_IMPORT_BATCH", "records", "An empty import batch cannot be published."));
  const today = new Date().toISOString().slice(0, 10);
  snapshot.records.forEach((record, index) => {
    const path = `records[${index}]`;
    const validation = validateCountryRecord(record);
    issues.push(...withRow(validation.errors, index + 2));
    if (record.content_status !== "IMPORT_REVIEW") issues.push(issue("RECORD_NOT_IN_REVIEW", `${path}.content_status`, "Imported records must start in IMPORT_REVIEW."));
    if (record.official_sources.length === 0) issues.push(issue("OFFICIAL_SOURCE_REQUIRED", `${path}.official_sources`, "A record without an official source cannot be published."));
    if (!isStrictIsoDate(record.last_verified_at)) issues.push(issue("LAST_VERIFIED_AT_REQUIRED", `${path}.last_verified_at`, "A verified record must include a strict last_verified_at date."));
    if (!isStrictIsoDate(record.next_review_at) || record.next_review_at < today) issues.push(issue("NEXT_REVIEW_DATE_INVALID", `${path}.next_review_at`, "A verified record must have a current or future next_review_at date."));
    if (record.official_sources.some(source => source.effective_status !== "CURRENT" || source.source_type !== "OFFICIAL" || !isStrictIsoDate(source.verified_at))) issues.push(issue("NON_CURRENT_OR_NON_OFFICIAL_SOURCE", `${path}.official_sources`, "All release sources must be current OFFICIAL sources with verification dates."));
  });
  return issues;
};

export async function releaseCbiImport(preview: CbiImportPreview, repository?: CbiReleaseRepository): Promise<CbiReleaseResult> {
  if (!repository || repository.transactional !== true || typeof repository.loadVerifiedReview !== "function" || typeof repository.authorizeImportReview !== "function" || typeof repository.appendVersion !== "function") return { ok: false, code: "REPOSITORY_INTERFACE_MISSING" };
  const snapshot = await repository.loadVerifiedReview({ batch_id: preview.batch_id, file_hash: preview.file_hash });
  if (!snapshot || snapshot.immutable !== true || snapshot.batch_id !== preview.batch_id || snapshot.file_hash !== preview.file_hash) return { ok: false, code: "VERIFIED_REVIEW_SNAPSHOT_REQUIRED" };
  const preflight = releasePreflight(snapshot);
  if (hasError(preflight)) return { ok: false, code: "IMPORT_REVIEW_BLOCKED", issues: preflight };
  const authorization = await repository.authorizeImportReview({ batch_id: snapshot.batch_id, file_hash: snapshot.file_hash });
  if (!authorization.authorized || authorization.actor_role !== "FOUNDER" || authorization.authorization_source !== "SERVER_RBAC") return { ok: false, code: "SERVER_FOUNDER_AUTHORIZATION_REQUIRED" };
  const versionId = newId("cbi_version");
  const releaseRecords = snapshot.records.map(record => ({ ...record, content_status: "PUBLISHED" as CbiContentStatus }));
  try {
    const result = await repository.appendVersion({ kind: "CBI_RELEASE_VERSION", batch_id: snapshot.batch_id, version_id: versionId, file_hash: snapshot.file_hash, original_version: snapshot.audit.original_version, source_version: snapshot.audit.source_version, records: releaseRecords, approved_by: authorization.actor_id, approved_at: nowIso(), append_only: true });
    return { ok: true, code: "RELEASE_APPENDED", version_id: result.version_id || versionId };
  } catch {
    return { ok: false, code: "RELEASE_APPEND_FAILED" };
  }
}

export const publishCbiImport = releaseCbiImport;

const csvCell = (value: unknown) => {
  const text = typeof value === "string" ? value : JSON.stringify(value) ?? "";
  const safe = /^[=+@-]/.test(text.trimStart()) ? `'${text}` : text;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};

export const exportCbiErrorReport = (preview: Pick<CbiImportPreview, "batch_id" | "file_hash" | "issues">, format: "csv" | "json" = "csv"): string => {
  if (format === "json") return JSON.stringify({ batch_id: preview.batch_id, file_hash: preview.file_hash, issues: preview.issues }, null, 2);
  const rows = [["batch_id", "file_hash", "row_number", "path", "code", "severity", "message"], ...preview.issues.map(item => [preview.batch_id, preview.file_hash, item.row_number ?? "", item.path, item.code, item.severity, item.message])];
  return `${rows.map(row => row.map(csvCell).join(",")).join("\n")}\n`;
};

export const exportErrorReport = exportCbiErrorReport;
export const cbiAllowlist = [...CBI_ALLOWED_COUNTRY_CODES];
