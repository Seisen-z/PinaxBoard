-- A server-only diagnostic write; no user notes or synthetic user accounts.
begin;
create table public.app_health_probes (
  id uuid primary key default gen_random_uuid(),
  checked_at timestamptz not null default now()
);
create table public.app_maintenance_state (
  id boolean primary key default true check (id),
  last_checked_day date,
  last_checked_at timestamptz
);
insert into public.app_maintenance_state(id) values(true);
alter table public.app_health_probes enable row level security;
alter table public.app_maintenance_state enable row level security;
revoke all on public.app_health_probes, public.app_maintenance_state from public, anon, authenticated;
grant select on public.app_maintenance_state to service_role;

create function public.run_daily_health_check() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Asia/Shanghai')::date;
  previous_day date;
  probe_id uuid;
  removed integer;
begin
  -- Serialize replicas/restarts. Failed probes roll back the date as well.
  select last_checked_day into previous_day
    from public.app_maintenance_state where id = true for update;
  if previous_day >= today then
    return jsonb_build_object('status', 'already_checked', 'day', today);
  end if;
  insert into public.app_health_probes default values returning id into probe_id;
  delete from public.app_health_probes where id = probe_id;
  get diagnostics removed = row_count;
  if removed <> 1 then raise exception 'Health probe cleanup failed'; end if;
  update public.app_maintenance_state
    set last_checked_day = today, last_checked_at = now() where id = true;
  return jsonb_build_object('status', 'checked', 'day', today, 'deleted', removed);
end;
$$;
revoke all on function public.run_daily_health_check() from public, anon, authenticated;
grant execute on function public.run_daily_health_check() to service_role;
notify pgrst, 'reload schema';
commit;
