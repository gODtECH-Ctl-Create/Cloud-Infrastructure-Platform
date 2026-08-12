-- Waste to Work — 02_functions_triggers.sql
-- Business logic RPCs (sessions, allowances, rates, pauses) + role bootstrap.
-- Run SECOND, after 01_schema_rls.sql.
-- Source: supabase/migrations/20260811164316 (verbatim).

-- ============ ROLE BOOTSTRAP ============
CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles) THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin');
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id)
  VALUES (v_uid, 'claim_first_admin', 'user_roles', v_uid);
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.claim_first_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ ALLOWANCE ============
CREATE OR REPLACE FUNCTION public.ensure_weekly_allowance(_subscription_id uuid)
RETURNS public.subscription_weekly_allowances
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_week date := date_trunc('week', now())::date;
  v_row public.subscription_weekly_allowances;
  v_plan public.subscription_plans;
  v_prev public.subscription_weekly_allowances;
  v_rollover numeric(8,2) := 0;
BEGIN
  SELECT * INTO v_row FROM public.subscription_weekly_allowances
   WHERE subscription_id = _subscription_id AND week_start = v_week;
  IF FOUND THEN RETURN v_row; END IF;

  SELECT p.* INTO v_plan FROM public.subscription_plans p
    JOIN public.customer_subscriptions s ON s.plan_id = p.id
   WHERE s.id = _subscription_id;

  SELECT * INTO v_prev FROM public.subscription_weekly_allowances
   WHERE subscription_id = _subscription_id AND week_start < v_week
   ORDER BY week_start DESC LIMIT 1;

  IF v_plan.rollover_enabled AND v_prev.id IS NOT NULL THEN
    v_rollover := GREATEST(0, (v_prev.allowance_hours + v_prev.rollover_in_hours) - v_prev.hours_used);
    v_rollover := LEAST(v_rollover, v_plan.max_rollover_hours);
    UPDATE public.subscription_weekly_allowances
       SET rollover_out_hours = v_rollover WHERE id = v_prev.id;
  END IF;

  INSERT INTO public.subscription_weekly_allowances
    (subscription_id, week_start, allowance_hours, rollover_in_hours)
  VALUES (_subscription_id, v_week, COALESCE(v_plan.weekly_hours, 0), v_rollover)
  ON CONFLICT (subscription_id, week_start) DO UPDATE SET updated_at = now()
  RETURNING * INTO v_row;
  RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.ensure_weekly_allowance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_weekly_allowance(uuid) TO authenticated;

-- ============ RATE RESOLUTION ============
CREATE OR REPLACE FUNCTION public.resolve_rate(_branch_id uuid, _category public.customer_category)
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT rate_per_hour_minor FROM public.pricing_rates
     WHERE is_active
       AND category = _category
       AND (branch_id = _branch_id OR branch_id IS NULL)
       AND effective_from <= now()
       AND (effective_to IS NULL OR effective_to > now())
     ORDER BY (branch_id IS NOT NULL) DESC, effective_from DESC
     LIMIT 1
  ), 0);
$$;
REVOKE ALL ON FUNCTION public.resolve_rate(uuid, public.customer_category) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_rate(uuid, public.customer_category) TO authenticated;

-- ============ SESSION LIFECYCLE ============
CREATE OR REPLACE FUNCTION public.start_session(
  _customer_id uuid,
  _branch_id uuid,
  _planned_minutes integer DEFAULT NULL,
  _authorized_user_id uuid DEFAULT NULL
) RETURNS public.sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_customer public.customers;
  v_sub public.customer_subscriptions;
  v_session public.sessions;
  v_mode public.billing_mode := 'walk_in';
  v_rate bigint;
BEGIN
  IF NOT public.is_staff(v_uid) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  IF (SELECT (value->>'active')::boolean FROM public.system_settings WHERE key = 'global_pause') THEN
    RAISE EXCEPTION 'System is paused';
  END IF;
  IF EXISTS (SELECT 1 FROM public.branches WHERE id = _branch_id AND (is_paused OR NOT is_active)) THEN
    RAISE EXCEPTION 'Branch is paused or inactive';
  END IF;

  SELECT * INTO v_customer FROM public.customers WHERE id = _customer_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Customer not found or inactive'; END IF;

  IF EXISTS (SELECT 1 FROM public.sessions WHERE customer_id = _customer_id AND status IN ('active','paused')) THEN
    RAISE EXCEPTION 'Customer already has an open session';
  END IF;

  SELECT * INTO v_sub FROM public.customer_subscriptions
   WHERE customer_id = _customer_id AND status = 'active'
     AND (ends_on IS NULL OR ends_on >= CURRENT_DATE)
   ORDER BY started_on DESC LIMIT 1;
  IF v_sub.id IS NOT NULL THEN
    v_mode := 'subscription';
    PERFORM public.ensure_weekly_allowance(v_sub.id);
  END IF;

  v_rate := public.resolve_rate(_branch_id, v_customer.category);

  INSERT INTO public.sessions (
    customer_id, branch_id, subscription_id, authorized_user_id, status,
    billing_mode, rate_per_hour_minor, planned_minutes, opened_by
  ) VALUES (
    _customer_id, _branch_id, v_sub.id, _authorized_user_id, 'active',
    v_mode, v_rate, _planned_minutes, v_uid
  ) RETURNING * INTO v_session;

  INSERT INTO public.audit_logs (actor_id, branch_id, action, entity_type, entity_id, details)
  VALUES (v_uid, _branch_id, 'session_started', 'sessions', v_session.id,
          jsonb_build_object('customer_id', _customer_id, 'billing_mode', v_mode));
  RETURN v_session;
END; $$;
REVOKE ALL ON FUNCTION public.start_session(uuid, uuid, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_session(uuid, uuid, integer, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.pause_session(
  _session_id uuid, _reason text DEFAULT NULL, _scope public.pause_scope DEFAULT 'session'
) RETURNS public.sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_session public.sessions;
BEGIN
  IF NOT public.is_staff(v_uid) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  SELECT * INTO v_session FROM public.sessions WHERE id = _session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF v_session.status <> 'active' THEN RETURN v_session; END IF;

  UPDATE public.sessions SET status = 'paused', paused_at = now()
   WHERE id = _session_id RETURNING * INTO v_session;
  INSERT INTO public.session_pauses (session_id, scope, reason, paused_by)
  VALUES (_session_id, _scope, _reason, v_uid);
  INSERT INTO public.audit_logs (actor_id, branch_id, action, entity_type, entity_id, details)
  VALUES (v_uid, v_session.branch_id, 'session_paused', 'sessions', _session_id,
          jsonb_build_object('reason', _reason, 'scope', _scope));
  RETURN v_session;
END; $$;
REVOKE ALL ON FUNCTION public.pause_session(uuid, text, public.pause_scope) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pause_session(uuid, text, public.pause_scope) TO authenticated;

CREATE OR REPLACE FUNCTION public.resume_session(_session_id uuid)
RETURNS public.sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_session public.sessions; v_delta integer;
BEGIN
  IF NOT public.is_staff(v_uid) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  SELECT * INTO v_session FROM public.sessions WHERE id = _session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF v_session.status <> 'paused' THEN RETURN v_session; END IF;

  v_delta := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - COALESCE(v_session.paused_at, now()))))::integer);
  UPDATE public.sessions
     SET status = 'active', paused_at = NULL, paused_seconds = paused_seconds + v_delta
   WHERE id = _session_id RETURNING * INTO v_session;
  UPDATE public.session_pauses SET resumed_at = now(), resumed_by = v_uid
   WHERE session_id = _session_id AND resumed_at IS NULL;
  INSERT INTO public.audit_logs (actor_id, branch_id, action, entity_type, entity_id, details)
  VALUES (v_uid, v_session.branch_id, 'session_resumed', 'sessions', _session_id,
          jsonb_build_object('paused_seconds_added', v_delta));
  RETURN v_session;
END; $$;
REVOKE ALL ON FUNCTION public.resume_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resume_session(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.extend_session(_session_id uuid, _minutes integer)
RETURNS public.sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_session public.sessions;
BEGIN
  IF NOT public.is_staff(v_uid) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  IF _minutes IS NULL OR _minutes <= 0 THEN RAISE EXCEPTION 'Minutes must be positive'; END IF;
  UPDATE public.sessions
     SET extension_minutes = extension_minutes + _minutes,
         planned_minutes = COALESCE(planned_minutes, 0) + _minutes
   WHERE id = _session_id AND status IN ('active','paused')
   RETURNING * INTO v_session;
  IF NOT FOUND THEN RAISE EXCEPTION 'No open session found'; END IF;
  INSERT INTO public.audit_logs (actor_id, branch_id, action, entity_type, entity_id, details)
  VALUES (v_uid, v_session.branch_id, 'session_extended', 'sessions', _session_id,
          jsonb_build_object('minutes', _minutes));
  RETURN v_session;
END; $$;
REVOKE ALL ON FUNCTION public.extend_session(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.extend_session(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.end_session(_session_id uuid, _notes text DEFAULT NULL)
RETURNS public.sessions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_session public.sessions;
  v_paused integer;
  v_elapsed_min integer;
  v_allow public.subscription_weekly_allowances;
  v_available_min integer := 0;
  v_sub_min integer := 0;
  v_billable_min integer;
  v_amount bigint := 0;
BEGIN
  IF NOT public.is_staff(v_uid) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  SELECT * INTO v_session FROM public.sessions WHERE id = _session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF v_session.status NOT IN ('active','paused') THEN RETURN v_session; END IF;

  v_paused := v_session.paused_seconds;
  IF v_session.status = 'paused' AND v_session.paused_at IS NOT NULL THEN
    v_paused := v_paused + GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - v_session.paused_at)))::integer);
  END IF;

  v_elapsed_min := GREATEST(0, CEIL(
    (EXTRACT(EPOCH FROM (now() - v_session.started_at)) - v_paused) / 60.0
  )::integer);

  IF v_session.subscription_id IS NOT NULL THEN
    v_allow := public.ensure_weekly_allowance(v_session.subscription_id);
    v_available_min := GREATEST(0, FLOOR(
      ((v_allow.allowance_hours + v_allow.rollover_in_hours) - v_allow.hours_used) * 60
    )::integer);
    v_sub_min := LEAST(v_elapsed_min, v_available_min);
    IF v_sub_min > 0 THEN
      UPDATE public.subscription_weekly_allowances
         SET hours_used = hours_used + (v_sub_min / 60.0)
       WHERE id = v_allow.id;
    END IF;
  END IF;

  v_billable_min := v_elapsed_min - v_sub_min;
  v_amount := ROUND(v_billable_min * v_session.rate_per_hour_minor / 60.0);

  UPDATE public.sessions
     SET status = 'completed', ended_at = now(), paused_at = NULL,
         paused_seconds = v_paused,
         billable_minutes = v_billable_min,
         subscription_minutes_used = v_sub_min,
         amount_due_minor = v_amount,
         notes = COALESCE(_notes, notes),
         closed_by = v_uid
   WHERE id = _session_id RETURNING * INTO v_session;

  UPDATE public.session_pauses SET resumed_at = now(), resumed_by = v_uid
   WHERE session_id = _session_id AND resumed_at IS NULL;

  INSERT INTO public.audit_logs (actor_id, branch_id, action, entity_type, entity_id, details)
  VALUES (v_uid, v_session.branch_id, 'session_ended', 'sessions', _session_id,
          jsonb_build_object('elapsed_minutes', v_elapsed_min, 'subscription_minutes', v_sub_min,
                             'billable_minutes', v_billable_min, 'amount_minor', v_amount));
  RETURN v_session;
END; $$;
REVOKE ALL ON FUNCTION public.end_session(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.end_session(uuid, text) TO authenticated;

-- ============ BRANCH / SYSTEM PAUSE ============
CREATE OR REPLACE FUNCTION public.set_branch_pause(_branch_id uuid, _paused boolean, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); r record;
BEGIN
  IF NOT public.is_staff(v_uid) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  UPDATE public.branches
     SET is_paused = _paused, pause_reason = CASE WHEN _paused THEN _reason ELSE NULL END,
         paused_at = CASE WHEN _paused THEN now() ELSE NULL END
   WHERE id = _branch_id;

  IF _paused THEN
    FOR r IN SELECT id FROM public.sessions WHERE branch_id = _branch_id AND status = 'active' LOOP
      PERFORM public.pause_session(r.id, _reason, 'branch');
    END LOOP;
  ELSE
    FOR r IN SELECT id FROM public.sessions WHERE branch_id = _branch_id AND status = 'paused' LOOP
      PERFORM public.resume_session(r.id);
    END LOOP;
  END IF;

  INSERT INTO public.audit_logs (actor_id, branch_id, action, entity_type, entity_id, details)
  VALUES (v_uid, _branch_id, CASE WHEN _paused THEN 'branch_paused' ELSE 'branch_resumed' END,
          'branches', _branch_id, jsonb_build_object('reason', _reason));
END; $$;
REVOKE ALL ON FUNCTION public.set_branch_pause(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_branch_pause(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_global_pause(_paused boolean, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); r record;
BEGIN
  IF NOT public.is_manager(v_uid) THEN RAISE EXCEPTION 'Not authorised'; END IF;
  UPDATE public.system_settings
     SET value = jsonb_build_object('active', _paused, 'reason', _reason),
         updated_by = v_uid, updated_at = now()
   WHERE key = 'global_pause';

  FOR r IN SELECT id FROM public.branches WHERE is_active LOOP
    PERFORM public.set_branch_pause(r.id, _paused, COALESCE(_reason, 'System-wide pause'));
  END LOOP;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, details)
  VALUES (v_uid, CASE WHEN _paused THEN 'system_paused' ELSE 'system_resumed' END,
          'system_settings', jsonb_build_object('reason', _reason));
END; $$;
REVOKE ALL ON FUNCTION public.set_global_pause(boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_global_pause(boolean, text) TO authenticated;
