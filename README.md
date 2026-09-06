# ExamHub — Online Examination System

A production-ready MCQ examination platform: React (Vite) + Tailwind CSS on the
frontend, Supabase (PostgreSQL + Auth) as the backend.

## Stack

- **Frontend:** React 18, React Router, Tailwind CSS
- **Backend:** Supabase (Postgres, Auth, Row Level Security) — accessed
  directly from the client via `@supabase/supabase-js`, so there's no
  separate API server to run
- **Auth:** Supabase Auth (email/password), with a `profiles` table carrying
  the `role` (`student` / `admin`)

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql).
   This creates all six tables, the `is_admin()` helper, and every RLS policy.
3. In **Project Settings → API**, copy the **Project URL** and **anon public key**.
4. Sign up through the app once (as yourself), then promote your account to
   admin from the SQL editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
   Everyone else who registers through the app stays a `student` by default.

## 2. Configure the frontend

```bash
cp .env.example .env
# then edit .env with your Project URL and anon key
```

## 3. Install & run

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`. Sign in with your admin account to reach
`/admin`, or register a new account to land on the student `/dashboard`.

```bash
npm run build     # production build to dist/
npm run preview   # preview the production build locally
```

## How the pieces fit together

- **`src/lib/supabaseClient.js`** — single Supabase client instance, reads
  credentials from `.env`.
- **`src/context/AuthContext.jsx`** — wraps the app, exposes `session`,
  `profile`, `role`, and `signIn` / `signUp` / `signOut`. Also handles
  writing the initial `profiles` row on sign-up.
- **`src/components/ProtectedRoute.jsx`** — redirects unauthenticated users
  to `/login`, and redirects students away from `/admin` (and vice versa).
- **`src/pages/Exam.jsx`** — the exam engine:
  - Fetches (or creates, via a unique partial index) a single
    `in_progress` attempt per student per exam, so refreshing the page
    resumes the same attempt instead of starting over.
  - `src/hooks/useCountdown.js` derives the timer from
    `attempt.started_at + exam.duration_minutes`, not a client-side
    counter, so it can't be reset by a page refresh; it auto-submits
    (`status = 'timed_out'`) when it hits zero.
  - Every answer selection is immediately **upserted** to `user_answers`
    (autosave / anti-refresh), keyed by the `(attempt_id, question_id)`
    unique index in the schema.
  - The question palette is derived from a `statuses` array (`answered` /
    `unanswered` / `marked` / `not-visited`) kept in sync with `answers`.
- **`src/pages/Results.jsx`** — reloads the attempt, questions, options,
  and saved answers, and recomputes correct/incorrect/unattempted counts
  for the breakdown and the per-question review.
- **`src/pages/Admin.jsx`** + **`src/components/ExamBuilderModal.jsx`** —
  exam CRUD, a dynamic question/option builder (radio buttons enforce a
  single correct option per question, matching `options.is_correct`), and
  a submissions table with CSV export (built client-side with a `Blob`,
  no extra library needed).

## Security notes

- All access control is enforced by **Postgres Row Level Security**
  (see `supabase/schema.sql`), not just hidden in the UI — a student
  calling the Supabase API directly still can't read another student's
  answers, edit exams, or see unpublished exams.
- The anon key is safe to ship to the browser; it only grants what RLS
  allows.
- Scoring is computed and written to `exam_attempts` from the client in
  this version (simplest for a self-contained demo). For a stricter
  production setup, move `finalizeSubmit`'s scoring logic into a Postgres
  function (`security definer`) or an edge function so a modified client
  can't report a fake score — the schema and RLS already support that
  migration without any table changes.
