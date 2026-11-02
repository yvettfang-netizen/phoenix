import assert from 'node:assert/strict';
import { readFileSync, rmSync, statSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it as test } from 'vitest';
import {
  authenticate,
  login,
  logout,
  provisionCredential,
  revokeStudent,
} from './auth-core';

const PASSWORD = 'correct horse battery staple';
const OTHER_PASSWORD = 'another correct password';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

test('credential replacement revokes old sessions even for the same student', () => {
  const { directory, storePath } = createStore();
  try {
    provisionCredential(storePath, 'anon_a', PASSWORD, 17);
    const old = login(storePath, 'anon_a', PASSWORD, 1000);
    assert.ok(old);
    provisionCredential(storePath, 'anon_a', OTHER_PASSWORD, 17);
    assert.equal(authenticate(storePath, old.token, 1001), null);
    assert.equal(login(storePath, 'anon_a', PASSWORD, 1001), null);
    assert.ok(login(storePath, 'anon_a', OTHER_PASSWORD, 1001));
  } finally { removeStore(directory); }
});

function createStore(): { directory: string; storePath: string } {
  const directory = mkdtempSync(join(tmpdir(), 'askwise-auth-core-'));
  return { directory, storePath: join(directory, 'auth.json') };
}

function removeStore(directory: string): void {
  rmSync(directory, { recursive: true, force: true });
}

test('unknown accounts are anonymous and rate-limited without sessions', () => {
  const { directory, storePath } = createStore();
  try {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      assert.equal(login(storePath, 'anon_a', PASSWORD, 0), null);
    }
    assert.equal(login(storePath, 'anon_a', PASSWORD, 0), null);
    assert.equal(login(storePath, 'anon_b', PASSWORD, 0), null);

    const stored = JSON.parse(readFileSync(storePath, 'utf8')) as {
      sessions: Record<string, unknown>;
      failures: Record<string, unknown>;
    };
    assert.equal(Object.keys(stored.sessions).length, 0);
    assert.equal(Object.keys(stored.failures).length, 2);
  } finally {
    removeStore(directory);
  }
});

test('login expires at the eight-hour hard cap and logout revokes a token', () => {
  const { directory, storePath } = createStore();
  try {
    provisionCredential(storePath, 'student_a', PASSWORD, 101);
    const session = login(storePath, 'student_a', PASSWORD, 1_000);
    assert.notEqual(session, null);
    assert.equal(session?.studentId, 101);
    assert.equal(session?.expiresAt, 1_000 + SESSION_TTL_MS);
    assert.equal(authenticate(storePath, session?.token ?? '', session?.expiresAt - 1), 101);
    assert.equal(authenticate(storePath, session?.token ?? '', session?.expiresAt), null);

    const freshSession = login(storePath, 'student_a', PASSWORD, 2_000);
    assert.notEqual(freshSession, null);
    logout(storePath, freshSession?.token ?? '');
    assert.equal(authenticate(storePath, freshSession?.token ?? '', 2_001), null);
  } finally {
    removeStore(directory);
  }
});

test('student revocation removes credentials and all active sessions', () => {
  const { directory, storePath } = createStore();
  try {
    provisionCredential(storePath, 'student_a', PASSWORD, 202);
    provisionCredential(storePath, 'student_b', OTHER_PASSWORD, 202);
    const first = login(storePath, 'student_a', PASSWORD, 3_000);
    const second = login(storePath, 'student_b', OTHER_PASSWORD, 3_000);
    assert.notEqual(first, null);
    assert.notEqual(second, null);

    revokeStudent(storePath, 202);
    assert.equal(authenticate(storePath, first?.token ?? '', 3_001), null);
    assert.equal(authenticate(storePath, second?.token ?? '', 3_001), null);
    assert.equal(login(storePath, 'student_a', PASSWORD, 3_001), null);
    assert.equal(login(storePath, 'student_b', OTHER_PASSWORD, 3_001), null);
  } finally {
    removeStore(directory);
  }
});

test('credentials and token digests persist across calls and use private mode', () => {
  const { directory, storePath } = createStore();
  try {
    provisionCredential(storePath, 'persisted_account', PASSWORD, 303);
    const session = login(storePath, 'persisted_account', PASSWORD, 4_000);
    assert.notEqual(session, null);

    const rawStore = readFileSync(storePath, 'utf8');
    assert.equal(rawStore.includes(session?.token ?? ''), false);
    const stored = JSON.parse(rawStore) as {
      credentials: Record<string, { studentId: number; salt: string; hash: string }>;
      sessions: Record<string, { studentId: number; expiresAt: number }>;
    };
    assert.equal(stored.credentials.persisted_account.studentId, 303);
    assert.equal(stored.credentials.persisted_account.salt.length, 32);
    assert.equal(stored.credentials.persisted_account.hash.length, 128);
    assert.equal(Object.keys(stored.sessions).length, 1);
    assert.equal(Object.values(stored.sessions)[0].studentId, 303);
    assert.equal(authenticate(storePath, session?.token ?? '', 4_001), 303);

    if (process.platform !== 'win32') {
      assert.equal(statSync(storePath).mode & 0o777, 0o600);
    }
  } finally {
    removeStore(directory);
  }
});

test('invalid credentials and bounded inputs fail without authenticating', () => {
  const { directory, storePath } = createStore();
  try {
    assert.throws(
      () => provisionCredential(storePath, 'too_short', 'short', 1),
      /password/,
    );
    assert.throws(
      () => provisionCredential(storePath, 'bad_id', PASSWORD, 0),
      /studentId/,
    );
    assert.throws(
      () => provisionCredential(storePath, 'bad_id', PASSWORD, 1.5),
      /studentId/,
    );

    provisionCredential(storePath, 'valid_account', PASSWORD, 404);
    assert.equal(login(storePath, 'valid_account', 'wrong password', 5_000), null);
    assert.notEqual(login(storePath, 'valid_account', PASSWORD, 5_000), null);
    assert.equal(authenticate(storePath, 'not-a-token', 5_000), null);
    assert.equal(authenticate(storePath, '', 5_000), null);
  } finally {
    removeStore(directory);
  }
});
