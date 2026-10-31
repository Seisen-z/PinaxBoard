-- Disables the diagnostic only; never touches notes, accounts, or sharing.
begin;
drop function public.run_daily_health_check();
drop table public.app_health_probes;
drop table public.app_maintenance_state;
notify pgrst, 'reload schema';
commit;
