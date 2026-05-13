-- ============================================================
-- ATTENDANCE MONITOR - Complete Supabase Database Setup
-- Run this entire script in Supabase > SQL Editor > New Query
-- ============================================================

-- ============================================================
-- TABLE 1: User
-- ============================================================
CREATE TABLE IF NOT EXISTS "User" (
  id                   TEXT         PRIMARY KEY,
  email                TEXT         NOT NULL UNIQUE,
  password             TEXT         NOT NULL,
  name                 TEXT,
  avatar               TEXT,
  role                 TEXT         NOT NULL DEFAULT 'employee',
  department           TEXT,
  "employeeId"         TEXT         UNIQUE,
  phone                TEXT,
  "isActive"           BOOLEAN      NOT NULL DEFAULT true,
  "managerId"          TEXT,

  -- Payroll: Earnings
  "basicSalary"        FLOAT8,
  hra                  FLOAT8,
  da                   FLOAT8,
  conveyance           FLOAT8,
  "medicalAllowance"   FLOAT8,
  "specialAllowance"   FLOAT8,
  "otherAllowances"    FLOAT8,

  -- Payroll: Deductions
  pf                   FLOAT8,
  esi                  FLOAT8,
  "professionalTax"    FLOAT8,
  tds                  FLOAT8,
  "otherDeductions"    FLOAT8,

  -- Bank Details
  "bankAccountNumber"  TEXT,
  "bankName"           TEXT,
  "ifscCode"           TEXT,
  "bankBranch"         TEXT,

  -- Tax & Compliance
  "panNumber"          TEXT,
  "uanNumber"          TEXT,
  "esiNumber"          TEXT,

  -- Employment
  "dateOfJoining"      TIMESTAMPTZ,
  "dateOfLeaving"      TIMESTAMPTZ,
  "employmentType"     TEXT,

  "createdAt"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  "updatedAt"          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE "User"
  ADD CONSTRAINT "User_managerId_fkey"
  FOREIGN KEY ("managerId") REFERENCES "User"(id)
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "User_email_idx"     ON "User"(email);
CREATE INDEX IF NOT EXISTS "User_managerId_idx" ON "User"("managerId");

-- ============================================================
-- TABLE 2: Task
-- ============================================================
CREATE TABLE IF NOT EXISTS "Task" (
  id          TEXT        PRIMARY KEY,
  title       TEXT        NOT NULL,
  date        TIMESTAMPTZ NOT NULL,
  type        TEXT        NOT NULL,
  priority    TEXT        NOT NULL DEFAULT 'medium',
  completed   BOOLEAN     NOT NULL DEFAULT false,
  notes       TEXT,
  "userId"    TEXT        NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "Task_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Task_userId_idx"   ON "Task"("userId");
CREATE INDEX IF NOT EXISTS "Task_date_idx"     ON "Task"(date);
CREATE INDEX IF NOT EXISTS "Task_priority_idx" ON "Task"(priority);

-- ============================================================
-- TABLE 3: Attendance
-- ============================================================
CREATE TABLE IF NOT EXISTS "Attendance" (
  id          TEXT        PRIMARY KEY,
  date        TIMESTAMPTZ NOT NULL,
  status      TEXT        NOT NULL,
  session     TEXT        NOT NULL DEFAULT 'full_day',
  "punchIn"   TIMESTAMPTZ,
  "punchOut"  TIMESTAMPTZ,
  notes       TEXT,
  location    TEXT,
  latitude    FLOAT8,
  longitude   FLOAT8,
  "userId"    TEXT        NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "Attendance_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT "Attendance_date_session_userId_key"
    UNIQUE (date, session, "userId")
);

CREATE INDEX IF NOT EXISTS "Attendance_userId_idx" ON "Attendance"("userId");
CREATE INDEX IF NOT EXISTS "Attendance_date_idx"   ON "Attendance"(date);

-- ============================================================
-- TABLE 4: Holiday
-- ============================================================
CREATE TABLE IF NOT EXISTS "Holiday" (
  id          TEXT        PRIMARY KEY,
  name        TEXT        NOT NULL,
  date        TIMESTAMPTZ NOT NULL UNIQUE,
  type        TEXT        NOT NULL DEFAULT 'public',
  description TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Holiday_date_idx" ON "Holiday"(date);

-- ============================================================
-- TABLE 5: Department
-- ============================================================
CREATE TABLE IF NOT EXISTS "Department" (
  id          TEXT        PRIMARY KEY,
  name        TEXT        NOT NULL UNIQUE,
  description TEXT,
  color       TEXT        NOT NULL DEFAULT '#3b82f6',
  "isActive"  BOOLEAN     NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "Department_name_idx" ON "Department"(name);

-- ============================================================
-- TABLE 6: PasswordResetToken
-- ============================================================
CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
  id          TEXT        PRIMARY KEY,
  email       TEXT        NOT NULL,
  token       TEXT        NOT NULL UNIQUE,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  used        BOOLEAN     NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "PasswordResetToken_email_idx" ON "PasswordResetToken"(email);
CREATE INDEX IF NOT EXISTS "PasswordResetToken_token_idx" ON "PasswordResetToken"(token);

-- ============================================================
-- TABLE 7: LeaveType
-- ============================================================
CREATE TABLE IF NOT EXISTS "LeaveType" (
  id                  TEXT        PRIMARY KEY,
  name                TEXT        NOT NULL UNIQUE,
  code                TEXT        NOT NULL UNIQUE,
  description         TEXT,
  color               TEXT        NOT NULL DEFAULT '#3b82f6',
  "defaultDays"       INTEGER     NOT NULL DEFAULT 0,
  "carryForward"      BOOLEAN     NOT NULL DEFAULT false,
  "maxCarryForward"   INTEGER     NOT NULL DEFAULT 0,
  "requiresApproval"  BOOLEAN     NOT NULL DEFAULT true,
  "isActive"          BOOLEAN     NOT NULL DEFAULT true,
  "isPaid"            BOOLEAN     NOT NULL DEFAULT true,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "LeaveType_code_idx" ON "LeaveType"(code);

-- ============================================================
-- TABLE 8: LeaveBalance
-- ============================================================
CREATE TABLE IF NOT EXISTS "LeaveBalance" (
  id              TEXT        PRIMARY KEY,
  year            INTEGER     NOT NULL,
  total           FLOAT8      NOT NULL DEFAULT 0,
  used            FLOAT8      NOT NULL DEFAULT 0,
  pending         FLOAT8      NOT NULL DEFAULT 0,
  "carryForward"  FLOAT8      NOT NULL DEFAULT 0,
  "userId"        TEXT        NOT NULL,
  "leaveTypeId"   TEXT        NOT NULL,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "LeaveBalance_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT "LeaveBalance_leaveTypeId_fkey"
    FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT "LeaveBalance_userId_leaveTypeId_year_key"
    UNIQUE ("userId", "leaveTypeId", year)
);

CREATE INDEX IF NOT EXISTS "LeaveBalance_userId_idx" ON "LeaveBalance"("userId");
CREATE INDEX IF NOT EXISTS "LeaveBalance_year_idx"   ON "LeaveBalance"(year);

-- ============================================================
-- TABLE 9: LeaveRequest
-- ============================================================
CREATE TABLE IF NOT EXISTS "LeaveRequest" (
  id                  TEXT        PRIMARY KEY,
  "startDate"         TIMESTAMPTZ NOT NULL,
  "endDate"           TIMESTAMPTZ NOT NULL,
  days                FLOAT8      NOT NULL,
  reason              TEXT,
  status              TEXT        NOT NULL DEFAULT 'pending',
  type                TEXT        NOT NULL DEFAULT 'full',
  "emergencyContact"  TEXT,
  "approvedBy"        TEXT,
  "approvedAt"        TIMESTAMPTZ,
  "rejectionReason"   TEXT,
  "userId"            TEXT        NOT NULL,
  "leaveTypeId"       TEXT        NOT NULL,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "LeaveRequest_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT "LeaveRequest_leaveTypeId_fkey"
    FOREIGN KEY ("leaveTypeId") REFERENCES "LeaveType"(id)
    ON UPDATE CASCADE,

  CONSTRAINT "LeaveRequest_approvedBy_fkey"
    FOREIGN KEY ("approvedBy") REFERENCES "User"(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "LeaveRequest_userId_idx"              ON "LeaveRequest"("userId");
CREATE INDEX IF NOT EXISTS "LeaveRequest_status_idx"              ON "LeaveRequest"(status);
CREATE INDEX IF NOT EXISTS "LeaveRequest_startDate_endDate_idx"   ON "LeaveRequest"("startDate", "endDate");

-- ============================================================
-- TABLE 10: Notification
-- ============================================================
CREATE TABLE IF NOT EXISTS "Notification" (
  id          TEXT        PRIMARY KEY,
  title       TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  type        TEXT        NOT NULL DEFAULT 'info',
  "isRead"    BOOLEAN     NOT NULL DEFAULT false,
  link        TEXT,
  "userId"    TEXT        NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "Notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_isRead_idx" ON "Notification"("isRead");

-- ============================================================
-- TABLE 11: Shift
-- ============================================================
CREATE TABLE IF NOT EXISTS "Shift" (
  id              TEXT        PRIMARY KEY,
  name            TEXT        NOT NULL,
  code            TEXT        NOT NULL UNIQUE,
  "startTime"     TEXT        NOT NULL,
  "endTime"       TEXT        NOT NULL,
  "breakMinutes"  INTEGER     NOT NULL DEFAULT 60,
  "graceMinutes"  INTEGER     NOT NULL DEFAULT 15,
  color           TEXT        NOT NULL DEFAULT '#3b82f6',
  "isActive"      BOOLEAN     NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE 12: UserShift
-- ============================================================
CREATE TABLE IF NOT EXISTS "UserShift" (
  id          TEXT        PRIMARY KEY,
  "userId"    TEXT        NOT NULL,
  "shiftId"   TEXT        NOT NULL,
  "startDate" TIMESTAMPTZ NOT NULL,
  "endDate"   TIMESTAMPTZ,
  "isActive"  BOOLEAN     NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "UserShift_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT "UserShift_shiftId_fkey"
    FOREIGN KEY ("shiftId") REFERENCES "Shift"(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "UserShift_userId_idx"  ON "UserShift"("userId");
CREATE INDEX IF NOT EXISTS "UserShift_shiftId_idx" ON "UserShift"("shiftId");

-- ============================================================
-- TABLE 13: Permission
-- ============================================================
CREATE TABLE IF NOT EXISTS "Permission" (
  id          TEXT        PRIMARY KEY,
  "userId"    TEXT        NOT NULL,
  module      TEXT        NOT NULL,
  "canRead"   BOOLEAN     NOT NULL DEFAULT false,
  "canWrite"  BOOLEAN     NOT NULL DEFAULT false,
  "canEdit"   BOOLEAN     NOT NULL DEFAULT false,
  "canDelete" BOOLEAN     NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "Permission_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"(id)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT "Permission_userId_module_key"
    UNIQUE ("userId", module)
);

CREATE INDEX IF NOT EXISTS "Permission_userId_idx" ON "Permission"("userId");

-- ============================================================
-- AUTO-UPDATE updatedAt TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER "User_updatedAt"        BEFORE UPDATE ON "User"        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER "Task_updatedAt"        BEFORE UPDATE ON "Task"        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER "Attendance_updatedAt"  BEFORE UPDATE ON "Attendance"  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER "Holiday_updatedAt"     BEFORE UPDATE ON "Holiday"     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER "Department_updatedAt"  BEFORE UPDATE ON "Department"  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER "LeaveType_updatedAt"   BEFORE UPDATE ON "LeaveType"   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER "LeaveBalance_updatedAt" BEFORE UPDATE ON "LeaveBalance" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER "LeaveRequest_updatedAt" BEFORE UPDATE ON "LeaveRequest" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER "Shift_updatedAt"       BEFORE UPDATE ON "Shift"       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER "Permission_updatedAt"  BEFORE UPDATE ON "Permission"  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- SEED: Default Leave Types
-- ============================================================
INSERT INTO "LeaveType" (id, name, code, description, color, "defaultDays", "carryForward", "maxCarryForward", "requiresApproval", "isActive", "isPaid", "createdAt", "updatedAt")
VALUES
  ('lt_cl',  'Casual Leave',    'CL',  'For personal/casual purposes',          '#3b82f6', 12, false, 0,  true,  true,  true,  NOW(), NOW()),
  ('lt_sl',  'Sick Leave',      'SL',  'For medical illness or health reasons',  '#ef4444', 12, false, 0,  true,  true,  true,  NOW(), NOW()),
  ('lt_el',  'Earned Leave',    'EL',  'Earned through service, can carry forward', '#22c55e', 15, true,  5,  true,  true,  true,  NOW(), NOW()),
  ('lt_lop', 'Loss of Pay',     'LOP', 'Leave without pay when balance exhausted', '#f97316', 0,  false, 0,  true,  true,  false, NOW(), NOW()),
  ('lt_ml',  'Maternity Leave', 'ML',  'For maternity purposes',                 '#a855f7', 84, false, 0,  true,  true,  true,  NOW(), NOW()),
  ('lt_pl',  'Paternity Leave', 'PL',  'For paternity purposes',                 '#06b6d4', 7,  false, 0,  true,  true,  true,  NOW(), NOW()),
  ('lt_cl2', 'Compensatory Off','CO',  'Compensatory leave for extra working days', '#eab308', 0,  false, 0,  true,  true,  true,  NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- SEED: Default Departments
-- ============================================================
INSERT INTO "Department" (id, name, description, color, "isActive", "createdAt", "updatedAt")
VALUES
  ('dept_it',   'Information Technology', 'IT and software development',      '#3b82f6', true, NOW(), NOW()),
  ('dept_hr',   'Human Resources',        'HR and people management',          '#22c55e', true, NOW(), NOW()),
  ('dept_fin',  'Finance',                'Finance and accounting',             '#eab308', true, NOW(), NOW()),
  ('dept_ops',  'Operations',             'Business operations',                '#f97316', true, NOW(), NOW()),
  ('dept_sales','Sales',                  'Sales and business development',     '#a855f7', true, NOW(), NOW()),
  ('dept_mkt',  'Marketing',              'Marketing and communications',       '#06b6d4', true, NOW(), NOW()),
  ('dept_mgmt', 'Management',             'Senior management and leadership',   '#ef4444', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SEED: Default Shifts
-- ============================================================
INSERT INTO "Shift" (id, name, code, "startTime", "endTime", "breakMinutes", "graceMinutes", color, "isActive", "createdAt", "updatedAt")
VALUES
  ('shift_gen',  'General Shift',  'GEN',   '09:00', '18:00', 60, 15, '#3b82f6', true, NOW(), NOW()),
  ('shift_mor',  'Morning Shift',  'MOR',   '06:00', '14:00', 30, 15, '#22c55e', true, NOW(), NOW()),
  ('shift_eve',  'Evening Shift',  'EVE',   '14:00', '22:00', 30, 15, '#f97316', true, NOW(), NOW()),
  ('shift_ngt',  'Night Shift',    'NGT',   '22:00', '06:00', 30, 15, '#6366f1', true, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- SEED: First Admin User
-- IMPORTANT: Replace the password hash below!
-- Generate a bcrypt hash at: https://bcrypt.online/
-- Default password below is: Admin@123
-- Hash was generated with 10 salt rounds
-- ============================================================
INSERT INTO "User" (
  id, email, password, name, role, department, "employeeId", "isActive", "createdAt", "updatedAt"
)
VALUES (
  'user_admin_001',
  'admin@company.com',
  '$2b$10$rOzJqbm7Lq9K1nL9D4Y3WOxQzVjYfBpKe8gn5H2MX1RNt6sLpA2Hy',
  'System Admin',
  'admin',
  'Management',
  'EMP001',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- Done! All 13 tables created with seed data.
-- ============================================================
-- NEXT STEPS:
-- 1. Run this SQL in Supabase > SQL Editor > New Query > Run
-- 2. Login with: admin@company.com / Admin@123
-- 3. OR register a new admin at /signup and update role to 'admin'
--    using: UPDATE "User" SET role='admin' WHERE email='your@email.com';
-- ============================================================
