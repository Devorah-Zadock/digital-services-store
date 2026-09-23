-- One-time setup: paste this whole file into Supabase Dashboard → SQL
-- Editor → New query → Run.
--
-- Reuses the same `profiles` table quote-app.js already fills in (one
-- business letterhead, shared across every DeskKit tool) — just adds
-- the one extra fact invoices need that quotes never needed: whether
-- this business charges VAT at all. A חשבונית מס-קבלה (tax invoice-
-- receipt) and a plain קבלה (receipt) are legally different documents
-- — an עוסק פטור is not allowed to issue the former at all — so the
-- document type this tool generates follows this field, never a free
-- per-invoice choice.
alter table profiles
  add column if not exists business_type text not null default 'licensed'
  check (business_type in ('licensed', 'exempt'));

-- One row per saved invoice/receipt/credit-note, same shape as
-- quote_saves. Unlike a quote, this can't stay freely editable forever:
-- once issued (status='issued'), the row is legally a real numbered
-- document and must never change again — see the update policy and
-- finalize_invoice() below, which are what actually enforce that (a
-- client-side "readonly" attribute alone proves nothing once someone
-- can just call the REST API directly).
create table if not exists invoice_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  doc_type text not null check (doc_type in ('invoice_receipt', 'receipt', 'credit_note')),
  status text not null default 'draft' check (status in ('draft', 'issued')),
  number integer,                                          -- assigned only at issue time
  original_invoice_id uuid references invoice_saves(id),   -- set only on a credit_note
  data jsonb not null,
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoice_saves_user_id_idx on invoice_saves (user_id);

alter table invoice_saves enable row level security;

drop policy if exists "invoice_saves_select_own" on invoice_saves;
create policy "invoice_saves_select_own" on invoice_saves
  for select using (auth.uid() = user_id);

-- A credit_note may only ever point at one of THIS business's own
-- already-issued documents — otherwise someone could craft a credit
-- note that references (and, via the UI, appears to cancel) a document
-- that isn't even theirs.
drop policy if exists "invoice_saves_insert_own" on invoice_saves;
create policy "invoice_saves_insert_own" on invoice_saves
  for insert with check (
    auth.uid() = user_id and status = 'draft' and number is null
    and (
      original_invoice_id is null
      or exists (
        select 1 from invoice_saves oi
        where oi.id = original_invoice_id and oi.user_id = auth.uid() and oi.status = 'issued'
      )
    )
  );

-- A draft can be freely edited (autosave, same as a quote) — but once
-- status flips to 'issued' this policy blocks every further update,
-- including one that tries to sneak status back to 'draft'. The only
-- path from draft to issued is finalize_invoice() below, which runs as
-- the function owner (security definer) and so isn't subject to this
-- policy at all.
drop policy if exists "invoice_saves_update_own_draft" on invoice_saves;
create policy "invoice_saves_update_own_draft" on invoice_saves
  for update using (auth.uid() = user_id and status = 'draft')
  with check (auth.uid() = user_id and status = 'draft');

drop policy if exists "invoice_saves_delete_own_draft" on invoice_saves;
create policy "invoice_saves_delete_own_draft" on invoice_saves
  for delete using (auth.uid() = user_id and status = 'draft');

-- One counter per (business, document series) — Israeli practice keeps
-- a separate gap-free sequential series per document TYPE (a חשבונית
-- מס-קבלה series is entirely independent from a זיכוי series, etc.),
-- so this is keyed on doc_type too, not just the business. No RLS
-- policy grants any direct client access here at all — finalize_invoice()
-- below (security definer) is the only thing that ever reads or writes
-- it, so a client can never read, guess, or race the next number.
create table if not exists invoice_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  doc_type text not null,
  next_number integer not null default 1,
  primary key (user_id, doc_type)
);

alter table invoice_counters enable row level security;

-- Atomically assigns the next sequential number for this business's
-- doc_type series and locks the row as issued, in one transaction. The
-- naive "read next_number, then write number+1" a client might do has a
-- real race: two rapid clicks, or two open tabs, could both read the
-- same number before either writes it back, handing out a duplicate —
-- a real problem for a legally sequential series. A single UPDATE
-- statement is itself atomic per row in Postgres (a second concurrent
-- UPDATE to the same counter row simply blocks until the first commits,
-- then proceeds against the now-incremented value), so no explicit
-- locking is needed on invoice_counters; the `for update` on the
-- invoice_saves row below only guards against double-finalizing the
-- exact same invoice from two clicks.
create or replace function finalize_invoice(p_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_doc_type text;
  v_status text;
  v_number integer;
begin
  select user_id, doc_type, status into v_user_id, v_doc_type, v_status
  from invoice_saves where id = p_id for update;

  if v_user_id is null then
    raise exception 'invoice not found';
  end if;
  if v_user_id <> auth.uid() then
    raise exception 'not your invoice';
  end if;
  if v_status <> 'draft' then
    raise exception 'already issued';
  end if;

  insert into invoice_counters (user_id, doc_type, next_number)
  values (v_user_id, v_doc_type, 1)
  on conflict (user_id, doc_type) do nothing;

  update invoice_counters
  set next_number = next_number + 1
  where user_id = v_user_id and doc_type = v_doc_type
  returning next_number - 1 into v_number;

  update invoice_saves
  set status = 'issued', number = v_number, issued_at = now(), updated_at = now()
  where id = p_id;

  return v_number;
end;
$$;

grant execute on function finalize_invoice(uuid) to authenticated;

-- Optional: if you're migrating from an existing paper/other-system
-- numbering and want your first real invoice to continue that series
-- instead of starting back at 1, run this once per doc_type BEFORE
-- issuing anything for real (replace the numbers):
--   insert into invoice_counters (user_id, doc_type, next_number)
--   values ('<your-user-id>', 'invoice_receipt', 1042)
--   on conflict (user_id, doc_type) do update set next_number = excluded.next_number;
