-- ─────────────────────────────────────────────────────────────────────────────
-- Vyro Browser — Supabase Schema
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── History ───────────────────────────────────────────────────────────────────
create table if not exists history (
  id           text primary key,
  profile_id   text not null,
  url          text not null,
  title        text,
  favicon      text,
  visit_count  integer default 1,
  last_visited_at timestamptz default now(),
  user_id      uuid references auth.users(id) on delete cascade
);
alter table history enable row level security;
create policy "Users can manage their own history"
  on history for all using (auth.uid() = user_id);

-- ── Bookmarks ─────────────────────────────────────────────────────────────────
create table if not exists bookmark_folders (
  id         text primary key,
  profile_id text not null,
  parent_id  text references bookmark_folders(id) on delete cascade,
  name       text not null,
  sort_index integer default 0,
  created_at timestamptz default now(),
  user_id    uuid references auth.users(id) on delete cascade
);
alter table bookmark_folders enable row level security;
create policy "Users can manage their own bookmark folders"
  on bookmark_folders for all using (auth.uid() = user_id);

create table if not exists bookmarks (
  id         text primary key,
  profile_id text not null,
  folder_id  text references bookmark_folders(id) on delete set null,
  url        text not null,
  title      text,
  favicon    text,
  sort_index integer default 0,
  created_at timestamptz default now(),
  user_id    uuid references auth.users(id) on delete cascade
);
alter table bookmarks enable row level security;
create policy "Users can manage their own bookmarks"
  on bookmarks for all using (auth.uid() = user_id);

-- ── Settings ──────────────────────────────────────────────────────────────────
create table if not exists settings (
  profile_id text not null,
  key        text not null,
  value      text,
  updated_at timestamptz default now(),
  user_id    uuid references auth.users(id) on delete cascade,
  primary key (profile_id, key)
);
alter table settings enable row level security;
create policy "Users can manage their own settings"
  on settings for all using (auth.uid() = user_id);

-- ── AI Conversations ──────────────────────────────────────────────────────────
create table if not exists ai_conversations (
  id            text primary key,
  profile_id    text not null,
  title         text default 'New Chat',
  model         text,
  system_prompt text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  user_id       uuid references auth.users(id) on delete cascade
);
alter table ai_conversations enable row level security;
create policy "Users can manage their own AI conversations"
  on ai_conversations for all using (auth.uid() = user_id);

create table if not exists ai_messages (
  id              text primary key,
  conversation_id text references ai_conversations(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant', 'system')),
  content         text not null,
  created_at      timestamptz default now(),
  user_id         uuid references auth.users(id) on delete cascade
);
alter table ai_messages enable row level security;
create policy "Users can manage their own AI messages"
  on ai_messages for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger: auto-set user_id on insert from auth.uid()
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function set_user_id()
returns trigger language plpgsql security definer as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;

create or replace trigger set_history_user_id
  before insert on history for each row execute procedure set_user_id();

create or replace trigger set_bookmark_folders_user_id
  before insert on bookmark_folders for each row execute procedure set_user_id();

create or replace trigger set_bookmarks_user_id
  before insert on bookmarks for each row execute procedure set_user_id();

create or replace trigger set_settings_user_id
  before insert on settings for each row execute procedure set_user_id();

create or replace trigger set_ai_conversations_user_id
  before insert on ai_conversations for each row execute procedure set_user_id();

create or replace trigger set_ai_messages_user_id
  before insert on ai_messages for each row execute procedure set_user_id();
