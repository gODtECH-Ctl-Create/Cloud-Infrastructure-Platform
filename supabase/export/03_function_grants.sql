-- Waste to Work — 03_function_grants.sql
-- Locks down EXECUTE privileges on helper/internal functions.
-- Run THIRD, after 02_functions_triggers.sql (order matters: these revokes must land last).
-- Source: supabase/migrations/20260811164148 + 20260811164326 (verbatim).

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_manager(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_staff_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_manager(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.ensure_weekly_allowance(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.resolve_rate(uuid, public.customer_category) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_weekly_allowance(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_rate(uuid, public.customer_category) TO service_role;
