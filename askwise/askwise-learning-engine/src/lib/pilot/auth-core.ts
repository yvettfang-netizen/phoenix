import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import {
  chmodSync,
  closeSync,
  fsyncSync,
  openSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, isAbsolute, join } from 'node:path';

const STORE_VERSION = 1 as const;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const MIN_PASSWORD_BYTES = 12;
const MAX_PASSWORD_BYTES = 1024;
const MAX_ACCOUNT_BYTES = 254;
const MAX_TOKEN_INPUT_BYTES = 4096;
const MAX_STUDENT_ID = 2_147_483_647;
const SALT_BYTES = 16;
const HASH_BYTES = 64;
const FAILURE_LIMIT = 5;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const FAILURE_LOCKOUT_MS = 15 * 60 * 1000;
const MAX_FAILURE_RECORDS = 4096;
const SCRYPT_OPTIONS = {
  N: 16_384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024,
};
const DUMMY_SALT = Buffer.from('askwise-auth-dummy-salt-v1', 'utf8');
const DUMMY_PASSWORD = 'askwise-auth-dummy-password-v1';

type CredentialRecord = {
  studentId: number;
  salt: string;
  hash: string;
};

type SessionRecord = {
  studentId: number;
  expiresAt: number;
};

type FailureRecord = {
  count: number;
  firstFailureAt: number;
  blockedUntil: number;
};

type AuthStore = {
  version: typeof STORE_VERSION;
  credentials: Record<string, CredentialRecord>;
  sessions: Record<string, SessionRecord>;
  failures: Record<string, FailureRecord>;
};

function createDictionary<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>;
}

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNodeErrorWithCode(error: unknown, code: string): boolean {
  return (
    isRecord(error) &&
    typeof error.code === 'string' &&
    error.code === code
  );
}

function assertStorePath(storePath: string): void {
  if (typeof storePath !== 'string' || !isAbsolute(storePath)) {
    throw new TypeError('storePath must be an absolute path');
  }
}

function isValidStudentId(studentId: unknown): studentId is number {
  return (
    typeof studentId === 'number' &&
    Number.isSafeInteger(studentId) &&
    studentId >= 1 &&
    studentId <= MAX_STUDENT_ID
  );
}

function assertStudentId(studentId: number): void {
  if (!isValidStudentId(studentId)) {
    throw new RangeError('studentId must be a positive 32-bit integer');
  }
}

function isValidAccount(account: unknown): account is string {
  if (typeof account !== 'string') {
    return false;
  }

  const byteLength = Buffer.byteLength(account, 'utf8');
  if (byteLength < 1 || byteLength > MAX_ACCOUNT_BYTES) {
    return false;
  }

  for (const character of account) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint < 0x20 || codePoint === 0x7f) {
      return false;
    }
  }

  return true;
}

function assertAccount(account: string): void {
  if (!isValidAccount(account)) {
    throw new TypeError('account must be a non-empty printable string');
  }
}

function isValidPassword(password: unknown): password is string {
  if (typeof password !== 'string') {
    return false;
  }

  const byteLength = Buffer.byteLength(password, 'utf8');
  return byteLength >= MIN_PASSWORD_BYTES && byteLength <= MAX_PASSWORD_BYTES;
}

function assertPassword(password: string): void {
  if (!isValidPassword(password)) {
    throw new RangeError('password must be 12-1024 UTF-8 bytes');
  }
}

function normalizeNow(now: number | undefined): number {
  const timestamp = now === undefined ? Date.now() : now;
  if (
    typeof timestamp !== 'number' ||
    !Number.isFinite(timestamp) ||
    timestamp < 0 ||
    timestamp > Number.MAX_SAFE_INTEGER - SESSION_TTL_MS
  ) {
    throw new RangeError('now must be a finite non-negative timestamp');
  }
  return timestamp;
}

function isValidHex(value: string, byteLength: number): boolean {
  return (
    value.length === byteLength * 2 &&
    /^[0-9a-fA-F]+$/.test(value)
  );
}

function isValidCredentialRecord(value: unknown): value is CredentialRecord {
  return (
    isRecord(value) &&
    isValidStudentId(value.studentId) &&
    typeof value.salt === 'string' &&
    isValidHex(value.salt, SALT_BYTES) &&
    typeof value.hash === 'string' &&
    isValidHex(value.hash, HASH_BYTES)
  );
}

function isValidSessionRecord(value: unknown): value is SessionRecord {
  return (
    isRecord(value) &&
    isValidStudentId(value.studentId) &&
    typeof value.expiresAt === 'number' &&
    Number.isFinite(value.expiresAt) &&
    value.expiresAt >= 0
  );
}

function isValidFailureRecord(value: unknown): value is FailureRecord {
  return (
    isRecord(value) &&
    typeof value.count === 'number' &&
    Number.isSafeInteger(value.count) &&
    value.count >= 1 &&
    value.count <= FAILURE_LIMIT &&
    typeof value.firstFailureAt === 'number' &&
    Number.isFinite(value.firstFailureAt) &&
    value.firstFailureAt >= 0 &&
    typeof value.blockedUntil === 'number' &&
    Number.isFinite(value.blockedUntil) &&
    value.blockedUntil >= 0
  );
}

function emptyStore(): AuthStore {
  return {
    version: STORE_VERSION,
    credentials: createDictionary<CredentialRecord>(),
    sessions: createDictionary<SessionRecord>(),
    failures: createDictionary<FailureRecord>(),
  };
}

function parseStore(raw: string): AuthStore {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error('Invalid auth store JSON');
  }

  if (!isRecord(parsed)) {
    throw new Error('Invalid auth store');
  }

  if (parsed.version !== undefined && parsed.version !== STORE_VERSION) {
    throw new Error('Unsupported auth store version');
  }

  const state = emptyStore();
  const rawCredentials = parsed.credentials;
  if (rawCredentials !== undefined && !isRecord(rawCredentials)) {
    throw new Error('Invalid auth store credentials');
  }
  if (isRecord(rawCredentials)) {
    for (const [account, record] of Object.entries(rawCredentials)) {
      if (isValidCredentialRecord(record)) {
        state.credentials[account] = {
          studentId: record.studentId,
          salt: record.salt,
          hash: record.hash,
        };
      }
    }
  }

  const rawSessions = parsed.sessions;
  if (rawSessions !== undefined && !isRecord(rawSessions)) {
    throw new Error('Invalid auth store sessions');
  }
  if (isRecord(rawSessions)) {
    for (const [digest, record] of Object.entries(rawSessions)) {
      if (isValidSessionRecord(record)) {
        state.sessions[digest] = {
          studentId: record.studentId,
          expiresAt: record.expiresAt,
        };
      }
    }
  }

  const rawFailures = parsed.failures;
  if (rawFailures !== undefined && !isRecord(rawFailures)) {
    throw new Error('Invalid auth store failures');
  }
  if (isRecord(rawFailures)) {
    for (const [accountDigest, record] of Object.entries(rawFailures)) {
      if (isValidFailureRecord(record)) {
        state.failures[accountDigest] = {
          count: record.count,
          firstFailureAt: record.firstFailureAt,
          blockedUntil: record.blockedUntil,
        };
      }
    }
  }

  return state;
}

function readStore(storePath: string, createIfMissing: boolean): AuthStore | null {
  assertStorePath(storePath);

  let raw: string;
  try {
    raw = readFileSync(storePath, 'utf8');
  } catch (error) {
    if (isNodeErrorWithCode(error, 'ENOENT')) {
      return createIfMissing ? emptyStore() : null;
    }
    throw error;
  }

  return parseStore(raw);
}

function syncDirectory(directory: string): void {
  let directoryFd: number | undefined;
  try {
    directoryFd = openSync(directory, 'r');
    fsyncSync(directoryFd);
  } catch {
    // Directory fsync is not supported on every platform. The file rename is
    // still atomic, and the best-effort sync above is useful where supported.
  } finally {
    if (directoryFd !== undefined) {
      try {
        closeSync(directoryFd);
      } catch {
        // Ignore a cleanup failure after the store has been persisted.
      }
    }
  }
}

function writeStore(storePath: string, state: AuthStore): void {
  assertStorePath(storePath);

  const directory = dirname(storePath);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const temporaryPath = join(
    directory,
    `.${basename(storePath)}.${process.pid}.${randomBytes(16).toString('hex')}.tmp`,
  );
  let fileDescriptor: number | undefined;

  try {
    fileDescriptor = openSync(temporaryPath, 'wx', 0o600);
    writeFileSync(fileDescriptor, `${JSON.stringify(state)}\n`, 'utf8');
    fsyncSync(fileDescriptor);
    closeSync(fileDescriptor);
    fileDescriptor = undefined;
    chmodSync(temporaryPath, 0o600);
    renameSync(temporaryPath, storePath);
    chmodSync(storePath, 0o600);
    syncDirectory(directory);
  } finally {
    if (fileDescriptor !== undefined) {
      try {
        closeSync(fileDescriptor);
      } catch {
        // Preserve the original persistence error.
      }
    }
    try {
      unlinkSync(temporaryPath);
    } catch {
      // The temporary file is normally gone after a successful rename.
    }
  }
}

function accountFailureKey(account: string): string {
  return createHash('sha256').update(account, 'utf8').digest('hex');
}

function tokenDigest(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function isValidTokenInput(token: unknown): token is string {
  return (
    typeof token === 'string' &&
    token.length > 0 &&
    Buffer.byteLength(token, 'utf8') <= MAX_TOKEN_INPUT_BYTES
  );
}

function passwordForKdf(password: unknown): string {
  if (typeof password !== 'string') {
    return DUMMY_PASSWORD;
  }

  return Buffer.byteLength(password, 'utf8') <= MAX_PASSWORD_BYTES
    ? password
    : DUMMY_PASSWORD;
}

function derivePasswordHash(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, HASH_BYTES, SCRYPT_OPTIONS);
}

function verifyPassword(
  password: unknown,
  credential: CredentialRecord | undefined,
): boolean {
  const candidate = passwordForKdf(password);
  if (credential === undefined) {
    const derived = derivePasswordHash(candidate, DUMMY_SALT);
    return timingSafeEqual(derived, Buffer.alloc(HASH_BYTES));
  }

  const derived = derivePasswordHash(candidate, Buffer.from(credential.salt, 'hex'));
  const expected = Buffer.from(credential.hash, 'hex');
  return timingSafeEqual(derived, expected);
}

function failureIsActive(
  state: AuthStore,
  accountDigest: string,
  now: number,
): boolean {
  const failure = state.failures[accountDigest];
  if (failure === undefined) {
    return false;
  }

  if (failure.blockedUntil > now) {
    return true;
  }

  if (now - failure.firstFailureAt >= FAILURE_WINDOW_MS) {
    delete state.failures[accountDigest];
  }
  return false;
}

function pruneFailures(state: AuthStore, now: number): void {
  for (const [accountDigest, failure] of Object.entries(state.failures)) {
    if (
      failure.blockedUntil <= now &&
      now - failure.firstFailureAt >= FAILURE_WINDOW_MS
    ) {
      delete state.failures[accountDigest];
    }
  }

  const accountDigests = Object.keys(state.failures);
  if (accountDigests.length <= MAX_FAILURE_RECORDS) {
    return;
  }

  accountDigests
    .sort(
      (left, right) =>
        state.failures[left].firstFailureAt -
        state.failures[right].firstFailureAt,
    )
    .slice(0, accountDigests.length - MAX_FAILURE_RECORDS)
    .forEach((accountDigest) => {
      delete state.failures[accountDigest];
    });
}

function recordFailure(
  state: AuthStore,
  accountDigest: string,
  now: number,
): void {
  const current = state.failures[accountDigest];
  const expired =
    current === undefined || now - current.firstFailureAt >= FAILURE_WINDOW_MS;
  const failure: FailureRecord = expired
    ? { count: 0, firstFailureAt: now, blockedUntil: 0 }
    : current;

  if (failure.blockedUntil <= now) {
    failure.count = Math.min(FAILURE_LIMIT, failure.count + 1);
    if (failure.count >= FAILURE_LIMIT) {
      failure.blockedUntil = now + FAILURE_LOCKOUT_MS;
    }
    state.failures[accountDigest] = failure;
  }

  pruneFailures(state, now);
}

function generateSessionToken(state: AuthStore): {
  token: string;
  digest: string;
} {
  while (true) {
    const token = randomBytes(32).toString('base64url');
    const digest = tokenDigest(token);
    if (!hasOwn(state.sessions, digest)) {
      return { token, digest };
    }
  }
}

export function provisionCredential(
  storePath: string,
  account: string,
  password: string,
  studentId: number,
): void {
  assertStorePath(storePath);
  assertAccount(account);
  assertPassword(password);
  assertStudentId(studentId);

  const state = readStore(storePath, true) as AuthStore;
  const previous = state.credentials[account];
  if (previous !== undefined) {
    for (const [digest, session] of Object.entries(state.sessions)) {
      if (session.studentId === previous.studentId) {
        delete state.sessions[digest];
      }
    }
  }

  const salt = randomBytes(SALT_BYTES);
  const hash = derivePasswordHash(password, salt);
  state.credentials[account] = {
    studentId,
    salt: salt.toString('hex'),
    hash: hash.toString('hex'),
  };
  delete state.failures[accountFailureKey(account)];
  writeStore(storePath, state);
}

export function login(
  storePath: string,
  account: string,
  password: string,
  now?: number,
): { token: string; studentId: number; expiresAt: number } | null {
  assertStorePath(storePath);
  const timestamp = normalizeNow(now);
  if (!isValidAccount(account)) {
    return null;
  }

  const state = readStore(storePath, true) as AuthStore;
  const accountDigest = accountFailureKey(account);
  if (failureIsActive(state, accountDigest, timestamp)) {
    return null;
  }

  const credential = state.credentials[account];
  const passwordMatches = verifyPassword(password, credential);
  if (!passwordMatches || !isValidPassword(password) || credential === undefined) {
    recordFailure(state, accountDigest, timestamp);
    writeStore(storePath, state);
    return null;
  }

  delete state.failures[accountDigest];
  const session = generateSessionToken(state);
  const expiresAt = timestamp + SESSION_TTL_MS;
  state.sessions[session.digest] = {
    studentId: credential.studentId,
    expiresAt,
  };
  writeStore(storePath, state);

  return {
    token: session.token,
    studentId: credential.studentId,
    expiresAt,
  };
}

export function authenticate(
  storePath: string,
  token: string,
  now?: number,
): number | null {
  assertStorePath(storePath);
  const timestamp = normalizeNow(now);
  if (!isValidTokenInput(token)) {
    return null;
  }

  const state = readStore(storePath, false);
  if (state === null) {
    return null;
  }

  const digest = tokenDigest(token);
  const session = state.sessions[digest];
  if (session === undefined) {
    return null;
  }

  if (timestamp >= session.expiresAt) {
    delete state.sessions[digest];
    writeStore(storePath, state);
    return null;
  }

  return session.studentId;
}

export function logout(storePath: string, token: string): void {
  assertStorePath(storePath);
  if (!isValidTokenInput(token)) {
    return;
  }

  const state = readStore(storePath, false);
  if (state === null) {
    return;
  }

  const digest = tokenDigest(token);
  if (!hasOwn(state.sessions, digest)) {
    return;
  }

  delete state.sessions[digest];
  writeStore(storePath, state);
}

export function revokeStudent(storePath: string, studentId: number): void {
  assertStorePath(storePath);
  assertStudentId(studentId);

  const state = readStore(storePath, false);
  if (state === null) {
    return;
  }

  let changed = false;
  for (const [account, credential] of Object.entries(state.credentials)) {
    if (credential.studentId === studentId) {
      delete state.credentials[account];
      delete state.failures[accountFailureKey(account)];
      changed = true;
    }
  }

  for (const [digest, session] of Object.entries(state.sessions)) {
    if (session.studentId === studentId) {
      delete state.sessions[digest];
      changed = true;
    }
  }

  if (changed) {
    writeStore(storePath, state);
  }
}

// Call only after server-side provider verification and approved ID mapping.
export function issueVerifiedSession(storePath: string, studentId: number) {
  assertStudentId(studentId);
  const state = readStore(storePath, true) as AuthStore;
  const session = generateSessionToken(state);
  const expiresAt = Date.now() + SESSION_TTL_MS;
  state.sessions[session.digest] = { studentId, expiresAt };
  writeStore(storePath, state);
  return { token: session.token, studentId, expiresAt };
}
