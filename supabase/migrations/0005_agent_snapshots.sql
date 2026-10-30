-- The agent admin snapshot: one row, written by scripts/agent-admin/push.js from the owner's machine
-- and read only by api/admin/agents.js, which checks the admin password first.
-- RLS is on with no policies on purpose: the public anon key can neither read nor write it.
create table agent_snapshots (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table agent_snapshots enable row level security;
