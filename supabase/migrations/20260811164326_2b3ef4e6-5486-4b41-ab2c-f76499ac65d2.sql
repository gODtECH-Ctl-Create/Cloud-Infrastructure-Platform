REVOKE ALL ON FUNCTION public.ensure_weekly_allowance(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.resolve_rate(uuid, public.customer_category) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_weekly_allowance(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_rate(uuid, public.customer_category) TO service_role;
