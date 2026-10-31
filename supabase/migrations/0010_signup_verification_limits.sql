begin;
-- Private abuse-prevention state: no addresses, passwords, codes or user content.
create table public.signup_verification_limits (
  identifier_hash text not null check (identifier_hash ~ '^[0-9a-f]{64}$'),
  kind text not null check (kind in ('send', 'verify')),
  window_started_at timestamptz not null,
  last_attempt_at timestamptz not null,
  attempts integer not null check (attempts between 1 and 5),
  primary key (identifier_hash, kind)
);
alter table public.signup_verification_limits enable row level security;
revoke all on public.signup_verification_limits from public, anon, authenticated;

create function public.consume_signup_verification_limit(p_identifier_hash text, p_kind text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  stamp timestamptz := clock_timestamp();
  state public.signup_verification_limits%rowtype;
  span interval;
  maximum integer;
  wait_seconds integer;
begin
  if p_identifier_hash !~ '^[0-9a-f]{64}$' or p_identifier_hash is null
     or p_kind not in ('send', 'verify') or p_kind is null then
    raise exception 'Invalid verification rate key' using errcode = '22023';
  end if;
  span := case when p_kind = 'send' then interval '15 minutes' else interval '10 minutes' end;
  maximum := case when p_kind = 'send' then 3 else 5 end;
  -- Bounded opportunistic retention; only this server-only table is affected.
  delete from public.signup_verification_limits where window_started_at < stamp - interval '1 day';
  insert into public.signup_verification_limits values(p_identifier_hash, p_kind, stamp, stamp, 1)
    on conflict do nothing;
  if found then return jsonb_build_object('allowed', true, 'retryAfterSeconds', 0); end if;
  select * into strict state from public.signup_verification_limits
    where identifier_hash = p_identifier_hash and kind = p_kind for update;
  if state.window_started_at + span <= stamp then
    update public.signup_verification_limits set window_started_at = stamp, last_attempt_at = stamp, attempts = 1
      where identifier_hash = p_identifier_hash and kind = p_kind;
    return jsonb_build_object('allowed', true, 'retryAfterSeconds', 0);
  end if;
  wait_seconds := greatest(0, ceil(extract(epoch from state.window_started_at + span - stamp))::integer);
  if state.attempts >= maximum then
    return jsonb_build_object('allowed', false, 'retryAfterSeconds', wait_seconds);
  end if;
  if p_kind = 'send' and state.last_attempt_at + interval '60 seconds' > stamp then
    return jsonb_build_object('allowed', false, 'retryAfterSeconds',
      ceil(extract(epoch from state.last_attempt_at + interval '60 seconds' - stamp))::integer);
  end if;
  update public.signup_verification_limits set attempts = attempts + 1, last_attempt_at = stamp
    where identifier_hash = p_identifier_hash and kind = p_kind;
  return jsonb_build_object('allowed', true, 'retryAfterSeconds', 0);
end;
$$;
revoke all on function public.consume_signup_verification_limit(text,text) from public, anon, authenticated;
grant execute on function public.consume_signup_verification_limit(text,text) to service_role;
notify pgrst, 'reload schema';
commit;
