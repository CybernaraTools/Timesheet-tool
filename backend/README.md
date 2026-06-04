# Timesheet Portal — Standalone Backend Documentation

This directory contains the production-grade REST API backend for the internal Cybernara **Timesheet Portal**. It is a standalone **Node.js (Express)** application built using plain **JavaScript (ES2022+)** and **Prisma ORM**, connected to a **Supabase (PostgreSQL)** database.

---

## 1. Setup & Installation

### Prerequisites
* Node.js v18.0.0 or higher
* pnpm (v10 or newer)
* Redis server (for job queues)

### 1.1 Installation Steps
1. Navigate into the `backend/` directory:
   ```bash
   cd backend
   ```
2. Install all dependencies:
   ```bash
   pnpm install
   ```
3. Generate the Prisma Client code locally:
   ```bash
   pnpm run prisma:generate
   ```

### 1.2 Running the Application
* **Development Mode (with auto-reload):**
  ```bash
  pnpm run dev
  ```
* **Production Mode:**
  ```bash
  pnpm start
  ```

---

## 2. Directory Layout

```
backend/
  prisma/
    schema.prisma        # Database schema models
    migration.sql        # Database schema migration script
  src/
    common/
      enums.js           # Frozen Plain JS enums (UserRole, OutputStatus, etc.)
      enums.d.ts         # TypeScript declaration file for enums
      middleware/
        jwtAuth.middleware.js       # Authenticates Supabase JWT
        roleGuard.middleware.js     # Validates user role requirements
        rateLimiter.middleware.js   # Global & email-based rate limits
        validation.middleware.js    # Body schema & constraint checkers
      helpers/
        prisma.js        # Singleton Prisma client instance
        supabase.js      # Supabase Admin client
        msGraph.js       # Microsoft Graph Outlook SMTP API
        currentUser.js   # SQL context transaction wrapper
        pagination.js    # List paginator utility
        requireRoles.js  # Role guard middleware wrapper
      errors/
        AppError.js      # Custom error class
        globalErrorHandler.js       # Intercepts errors and prevents leaks
    modules/
      auth/              # OTP, complete signup/invites, login, profile
      timesheet/         # CRUD, locks, bulk submission
      edit-requests/     # Requests submissions, reviews
      users/             # Org structure, manager assignment, user management
      clients/           # Client dropdowns, custom clients CRUD
      categories/        # Category dropdowns, custom categories CRUD
      reports/           # Team summary stats, CSV/PDF signed exports
      notifications/     # Notifications fetching, database logs
      audit/             # Read-only audit logs endpoint
    jobs/
      queue.js           # Bull queues repeating job orchestrator
      dailyReminder.job.js          # Cron checking for daily entries
      weeklyDigest.job.js           # Cron sending team digest to managers
      missingEntry.job.js           # Cron flagging missing entry business days
    app.js               # Route mappings & middlewares configuration
    server.js            # Server connection tests & listener
  .env                   # Local secrets & database connections
  package.json           # Running scripts & dependencies
```

---

## 3. Environment Configuration (`.env`)

```ini
# Supabase Configuration
SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
DATABASE_URL=your-prisma-connection-string

# Microsoft Graph API
MICROSOFT_GRAPH_TENANT_ID=your-azure-tenant-id
MICROSOFT_GRAPH_CLIENT_ID=your-azure-client-id
MICROSOFT_GRAPH_CLIENT_SECRET=your-azure-client-secret
OUTLOOK_SENDER_EMAIL=noreply@cybernara.com

# Expiry Configurations
OTP_EXPIRY_MINUTES=10
INVITE_EXPIRY_HOURS=24

# Redis / Bull Queue Connection
REDIS_URL=redis://127.0.0.1:6379
JOB_TIMEZONE=Asia/Kolkata

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Policy
ALLOWED_ORIGINS=http://localhost:3000
```

---

## 4. API Endpoints Reference

All endpoints (except health and public auth routes) require an `Authorization: Bearer <token>` header with a valid Supabase JWT.

### 4.1 Authentication (`/auth`)
* `POST /auth/request-otp` [Public] - Body: `{ email, purpose }`. Generates a 6-digit verification code, bcrypt-hashes it in database, and sends it via Microsoft Graph API. Rate limited to 3 attempts per 10 minutes per email.
* `POST /auth/verify-otp` [Public] - Body: `{ email, code, purpose }`. Verifies code, increments error count, deletes on success. Returns a short-lived token for `signup`/`invite` or a full session JWT for `signin` (obtained via native Supabase magiclink verification).
* `POST /auth/signup/complete` [Public] - Body: `{ verificationToken, username, password }`. Confirms verificationToken, creates user in Supabase Auth, updates public.users to active, hashes password locally and returns a genuine Supabase session.
* `POST /auth/invite/complete` [Public] - Body: `{ inviteToken, otp, username, password }`. Confirms manager registration invite token, verifies OTP, registers user in Supabase Auth, activates manager in public.users, and returns session token.
* `POST /auth/login` [Public] - Body: `{ username, password }`. Username login. Calls Supabase `signInWithPassword` and returns JWT.
* `GET /auth/me` [Protected] - Returns logged-in user profile from `public.users`.
* `PATCH /auth/credentials` [Protected] - Body: `{ username?, password? }`. Updates profile credentials (updates password in Supabase Auth and updates local bcrypt hash).

### 4.2 Timesheet Entries (`/entries`)
* `GET /entries` - Paginated entries list. Scopes data based on role: Employees see own; Managers see own + direct reports + assigned entries; Admins see all.
* `GET /entries/summary` - Aggregated entries logged hours grouped by date, category, and client (scoped same as list).
* `GET /entries/:id` - Fetch single entry details (accessible if employee owns it, or if manager is their direct supervisor or is assigned to the entry).
* `POST /entries` - Creates a timesheet entry. Expects `manager_ids` array. Forces `is_locked = true` and checks that `end_time > start_time`.
* `POST /entries/bulk` - Atomic multi-task insertion. Calls `SELECT public.timesheet_bulk_submit($1::JSONB)` inside a transaction. Expects `manager_ids` for each task.
* `PATCH /entries/:id` - Updates entry. Can optionally update `manager_ids`. Employees can only update if `is_locked = false`. Bypassed for Managers/Admins.
* `DELETE /entries/:id` [Manager/Admin] - Deletes entry (restricted by direct report or assigned manager constraints).

### 4.3 Edit Requests (`/edit-requests`)
* `POST /edit-requests` [Employee] - Body: `{ entry_id, reason }`. Requests edit on locked entries. Emails report's manager.
* `GET /edit-requests` [Manager/Admin] - Lists pending team edit requests.
* `GET /edit-requests/mine` [Employee] - Lists own requests history.
* `PATCH /edit-requests/:id/approve` [Manager/Admin] - Approves request, unlocking entry (`is_locked = false`) and emailing employee.
* `PATCH /edit-requests/:id/reject` [Manager/Admin] - Rejects request, keeping entry locked and emailing employee.

### 4.4 Org & User Management (`/users`)
* `GET /users` [Admin] - Paginated list of users.
* `GET /users/team` [Manager/Admin] - Returns direct reports.
* `GET /users/managers` [Protected - All roles] - Returns active users with the `manager` role. Used for select dropdowns.
* `POST /users/invite` [Admin] - Body: `{ email }`. Invites a Manager (token active for 24 hours).
* `PATCH /users/:id/role` [Admin] - Changes user role (promoted Admins clear `manager_id`).
* `PATCH /users/:id/manager` [Admin] - Configures reporting manager.
* `PATCH /users/:id/status` [Admin] - Activates or suspends user.

### 4.5 Clients & Categories (`/clients`, `/categories`)
* `GET /clients`, `GET /categories` - Option listing (returns names & IDs for dropdown selectors).
* `POST`, `PATCH` [Manager/Admin] - Creates/modifies custom items (system categories cannot be edited).
* `DELETE /clients/:id`, `DELETE /categories/:id` [Admin] - Deletes items. Categories check count to prevent deleting active categories (`CATEGORY_IN_USE` error code).

### 4.6 Reports (`/reports`)
* `POST /reports/export/csv` [Manager/Admin] - Filters entries, compiles a CSV, uploads to Supabase Storage, and issues a 1-hour signed URL.
* `POST /reports/export/pdf` [Manager/Admin] - Generates a styled PDF summary using `pdfkit`, uploads to Supabase Storage, and returns signed URL.
* `GET /reports/team-summary` [Manager/Admin] - Summarizes weekly dashboard metrics.

### 4.7 Audit logs (`/audit-logs`)
* `GET /audit-logs`, `GET /audit-logs/:id` [Admin] - Read-only view of mutating audit log events.

---

## 5. Security & Transaction Isolation

* **Generated Duration:** The generated database column `duration_minutes` is mapped read-only and never modified during insert/update commands.
* **Audit actor mapping:** All DB writes are wrapped in `withUserContext`:
  ```js
  await withUserContext(userId, async (tx) => {
    // Sets LOCAL app.current_user_id and request.jwt.claims
    // Trigger automatically logs the actor properly
    return await tx.timesheetEntry.create({ ... });
  });
  ```

---

## 6. Background Jobs (Bull + Redis)

Jobs run in repeating timers respecting the `Asia/Kolkata` timezone:
1. `dailyReminder` (Mon-Fri at 17:00 local): Reminds active employees who have not logged entries for today.
2. `weeklyDigest` (Monday at 08:00 local): Emails managers a clean status summary table for their team's previous work week.
3. `missingEntry` (Daily at 09:00 local): Alerts employees missing entries for any of the previous 2 working days (skipping weekends).
