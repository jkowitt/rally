-- ============================================================
-- MIGRATION 104 — REAL-REPLY AUTO-PAUSE + AUTO-REPLY DETECTION
-- ============================================================
-- When a prospect replies to a sequence email from their own
-- mailbox, we want to:
--   1. Mark the outreach_log row as replied (replied_at = now()).
--   2. Pause the prospect_sequence_enrollment with reason='replied'
--      so the runner doesn't keep firing follow-ups into an active
--      conversation.
--   3. Surface this in the SequenceEditor so the rep can decide
--      whether to fully unenroll (pull contact + deal out) or
--      resume after handling the reply.
--
-- Critical: do NOT pause on auto-replies. An out-of-office bounce
-- isn't a real conversation — pausing would mute the cadence on
-- a perfectly engageable contact. We detect auto-replies with a
-- subject+body heuristic that catches the canonical formats from
-- Outlook OOF, Google Vacation responder, common autoresponders.
--
-- All of this fires AFTER INSERT on the underlying outlook_emails
-- and gmail_emails tables so it works regardless of how the row
-- got there (delta-sync, webhook, manual import).
-- ============================================================

-- ─── Auto-reply heuristic ──────────────────────────────────────
-- Returns true if the message subject/body look like an
-- auto-responder. Conservative — we err on the side of "real
-- reply" so we don't accidentally let an enrollment keep firing
-- after a genuine response; the cost of pausing a true reply is
-- a manual unpause click, the cost of missing a real reply and
-- sending another sequence step is a much worse experience.
create or replace function is_auto_reply_message(p_subject text, p_body text)
returns boolean
immutable
language plpgsql
as $$
declare
  v_subj text := coalesce(lower(p_subject), '');
  v_body text := coalesce(lower(left(p_body, 1500)), '');
begin
  -- Subject-line patterns — most auto-responders telegraph in the
  -- subject. Microsoft Outlook adds "Automatic reply:" prefix;
  -- Google Vacation responder doesn't modify the subject but
  -- their default copy hits the body. Apple Mail OOO uses
  -- "Out of Office" or "Out Of Office: …".
  if v_subj ~ '^\s*(automatic reply|auto[- ]?reply|auto[- ]?response|autoresponder|out of office|out of the office|out of office reply|away from( the)? office|currently out|on vacation|vacation reply|on holiday|on leave|on parental leave|out of country|away from email|away from my desk|away from work)' then
    return true;
  end if;
  if v_subj ~ '\[(auto|automatic)\s*(reply|response)\]' then
    return true;
  end if;
  -- Subject contains "(automatic reply)" suffix
  if v_subj ~ '\(automatic reply\)' then
    return true;
  end if;

  -- Body-only signals — short messages where the body opens with
  -- the canonical OOO phrasing. We don't false-positive on real
  -- replies that mention "I'm out of office" mid-paragraph because
  -- we require the phrase near the very top of the body.
  if length(v_body) > 0 and v_body ~ '^\s*(thanks for (your|the) (message|email|note|reach[ -]?out|outreach)[^.!?]{0,80}(out of (the )?office|away( from)?|on (vacation|leave|holiday|parental leave|maternity|paternity)))' then
    return true;
  end if;
  if length(v_body) > 0 and v_body ~ '^\s*(i am|i''m|i will be)\s+(currently\s+)?(out of (the )?(office|country)|away( from)?|on (vacation|leave|holiday|parental leave))' then
    return true;
  end if;
  if length(v_body) > 0 and v_body ~ '(this is an auto[- ]?(reply|response|generated|matic)|automated response|do not reply to this message|do[- ]not[- ]reply|noreply@|no[- ]?reply@)' then
    return true;
  end if;

  return false;
end;
$$;

grant execute on function is_auto_reply_message(text, text) to authenticated, service_role;

-- ─── Mark outreach replied + pause enrollment ─────────────────
-- Looks up an outbound outreach_log row in the same thread/
-- conversation that's tied to an active sequence enrollment.
-- If found:
--   • stamp outreach_log.replied_at on the FIRST matching outbound
--   • pause the enrollment with reason='replied' (idempotent —
--     re-replies to the same thread won't keep stomping)
--   • return the enrollment_id so the caller can log / notify
create or replace function mark_sequence_reply_received(
  p_property_id uuid,
  p_thread_id text,
  p_from_email text,
  p_received_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_log_id uuid;
  v_enrollment_id uuid;
begin
  if p_thread_id is null or p_from_email is null then return null; end if;

  -- Find the most recent outbound sequence email in this thread.
  -- Match by thread_id first (most reliable when present); fall
  -- back to to_email so a reply that lost its thread header still
  -- gets attributed to the right enrollment.
  select id, sequence_enrollment_id
    into v_log_id, v_enrollment_id
    from outreach_log
   where property_id = p_property_id
     and direction = 'outbound'
     and sequence_enrollment_id is not null
     and (
       (thread_id is not null and thread_id = p_thread_id)
       or (lower(to_email) = lower(p_from_email))
     )
     and replied_at is null
   order by sent_at desc
   limit 1;

  if v_enrollment_id is null then return null; end if;

  update outreach_log
     set replied_at = coalesce(p_received_at, now())
   where id = v_log_id
     and replied_at is null;

  update prospect_sequence_enrollments
     set paused = true,
         paused_at = coalesce(p_received_at, now()),
         paused_reason = 'replied'
   where id = v_enrollment_id
     and paused = false
     and completed = false;

  return v_enrollment_id;
end;
$$;

grant execute on function mark_sequence_reply_received(uuid, text, text, timestamptz) to authenticated, service_role;

-- ─── Triggers on outlook_emails / gmail_emails ────────────────
-- Fire on INSERT of an inbound (is_sent=false) message. Skip
-- auto-replies. Call the helper above.
-- The two underlying tables use different column names for thread
-- ID and body preview, so they get one trigger fn each rather than
-- a single shared one that has to introspect.
create or replace function trg_outlook_inbound_pauses_sequence()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.is_sent, false) then return new; end if;
  if is_auto_reply_message(new.subject, coalesce(new.body_text, new.body_preview)) then return new; end if;
  if new.property_id is null then return new; end if;
  perform mark_sequence_reply_received(new.property_id, new.conversation_id, new.from_email, new.received_at);
  return new;
end;
$$;

create or replace function trg_gmail_inbound_pauses_sequence()
returns trigger
language plpgsql
as $$
begin
  if coalesce(new.is_sent, false) then return new; end if;
  if is_auto_reply_message(new.subject, coalesce(new.body_text, new.snippet)) then return new; end if;
  if new.property_id is null then return new; end if;
  perform mark_sequence_reply_received(new.property_id, new.gmail_thread_id, new.from_email, new.received_at);
  return new;
end;
$$;

drop trigger if exists outlook_inbound_pauses_sequence on outlook_emails;
create trigger outlook_inbound_pauses_sequence
  after insert on outlook_emails
  for each row execute function trg_outlook_inbound_pauses_sequence();

drop trigger if exists gmail_inbound_pauses_sequence on gmail_emails;
create trigger gmail_inbound_pauses_sequence
  after insert on gmail_emails
  for each row execute function trg_gmail_inbound_pauses_sequence();
