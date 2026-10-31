-- Deploy original auth source first. No accounts, notes or collaboration data are touched.
begin;
drop function public.consume_signup_verification_limit(text,text);
drop table public.signup_verification_limits;
notify pgrst, 'reload schema';
commit;
