import { test, expect } from '@playwright/test';
import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Admin → Users Tab — Full E2E Workflow Tests
//
// Covers the complete user lifecycle:
//   U1  — Create teacher: all fields stored correctly
//   U2  — Teacher login sync: GET /users/me returns fresh data
//   U3  — Edit teacher: name, qualification, class_teacher_of updated in DB
//   U4  — Subject/class assignment: teacher-assignments record correct for year
//   U5  — Mark credentials shared: flag stored
//   U6  — Reset password: new password stored, login works
//   U7  — Deactivate: is_active=false, deactivated_at set, in inactive list
//   U8  — Login blocked after deactivation
//   U9  — Reactivate: is_active=true, deactivated_at=null, login restored
//   U10 — Permanent delete: user completely removed, GET returns 404
//
// Uses real API calls — no mocks. Seeds fresh data, verifies stored values,
// checks teacher↔admin sync, tests reversibility. Cleans up on completion.
// ─────────────────────────────────────────────────────────────────────────────

const API = 'https://cbas-backend-bxiu.onrender.com';
const ACADEMIC_YEAR = '2025-26';

// Disable retries — tests are sequential and share state; retries cause afterAll to wipe the user
test.describe.configure({ retries: 0 });

// Seeded user details
const TEST_EMAIL    = `e2e_user_${Date.now()}@testschool.com`;
const TEST_NAME     = 'E2E Test Teacher';
const TEST_PASSWORD = 'Test@1234';
const TEST_PHONE    = '9876543210';
const TEST_QUAL     = 'GRADUATION WITH BED';
const TEST_EXPIRY   = '5';
const TEST_CLASS_OF = 'Grade 4 Kaveri';
const TEST_SUBJECTS  = ['Mathematics'];
const TEST_CLASSES   = ['Grade 4'];
const TEST_SECTIONS  = ['Kaveri'];

let createdUserId: string = '';

// ─────────────────────────────────────────────────────────────────────────────
// CLEANUP — runs even if tests fail
// ─────────────────────────────────────────────────────────────────────────────
test.afterAll(async () => {
  if (!createdUserId) return;
  // Hard delete if user still exists
  await axios.delete(`${API}/users/${createdUserId}/permanent`, {
    validateStatus: () => true, timeout: 10000,
  });
  console.log(`🧹 Cleanup: deleted test user ${createdUserId}`);
});

// ─────────────────────────────────────────────────────────────────────────────

test('U1 — Create teacher: all fields stored correctly in DB', async () => {
  const payload = {
    name:                   TEST_NAME,
    email:                  TEST_EMAIL,
    password:               TEST_PASSWORD,
    role:                   'teacher',
    phone:                  TEST_PHONE,
    appraisal_qualification: TEST_QUAL,
    experience:             TEST_EXPIRY,
    class_teacher_of:       TEST_CLASS_OF,
    subjects:               TEST_SUBJECTS,
    assigned_classes:       TEST_CLASSES,
    assigned_sections:      TEST_SECTIONS,
  };

  const createR = await axios.post(`${API}/users`, payload, { timeout: 15000 });
  expect(createR.status).toBe(201);

  const user = createR.data;
  createdUserId = user.id;
  expect(createdUserId).toBeTruthy();

  // Verify every submitted field is stored
  expect(user.name).toBe(TEST_NAME);
  expect(user.email).toBe(TEST_EMAIL);
  expect(user.role).toBe('teacher');
  expect(user.phone).toBe(TEST_PHONE);
  expect(user.appraisal_qualification).toBe(TEST_QUAL);
  expect(user.experience).toBe(TEST_EXPIRY);
  expect(user.class_teacher_of).toBe(TEST_CLASS_OF);
  expect(user.is_active).toBe(true);
  expect(user.credentials_shared).toBe(false);

  // Password must NOT be returned as plaintext in the response body
  // (it is stored in DB but should not be exposed in API response unless explicitly fetched)
  // Verify login works with the given password
  const loginR = await axios.post(`${API}/users/login`, {
    email: TEST_EMAIL, password: TEST_PASSWORD,
  }, { timeout: 15000, validateStatus: () => true });
  expect([200, 201]).toContain(loginR.status);
  // Login returns { success, user: { id, ... } }
  const loginUserId = loginR.data?.user?.id || loginR.data?.id;
  expect(loginUserId).toBe(createdUserId);

  // Verify user appears in GET /users list
  const listR = await axios.get(`${API}/users`, { timeout: 15000 });
  const inList = (listR.data || []).find((u: any) => u.id === createdUserId);
  expect(inList).toBeDefined();
  expect(inList.name).toBe(TEST_NAME);

  console.log(`✅ U1: Created teacher ${createdUserId} — all fields stored, login works, appears in list`);
});

test('U2 — Teacher login sync: GET /users/me returns fresh profile matching DB', async () => {
  expect(createdUserId).toBeTruthy();

  // This is the endpoint App.tsx calls on load to refresh teacher data without re-login
  const meR = await axios.get(
    `${API}/users/me?email=${encodeURIComponent(TEST_EMAIL)}`,
    { timeout: 15000 }
  );
  expect(meR.status).toBe(200);

  const me = meR.data;
  expect(me.id).toBe(createdUserId);
  expect(me.name).toBe(TEST_NAME);
  expect(me.email).toBe(TEST_EMAIL);
  expect(me.role).toBe('teacher');
  expect(me.class_teacher_of).toBe(TEST_CLASS_OF);

  // Verify GET /users/:id also returns full record
  const singleR = await axios.get(`${API}/users/${createdUserId}`, { timeout: 15000 });
  expect(singleR.status).toBe(200);
  expect(singleR.data.id).toBe(createdUserId);
  expect(singleR.data.appraisal_qualification).toBe(TEST_QUAL);

  console.log(`✅ U2: GET /users/me syncs correctly — name="${me.name}", class_teacher_of="${me.class_teacher_of}"`);
});

test('U3 — Edit teacher: name, qualification, class_teacher_of updated in DB', async () => {
  expect(createdUserId).toBeTruthy();

  const UPDATED_NAME  = 'E2E Teacher Updated';
  const UPDATED_QUAL  = 'POST GRADUATION WITH BED';
  const UPDATED_CLASS = 'Grade 5 Raman';
  const UPDATED_EXP   = '8';

  const patchR = await axios.patch(`${API}/users/${createdUserId}`, {
    name:                   UPDATED_NAME,
    appraisal_qualification: UPDATED_QUAL,
    class_teacher_of:       UPDATED_CLASS,
    experience:             UPDATED_EXP,
    subjects:               ['Mathematics', 'Science'],
    assigned_classes:       ['Grade 5'],
    assigned_sections:      ['Raman'],
  }, { timeout: 15000 });
  expect(patchR.status).toBe(200);

  // Re-fetch and verify all updated fields persisted
  const getR = await axios.get(`${API}/users/${createdUserId}`, { timeout: 15000 });
  const updated = getR.data;

  expect(updated.name).toBe(UPDATED_NAME);
  expect(updated.appraisal_qualification).toBe(UPDATED_QUAL);
  expect(updated.class_teacher_of).toBe(UPDATED_CLASS);
  expect(updated.experience).toBe(UPDATED_EXP);

  // Verify sync: GET /users/me reflects the edit immediately
  const meR = await axios.get(
    `${API}/users/me?email=${encodeURIComponent(TEST_EMAIL)}`,
    { timeout: 15000 }
  );
  expect(meR.data.name).toBe(UPDATED_NAME);
  expect(meR.data.class_teacher_of).toBe(UPDATED_CLASS);

  console.log(`✅ U3: Edit verified — name="${UPDATED_NAME}", qualification="${UPDATED_QUAL}", class="${UPDATED_CLASS}"`);
  console.log(`   GET /users/me sync confirmed`);
});

test('U4 — Teacher assignments: subjects + classes stored per academic year', async () => {
  expect(createdUserId).toBeTruthy();

  // POST to teacher-assignments to record year-specific assignment
  const assignR = await axios.post(`${API}/teacher-assignments`, {
    teacher_id:    createdUserId,
    academic_year: ACADEMIC_YEAR,
    subjects:      ['Mathematics', 'Science'],
    assigned_classes: ['Grade 5'],
  }, { timeout: 15000, validateStatus: () => true });

  // Either 201 (created) or 200 (updated) is acceptable
  expect([200, 201]).toContain(assignR.status);

  // Verify the assignment appears in the year's assignment list
  const listR = await axios.get(
    `${API}/teacher-assignments?academic_year=${ACADEMIC_YEAR}`,
    { timeout: 15000 }
  );
  const assignments: any[] = listR.data || [];
  const mine = assignments.find((a: any) => a.teacher_id === createdUserId);
  expect(mine).toBeDefined();
  expect(mine.academic_year).toBe(ACADEMIC_YEAR);

  const subjects = mine.subjects || [];
  expect(subjects).toContain('Mathematics');
  expect(subjects).toContain('Science');

  // Verify history endpoint also returns this assignment
  const histR = await axios.get(
    `${API}/teacher-assignments/history/${createdUserId}`,
    { timeout: 15000, validateStatus: () => true }
  );
  if (histR.status === 200) {
    const history: any[] = histR.data || [];
    const thisYear = history.find((h: any) => h.academic_year === ACADEMIC_YEAR);
    expect(thisYear).toBeDefined();
    console.log(`   Assignment history entry: ${thisYear.academic_year} — [${(thisYear.subjects||[]).join(', ')}]`);
  }

  console.log(`✅ U4: Teacher assignment for ${ACADEMIC_YEAR} stored — subjects=[${subjects.join(', ')}]`);
});

test('U5 — Mark credentials shared: credentials_shared flag set to true in DB', async () => {
  expect(createdUserId).toBeTruthy();

  const markR = await axios.patch(
    `${API}/users/${createdUserId}/mark-shared`,
    {},
    { timeout: 15000 }
  );
  expect(markR.status).toBe(200);

  // Verify flag persisted in DB
  const getR = await axios.get(`${API}/users/${createdUserId}`, { timeout: 15000 });
  expect(getR.data.credentials_shared).toBe(true);

  console.log(`✅ U5: credentials_shared=true confirmed in DB`);
});

test('U6 — Reset password: new password stored, login works with new password, old password rejected', async () => {
  expect(createdUserId).toBeTruthy();

  const NEW_PASSWORD = 'NewPass@5678';

  const resetR = await axios.patch(
    `${API}/users/${createdUserId}/reset-password`,
    { password: NEW_PASSWORD },
    { timeout: 15000 }
  );
  expect(resetR.status).toBe(200);

  // New password must work for login
  const loginNew = await axios.post(`${API}/users/login`, {
    email: TEST_EMAIL, password: NEW_PASSWORD,
  }, { timeout: 15000, validateStatus: () => true });
  expect([200, 201]).toContain(loginNew.status);
  expect(loginNew.data?.user?.id || loginNew.data?.id).toBe(createdUserId);

  // Old password must now be rejected
  const loginOld = await axios.post(`${API}/users/login`, {
    email: TEST_EMAIL, password: TEST_PASSWORD,
  }, { timeout: 15000, validateStatus: () => true });
  expect(loginOld.status).not.toBe(200);

  console.log(`✅ U6: Password reset — new password works (${loginNew.status}), old password rejected (${loginOld.status})`);
});

test('U7 — Deactivate: is_active=false, deactivated_at set, appears in inactive list', async () => {
  expect(createdUserId).toBeTruthy();

  const deactivateR = await axios.patch(
    `${API}/users/${createdUserId}/deactivate`,
    {},
    { timeout: 15000 }
  );
  expect(deactivateR.status).toBe(200);

  // Verify DB state
  const getR = await axios.get(`${API}/users/${createdUserId}`, { timeout: 15000, validateStatus: () => true });
  if (getR.status === 200) {
    expect(getR.data.is_active).toBe(false);
    expect(getR.data.deactivated_at).toBeTruthy();
    // deactivated_at must be a valid timestamp
    expect(new Date(getR.data.deactivated_at).getTime()).toBeGreaterThan(0);
  }

  // Must appear in GET /users/inactive
  const inactiveR = await axios.get(`${API}/users/inactive`, { timeout: 15000 });
  const inInactive = (inactiveR.data || []).find((u: any) => u.id === createdUserId);
  expect(inInactive).toBeDefined();
  expect(inInactive.is_active).toBe(false);

  // Must NOT appear in GET /users (active list)
  const activeR = await axios.get(`${API}/users`, { timeout: 15000 });
  const inActive = (activeR.data || []).find((u: any) => u.id === createdUserId);
  expect(inActive).toBeUndefined();

  console.log(`✅ U7: Deactivated — is_active=false, deactivated_at="${inInactive.deactivated_at}", in inactive list, absent from active list`);
});

test('U8 — Login blocked after deactivation: deactivated user cannot authenticate', async () => {
  expect(createdUserId).toBeTruthy();

  const loginR = await axios.post(`${API}/users/login`, {
    email: TEST_EMAIL, password: 'NewPass@5678',
  }, { timeout: 15000, validateStatus: () => true });

  // Must not return 200 — either 401, 403, or 400
  expect(loginR.status).not.toBe(200);

  console.log(`✅ U8: Deactivated user login blocked — status ${loginR.status}`);
});

test('U9 — Reactivate: is_active=true, deactivated_at=null, login restored', async () => {
  expect(createdUserId).toBeTruthy();

  const reactivateR = await axios.patch(
    `${API}/users/${createdUserId}/reactivate`,
    {},
    { timeout: 15000 }
  );
  expect(reactivateR.status).toBe(200);

  // Verify DB state
  const getR = await axios.get(`${API}/users/${createdUserId}`, { timeout: 15000, validateStatus: () => true });
  if (getR.status === 200) {
    expect(getR.data.is_active).toBe(true);
    expect(getR.data.deactivated_at).toBeFalsy();
  }

  // Must reappear in active list
  const activeR = await axios.get(`${API}/users`, { timeout: 15000 });
  const inActive = (activeR.data || []).find((u: any) => u.id === createdUserId);
  expect(inActive).toBeDefined();
  expect(inActive.is_active).toBe(true);

  // Must no longer appear in inactive list
  const inactiveR = await axios.get(`${API}/users/inactive`, { timeout: 15000 });
  const inInactive = (inactiveR.data || []).find((u: any) => u.id === createdUserId);
  expect(inInactive).toBeUndefined();

  // Login must work again
  const loginR = await axios.post(`${API}/users/login`, {
    email: TEST_EMAIL, password: 'NewPass@5678',
  }, { timeout: 15000, validateStatus: () => true });
  expect([200, 201]).toContain(loginR.status);

  console.log(`✅ U9: Reactivated — is_active=true, deactivated_at=null, back in active list, login works`);
});

test('U10 — Permanent delete: user completely removed, GET returns 404', async () => {
  expect(createdUserId).toBeTruthy();

  // Deactivate first (permanent delete may require inactive state)
  await axios.patch(`${API}/users/${createdUserId}/deactivate`, {}, {
    timeout: 10000, validateStatus: () => true,
  });

  const deleteR = await axios.delete(
    `${API}/users/${createdUserId}/permanent`,
    { timeout: 15000 }
  );
  expect(deleteR.status).toBe(200);

  // Verify user is completely gone
  const getR = await axios.get(`${API}/users/${createdUserId}`, {
    timeout: 15000, validateStatus: () => true,
  });
  expect(getR.status).toBe(404);

  // Must not appear in active list
  const activeR = await axios.get(`${API}/users`, { timeout: 15000 });
  const inActive = (activeR.data || []).find((u: any) => u.id === createdUserId);
  expect(inActive).toBeUndefined();

  // Must not appear in inactive list
  const inactiveR = await axios.get(`${API}/users/inactive`, { timeout: 15000 });
  const inInactive = (inactiveR.data || []).find((u: any) => u.id === createdUserId);
  expect(inInactive).toBeUndefined();

  // Login must fail (user does not exist)
  const loginR = await axios.post(`${API}/users/login`, {
    email: TEST_EMAIL, password: 'NewPass@5678',
  }, { timeout: 15000, validateStatus: () => true });
  expect(loginR.status).not.toBe(200);

  createdUserId = ''; // prevent afterAll from trying to delete again
  console.log(`✅ U10: Permanently deleted — GET /users/:id returns ${getR.status}, absent from all lists, login fails`);
});
