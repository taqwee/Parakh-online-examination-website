-- =====================================================================
-- Online Examination System — Supabase schema + Row Level Security
-- Run this in the Supabase SQL editor on a fresh project.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  email       text,
  role        text not null default 'student' check (role in ('student', 'admin')),
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. exams
-- ---------------------------------------------------------------------
create table if not exists public.exams (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  description       text,
  duration_minutes  integer not null check (duration_minutes > 0),
  total_marks       integer not null default 0,
  pass_marks        integer not null default 0,
  is_published      boolean not null default false,
  created_by        uuid references public.profiles (id),
  created_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. questions
-- ---------------------------------------------------------------------
create table if not exists public.questions (
  id             uuid primary key default gen_random_uuid(),
  exam_id        uuid not null references public.exams (id) on delete cascade,
  question_text  text not null,
  marks          integer not null default 1 check (marks > 0),
  order_index    integer not null default 0,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. options
-- ---------------------------------------------------------------------
create table if not exists public.options (
  id            uuid primary key default gen_random_uuid(),
  question_id   uuid not null references public.questions (id) on delete cascade,
  option_text   text not null,
  is_correct    boolean not null default false,
  order_index   integer not null default 0
);

-- ---------------------------------------------------------------------
-- 5. exam_attempts
-- ---------------------------------------------------------------------
create table if not exists public.exam_attempts (
  id            uuid primary key default gen_random_uuid(),
  exam_id       uuid not null references public.exams (id),
  user_id       uuid not null references public.profiles (id),
  started_at    timestamptz not null default now(),
  submitted_at  timestamptz,
  score         numeric,
  percentage    numeric,
  status        text not null default 'in_progress'
                check (status in ('in_progress', 'completed', 'timed_out'))
);

-- Only one active attempt per student per exam.
create unique index if not exists one_in_progress_attempt_per_user_exam
  on public.exam_attempts (exam_id, user_id)
  where (status = 'in_progress');

-- ---------------------------------------------------------------------
-- 6. user_answers
-- ---------------------------------------------------------------------
create table if not exists public.user_answers (
  id                  uuid primary key default gen_random_uuid(),
  attempt_id          uuid not null references public.exam_attempts (id) on delete cascade,
  question_id         uuid not null references public.questions (id),
  selected_option_id  uuid references public.options (id),
  is_correct          boolean
);

-- Needed so the client can `upsert(..., { onConflict: 'attempt_id,question_id' })`
-- for autosave while the student answers questions.
create unique index if not exists user_answers_attempt_question_uidx
  on public.user_answers (attempt_id, question_id);

-- =====================================================================
-- Helper: is the current user an admin?
-- SECURITY DEFINER avoids RLS recursion when policies check role.
-- =====================================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles      enable row level security;
alter table public.exams         enable row level security;
alter table public.questions     enable row level security;
alter table public.options       enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.user_answers  enable row level security;

-- ---- profiles ----
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin());

-- ---- exams ----
create policy "exams_select_published_or_owner_or_admin"
  on public.exams for select
  using (is_published = true or created_by = auth.uid() or public.is_admin());

create policy "exams_insert_admin_only"
  on public.exams for insert
  with check (public.is_admin());

create policy "exams_update_admin_only"
  on public.exams for update
  using (public.is_admin());

create policy "exams_delete_admin_only"
  on public.exams for delete
  using (public.is_admin());

-- ---- questions ----
create policy "questions_select_if_exam_visible"
  on public.questions for select
  using (
    exists (
      select 1 from public.exams e
      where e.id = exam_id
        and (e.is_published = true or e.created_by = auth.uid() or public.is_admin())
    )
  );

create policy "questions_write_admin_only"
  on public.questions for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---- options ----
create policy "options_select_if_exam_visible"
  on public.options for select
  using (
    exists (
      select 1 from public.questions q
      join public.exams e on e.id = q.exam_id
      where q.id = question_id
        and (e.is_published = true or e.created_by = auth.uid() or public.is_admin())
    )
  );

create policy "options_write_admin_only"
  on public.options for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---- exam_attempts ----
create policy "attempts_select_own_or_admin"
  on public.exam_attempts for select
  using (user_id = auth.uid() or public.is_admin());

create policy "attempts_insert_own"
  on public.exam_attempts for insert
  with check (user_id = auth.uid());

create policy "attempts_update_own_or_admin"
  on public.exam_attempts for update
  using (user_id = auth.uid() or public.is_admin());

-- ---- user_answers ----
create policy "answers_select_own_or_admin"
  on public.user_answers for select
  using (
    exists (
      select 1 from public.exam_attempts a
      where a.id = attempt_id and (a.user_id = auth.uid() or public.is_admin())
    )
  );

create policy "answers_insert_own"
  on public.user_answers for insert
  with check (
    exists (
      select 1 from public.exam_attempts a
      where a.id = attempt_id and a.user_id = auth.uid()
    )
  );

create policy "answers_update_own"
  on public.user_answers for update
  using (
    exists (
      select 1 from public.exam_attempts a
      where a.id = attempt_id and a.user_id = auth.uid()
    )
  );

-- =====================================================================
-- Convenience: promote a user to admin after they've signed up, e.g.
--   update public.profiles set role = 'admin' where email = 'you@example.com';
-- =====================================================================
