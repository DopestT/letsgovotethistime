-- Partner Reply Intelligence Engine
-- Stores metadata + structured summaries only. Raw reply bodies remain in the email provider.

create table if not exists public.partner_reply_summaries (
  id uuid primary key default gen_random_uuid(),
  resend_email_id text not null unique,
  message_id text,
  thread_key text not null,
  sender text,
  subject text,
  received_at timestamptz not null,
  stance text not null check (stance in ('interested','needs_info','not_now','declined','auto_reply','unclear')),
  priority text not null check (priority in ('high','medium','low')),
  organization text,
  summary jsonb not null,
  notification_status text not null default 'pending' check (notification_status in ('pending','sent','failed')),
  notification_channel text check (notification_channel in ('sms','email','log')),
  notification_id text,
  notification_updated_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists partner_reply_summaries_thread_key_idx
  on public.partner_reply_summaries (thread_key);

create index if not exists partner_reply_summaries_received_at_idx
  on public.partner_reply_summaries (received_at desc);

create index if not exists partner_reply_summaries_priority_idx
  on public.partner_reply_summaries (priority, received_at desc);

create index if not exists partner_reply_summaries_notification_status_idx
  on public.partner_reply_summaries (notification_status, created_at desc);

alter table public.partner_reply_summaries enable row level security;

-- No client-side policies are created intentionally.
-- The serverless engine writes with the Supabase service-role key.
