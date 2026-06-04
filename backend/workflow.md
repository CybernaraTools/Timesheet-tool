# Complete Backend Development & Operations Workflow

This document details the complete end-to-end workflow for developing, testing, maintaining, and deploying the **Timesheet Portal Backend**.

---

## 1. Local Setup & Execution Workflow

### 1.1 First-Time Setup
1. **Install Dependencies:**
   ```bash
   cd backend
   pnpm install
   ```
2. **Generate Database Client:**
   Ensure your Prisma Client is generated:
   ```bash
   pnpm run prisma:generate
   ```
3. **Environment Setup:**
   Copy `.env.example` to `.env` and fill in the required database, Supabase, and Redis configuration variables.

### 1.2 Daily Development Loop
* Start the hot-reloading development server:
   ```bash
   pnpm run dev
   ```
* Nodemon will monitor files and restart the server on any changes.
* Verify the backend status anytime by fetching `GET http://localhost:5000/` or `GET http://localhost:5000/health`.

---

## 2. Authentication & OTP Testing Workflow

Since Microsoft Graph API credentials require Azure tenant registrations, the backend includes a diagnostic console fallback for local development.

### 2.1 OTP Mocking & Verification Flow
1. **Requesting an OTP:**
   Send a `POST /auth/request-otp` request:
   ```json
   {
     "email": "employee@cybernara.com",
     "purpose": "signup"
   }
   ```
2. **Retrieve Code from Console:**
   Check the running server terminal. The backend will print the generated 6-digit code to the terminal console:
   ```
   [Email Dispatcher]:
   To: employee@cybernara.com
   Subject: Your Timesheet Portal verification code
   Body: Your one-time code is: XXXXXX
   ```
3. **Verify the OTP:**
   Send `POST /auth/verify-otp` with the email and the 6-digit code printed in the console.

---

## 3. Database Schema & Migration Workflow

The database schema is fully managed on Supabase Postgres. 

### 3.1 Introspecting Schema Changes
Whenever database tables, columns, or triggers are modified in Supabase:
1. **Pull Database Schema:**
   Synchronize local Prisma definitions with the active database:
   ```bash
   npx prisma db pull
   ```
2. **Verify generated columns:**
   Inspect `prisma/schema.prisma`. Ensure the generated column `duration_minutes` is mapped manually and is **never** annotated with `@default(dbgenerated())`:
   ```prisma
   duration_minutes Int? @map("duration_minutes")
   ```
3. **Regenerate Client:**
   Compile the updated Prisma Client:
   ```bash
   pnpm run prisma:generate
   ```

### 3.2 Audit Log Context Wrapping
Mutating database queries (insert, update, delete) must capture the performing user's identity. Always wrap database writes in the `withUserContext` transaction helper:
```js
const withUserContext = require('../../common/helpers/currentUser');

await withUserContext(req.user.id, async (tx) => {
  // All operations performed on `tx` will execute after setting local variables:
  // SET LOCAL app.current_user_id = 'userId'
  // SET LOCAL request.jwt.claims = '{"sub": "userId"}'
  return await tx.timesheetEntry.update({ ... });
});
```

---

## 4. Background Jobs Management Workflow

Background queues are managed by **Bull** and **Redis**.

### 4.1 Running Redis
* Ensure a local Redis server is running and configured at `REDIS_URL` (default `redis://127.0.0.1:6379`).
* The scheduler is initialized automatically when starting the Express server ([server.js](file:///c:/Users/Sourjya%20Saha/Desktop/Timesheet-Portal/backend/src/server.js)).

### 4.2 Job Repeat Rules
* Cron schedules are run using the `Asia/Kolkata` timezone (configured in `JOB_TIMEZONE`):
  * **Daily Entry Reminder:** Runs Monday–Friday at 17:00 local time.
  * **Weekly Team Digest:** Runs Mondays at 08:00 local time, emailing managers a table summary of report hours.
  * **Missing Logs Alert:** Runs daily at 09:00 local time, alerting employees who are missing entries for the previous 2 working days.

---

## 5. Exports & Storage Workflow

The reports module generates exports dynamically and uploads them to Supabase Storage:
1. **CSV Export:** Generated in memory as comma-separated values.
2. **PDF Export:** Compiled into a binary stream using `pdfkit` (including document headers, stats, and a clean tabular format).
3. **Upload & Signed URLs:**
   * The controller checks if the `reports` bucket exists in Supabase Storage, creating it dynamically if missing.
   * Uploads the file buffer with correct Content-Type.
   * Generates a 1-hour signed URL and returns it to the client:
     ```json
     {
       "url": "https://uxemyxdwphnprmddyigl.supabase.co/storage/v1/object/sign/reports/export-xyz.pdf?token=..."
     }
     ```

---

## 6. Pre-Commit Verification Workflow

Before pushing code changes to your remote GitHub repository:
1. **Run Syntax Check:**
   Ensure all JavaScript code is free of compilation/parsing errors:
   ```powershell
   Get-ChildItem -Path src -Filter *.js -Recurse | ForEach-Object { node -c $_.FullName }
   ```
2. **Verify Security Locks:**
   Check `git status` to verify that your local `.env` file is NOT staged.
3. **Stage, Commit, and Push:**
   ```bash
   git add .
   git commit -m "feat: complete backend development cycle"
   git push -u origin main
   ```
