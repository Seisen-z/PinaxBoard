# Daily database health check

Migration `0009_daily_health_check.sql` installs a server-only diagnostic.
On Node app-server startup, Tackly checks whether it has completed today's
probe (Asia/Shanghai, UTC+8). A running server checks hourly for rollover and
retries failed attempts. The successful database operation runs at most once
per calendar day across server replicas and restarts.

The RPC inserts one random row into `app_health_probes` and immediately deletes
that exact row in the same transaction. No notes, accounts, or other user data
are created or removed. A single `app_maintenance_state` row stores the last
successful day/time. Cleanup failure rolls back the probe and success marker.
Both tables have RLS; anonymous and signed-in clients have no access. Only the
server's service-role credential can execute the RPC.

## Operation

- Requires existing `NEXT_PUBLIC_SUPABASE_URL` and server-only
  `SUPABASE_SERVICE_ROLE_KEY`. The Management API personal access token is used
  for installing migrations only, not by this scheduler.
- Runs automatically with `npm run dev` or `npm run start` after migration 0009.
  Production builds do not run it. Timers are unreferenced and cannot prevent
  normal process shutdown.
- Set `TACKLY_DAILY_HEALTH_CHECK=false` in the server environment and restart
  to disable. This is optional; default is enabled when credentials exist.
- The Node server must remain running. A sleeping computer, stopped process,
  paused database, or serverless/scale-to-zero deployment does not have a
  durable timer. Merely leaving a browser tab open is not enough. An external
  scheduler would be needed for that deployment model.
- This diagnostic is not an uptime guarantee or a guaranteed exemption from
  Supabase Free-plan inactivity pausing. Supabase assesses sufficient user
  database activity over a seven-day period; its documented no-inactivity-pause
  option is a paid plan. No plan or billing changes were made.

Official reference: [Supabase project pausing](https://supabase.com/docs/guides/platform/free-project-pausing).

## Inspect and disable

Run in Supabase SQL Editor as an administrator:

```sql
select last_checked_day, last_checked_at from public.app_maintenance_state;
select count(*) as residual_probe_rows from public.app_health_probes; -- 0
```

To remove the diagnostic, disable/restart the server first, then run
`supabase/rollback/0009_daily_health_check.sql`. This removes only its function
and two maintenance tables; notes and collaboration remain intact. Source
rollback is separate: use the evidence `ROLLBACK.sh` on the intended project
copy. Neither rollback restores the old paused project's data into this new
project.
