-- ============ ENUM: cancelled payment state ============
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'cancelled';

-- ============ STAFF BRANCH ACCESS ============
CREATE TABLE public.staff_branch_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, branch_id)
);
GRANT SELECT ON public.staff_branch_access TO authenticated;
GRANT ALL ON public.staff_branch_access TO service_role;
ALTER TABLE public.staff_branch_access ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_staff_branch_access_updated BEFORE UPDATE ON public.staff_branch_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.staff_is_active(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT is_active FROM public.staff_profiles WHERE id = _user_id), false);
$$;

CREATE OR REPLACE FUNCTION public.has_branch_access(_user_id uuid, _branch_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_staff(_user_id)
     AND public.staff_is_active(_user_id)
     AND (
       public.is_admin(_user_id)
       OR _branch_id IS NULL
       OR EXISTS (
         SELECT 1 FROM public.staff_branch_access
          WHERE user_id = _user_id AND branch_id = _branch_id
       )
     );
$$;

CREATE POLICY "Staff view own branch access" ON public.staff_branch_access FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_manager(auth.uid()));

-- Backfill: existing non-admin staff keep access to every current branch.
INSERT INTO public.staff_branch_access (user_id, branch_id)
SELECT ur.user_id, b.id
  FROM (SELECT DISTINCT user_id FROM public.user_roles) ur
  CROSS JOIN public.branches b
 WHERE NOT public.is_admin(ur.user_id)
ON CONFLICT (user_id, branch_id) DO NOTHING;

-- ============ PAYMENTS: state, confirmation, idempotency ============
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS void_reason text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency
  ON public.payments (idempotency_key) WHERE idempotency_key IS NOT NULL;

UPDATE public.payments SET confirmed_at = COALESCE(confirmed_at, paid_at)
 WHERE status = 'confirmed';

ALTER TABLE public.payments
  ADD CONSTRAINT payments_method_check
  CHECK (method IN ('cash','transfer','pos','other'));

-- Branch-scoped access for operational tables
DROP POLICY IF EXISTS "Staff view payments" ON public.payments;
DROP POLICY IF EXISTS "Staff record payments" ON public.payments;
CREATE POLICY "Staff view branch payments" ON public.payments FOR SELECT TO authenticated
  USING (public.has_branch_access(auth.uid(), branch_id));
CREATE POLICY "Staff record branch payments" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (public.has_branch_access(auth.uid(), branch_id));
DROP POLICY IF EXISTS "Managers delete payments" ON public.payments;

DROP POLICY IF EXISTS "Staff view sessions" ON public.sessions;
DROP POLICY IF EXISTS "Staff create sessions" ON public.sessions;
DROP POLICY IF EXISTS "Staff update sessions" ON public.sessions;
CREATE POLICY "Staff view branch sessions" ON public.sessions FOR SELECT TO authenticated
  USING (public.has_branch_access(auth.uid(), branch_id));
CREATE POLICY "Staff create branch sessions" ON public.sessions FOR INSERT TO authenticated
  WITH CHECK (public.has_branch_access(auth.uid(), branch_id));
CREATE POLICY "Staff update branch sessions" ON public.sessions FOR UPDATE TO authenticated
  USING (public.has_branch_access(auth.uid(), branch_id))
  WITH CHECK (public.has_branch_access(auth.uid(), branch_id));

-- ============ ADMIN: staff, roles, branch access ============
CREATE OR REPLACE FUNCTION public.admin_set_staff_role(_user_id uuid, _role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF NOT public.is_admin(v_uid) THEN RAISE EXCEPTION 'Admins only'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
  VALUES (v_uid, 'staff_role_set', 'user_roles', _user_id, jsonb_build_object('role', _role));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_staff_active(_user_id uuid, _is_active boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF NOT public.is_admin(v_uid) THEN RAISE EXCEPTION 'Admins only'; END IF;
  UPDATE public.staff_profiles SET is_active = _is_active WHERE id = _user_id;
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
  VALUES (v_uid, CASE WHEN _is_active THEN 'staff_activated' ELSE 'staff_deactivated' END,
          'staff_profiles', _user_id, jsonb_build_object('is_active', _is_active));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_set_branch_access(_user_id uuid, _branch_id uuid, _allowed boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF NOT public.is_admin(v_uid) THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF _allowed THEN
    INSERT INTO public.staff_branch_access (user_id, branch_id, granted_by)
    VALUES (_user_id, _branch_id, v_uid)
    ON CONFLICT (user_id, branch_id) DO NOTHING;
  ELSE
    DELETE FROM public.staff_branch_access WHERE user_id = _user_id AND branch_id = _branch_id;
  END IF;
  INSERT INTO public.audit_logs (actor_id, branch_id, action, entity_type, entity_id, details)
  VALUES (v_uid, _branch_id, CASE WHEN _allowed THEN 'branch_access_granted' ELSE 'branch_access_revoked' END,
          'staff_branch_access', _user_id, jsonb_build_object('branch_id', _branch_id));
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_staff()
RETURNS TABLE (
  user_id uuid, full_name text, email text, phone text, is_active boolean,
  roles text[], branch_ids uuid[], created_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT sp.id, sp.full_name, sp.email, sp.phone, sp.is_active,
         COALESCE((SELECT array_agg(r.role::text ORDER BY r.role) FROM public.user_roles r WHERE r.user_id = sp.id), '{}'),
         COALESCE((SELECT array_agg(a.branch_id) FROM public.staff_branch_access a WHERE a.user_id = sp.id), '{}'),
         sp.created_at
    FROM public.staff_profiles sp
   WHERE public.is_manager(auth.uid())
   ORDER BY sp.full_name NULLS LAST, sp.created_at;
$$;

-- ============ CUSTOMER + SUBSCRIPTION LIFECYCLE ============
CREATE OR REPLACE FUNCTION public.set_customer_active(_customer_id uuid, _is_active boolean)
RETURNS public.customers LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.customers;
BEGIN
  IF NOT public.is_manager(v_uid) THEN RAISE EXCEPTION 'Managers only'; END IF;
  IF NOT _is_active AND EXISTS (
    SELECT 1 FROM public.sessions WHERE customer_id = _customer_id AND status IN ('active','paused')
  ) THEN RAISE EXCEPTION 'Close the open session before deactivating this customer'; END IF;
  UPDATE public.customers SET is_active = _is_active WHERE id = _customer_id RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'Customer not found'; END IF;
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
  VALUES (v_uid, CASE WHEN _is_active THEN 'customer_reactivated' ELSE 'customer_deactivated' END,
          'customers', _customer_id, jsonb_build_object('is_active', _is_active));
  RETURN v_row;
END; $$;

CREATE OR REPLACE FUNCTION public.set_subscription_status(
  _subscription_id uuid, _status public.subscription_status, _reason text DEFAULT NULL
) RETURNS public.customer_subscriptions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_row public.customer_subscriptions;
BEGIN
  IF NOT public.is_manager(v_uid) THEN RAISE EXCEPTION 'Managers only'; END IF;
  SELECT * INTO v_row FROM public.customer_subscriptions WHERE id = _subscription_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subscription not found'; END IF;
  IF _status = 'active' AND EXISTS (
    SELECT 1 FROM public.customer_subscriptions
     WHERE customer_id = v_row.customer_id AND id <> _subscription_id AND status = 'active'
  ) THEN RAISE EXCEPTION 'This customer already has an active subscription'; END IF;

  UPDATE public.customer_subscriptions
     SET status = _status,
         ends_on = CASE WHEN _status IN ('cancelled','expired') THEN COALESCE(ends_on, CURRENT_DATE) ELSE ends_on END
   WHERE id = _subscription_id RETURNING * INTO v_row;

  IF _status <> 'active' AND NOT EXISTS (
    SELECT 1 FROM public.customer_subscriptions WHERE customer_id = v_row.customer_id AND status = 'active'
  ) THEN
    UPDATE public.customers SET category = 'walk_in' WHERE id = v_row.customer_id;
  ELSIF _status = 'active' THEN
    UPDATE public.customers SET category = 'subscriber' WHERE id = v_row.customer_id;
  END IF;

  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, details)
  VALUES (v_uid, 'subscription_status_changed', 'customer_subscriptions', _subscription_id,
          jsonb_build_object('status', _status, 'reason', _reason));
  RETURN v_row;
END; $$;

-- ============ PAYMENT WORKFLOW (server-authoritative) ============
CREATE OR REPLACE FUNCTION public.record_session_payment(
  _session_id uuid,
  _method text,
  _idempotency_key text,
  _amount_minor bigint DEFAULT NULL,
  _reference text DEFAULT NULL,
  _notes text DEFAULT NULL,
  _status public.payment_status DEFAULT 'confirmed'
) RETURNS public.payments LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_session public.sessions;
  v_outstanding bigint;
  v_amount bigint;
  v_payment public.payments;
BEGIN
  IF _method NOT IN ('cash','transfer','pos','other') THEN RAISE EXCEPTION 'Unsupported payment method'; END IF;
  IF _idempotency_key IS NULL OR length(_idempotency_key) < 8 THEN RAISE EXCEPTION 'Missing submission key'; END IF;

  SELECT * INTO v_payment FROM public.payments WHERE idempotency_key = _idempotency_key;
  IF FOUND THEN RETURN v_payment; END IF;

  SELECT * INTO v_session FROM public.sessions WHERE id = _session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;
  IF NOT public.has_branch_access(v_uid, v_session.branch_id) THEN RAISE EXCEPTION 'Not authorised for this branch'; END IF;

  v_outstanding := GREATEST(0, v_session.amount_due_minor - v_session.amount_paid_minor);
  v_amount := COALESCE(_amount_minor, v_outstanding);
  IF v_amount <= 0 THEN RAISE EXCEPTION 'Nothing to collect on this session'; END IF;
  IF v_amount > v_outstanding THEN RAISE EXCEPTION 'Amount exceeds the outstanding balance'; END IF;

  INSERT INTO public.payments (
    customer_id, branch_id, session_id, amount_minor, method, status, reference,
    notes, recorded_by, idempotency_key,
    confirmed_at, confirmed_by
  ) VALUES (
    v_session.customer_id, v_session.branch_id, _session_id, v_amount, _method, _status,
    NULLIF(btrim(COALESCE(_reference,'')), ''), _notes, v_uid, _idempotency_key,
    CASE WHEN _status = 'confirmed' THEN now() END,
    CASE WHEN _status = 'confirmed' THEN v_uid END
  ) RETURNING * INTO v_payment;

  IF _status = 'confirmed' THEN
    UPDATE public.sessions SET amount_paid_minor = amount_paid_minor + v_amount WHERE id = _session_id;
  END IF;

  INSERT INTO public.audit_logs (actor_id, branch_id, action, entity_type, entity_id, details)
  VALUES (v_uid, v_session.branch_id, 'session_payment_recorded', 'payments', v_payment.id,
          jsonb_build_object('session_id', _session_id, 'amount_minor', v_amount,
                             'method', _method, 'status', _status));
  RETURN v_payment;
END; $$;

CREATE OR REPLACE FUNCTION public.purchase_subscription(
  _customer_id uuid,
  _plan_id uuid,
  _branch_id uuid,
  _method text,
  _idempotency_key text,
  _reference text DEFAULT NULL,
  _notes text DEFAULT NULL,
  _status public.payment_status DEFAULT 'confirmed'
) RETURNS public.payments LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_plan public.subscription_plans;
  v_existing public.customer_subscriptions;
  v_sub public.customer_subscriptions;
  v_payment public.payments;
  v_action text := 'subscription_purchased';
BEGIN
  IF _method NOT IN ('cash','transfer','pos','other') THEN RAISE EXCEPTION 'Unsupported payment method'; END IF;
  IF _idempotency_key IS NULL OR length(_idempotency_key) < 8 THEN RAISE EXCEPTION 'Missing submission key'; END IF;
  IF NOT public.has_branch_access(v_uid, _branch_id) THEN RAISE EXCEPTION 'Not authorised for this branch'; END IF;

  SELECT * INTO v_payment FROM public.payments WHERE idempotency_key = _idempotency_key;
  IF FOUND THEN RETURN v_payment; END IF;

  SELECT * INTO v_plan FROM public.subscription_plans WHERE id = _plan_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'Plan not found or inactive'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE id = _customer_id AND is_active) THEN
    RAISE EXCEPTION 'Customer not found or inactive';
  END IF;

  SELECT * INTO v_existing FROM public.customer_subscriptions
   WHERE customer_id = _customer_id AND status = 'active'
   ORDER BY started_on DESC LIMIT 1 FOR UPDATE;

  IF v_existing.id IS NOT NULL THEN
    IF v_existing.plan_id <> _plan_id THEN
      RAISE EXCEPTION 'This customer is on a different active plan. Cancel it before switching.';
    END IF;
    v_action := 'subscription_renewed';
    UPDATE public.customer_subscriptions
       SET ends_on = GREATEST(COALESCE(ends_on, CURRENT_DATE), CURRENT_DATE)
                     + v_plan.billing_period_days
     WHERE id = v_existing.id RETURNING * INTO v_sub;
  ELSE
    INSERT INTO public.customer_subscriptions (
      customer_id, plan_id, status, started_on, ends_on, sold_at_branch_id, created_by
    ) VALUES (
      _customer_id, _plan_id, 'active', CURRENT_DATE,
      CURRENT_DATE + v_plan.billing_period_days, _branch_id, v_uid
    ) RETURNING * INTO v_sub;
  END IF;

  UPDATE public.customers SET category = 'subscriber' WHERE id = _customer_id;
  PERFORM public.ensure_weekly_allowance(v_sub.id);

  INSERT INTO public.payments (
    customer_id, branch_id, subscription_id, amount_minor, currency, method, status,
    reference, notes, recorded_by, idempotency_key, confirmed_at, confirmed_by
  ) VALUES (
    _customer_id, _branch_id, v_sub.id, v_plan.price_minor, v_plan.currency, _method, _status,
    NULLIF(btrim(COALESCE(_reference,'')), ''), _notes, v_uid, _idempotency_key,
    CASE WHEN _status = 'confirmed' THEN now() END,
    CASE WHEN _status = 'confirmed' THEN v_uid END
  ) RETURNING * INTO v_payment;

  INSERT INTO public.audit_logs (actor_id, branch_id, action, entity_type, entity_id, details)
  VALUES (v_uid, _branch_id, v_action, 'customer_subscriptions', v_sub.id,
          jsonb_build_object('plan_id', _plan_id, 'amount_minor', v_plan.price_minor,
                             'method', _method, 'payment_id', v_payment.id, 'status', _status));
  RETURN v_payment;
END; $$;

CREATE OR REPLACE FUNCTION public.update_payment_status(
  _payment_id uuid, _status public.payment_status, _reason text DEFAULT NULL
) RETURNS public.payments LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_old public.payments; v_new public.payments;
BEGIN
  IF NOT public.is_manager(v_uid) THEN RAISE EXCEPTION 'Managers only'; END IF;
  SELECT * INTO v_old FROM public.payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
  IF v_old.status = _status THEN RETURN v_old; END IF;

  UPDATE public.payments
     SET status = _status,
         confirmed_at = CASE WHEN _status = 'confirmed' THEN COALESCE(confirmed_at, now()) ELSE confirmed_at END,
         confirmed_by = CASE WHEN _status = 'confirmed' THEN COALESCE(confirmed_by, v_uid) ELSE confirmed_by END,
         voided_at = CASE WHEN _status IN ('failed','cancelled','refunded') THEN now() ELSE NULL END,
         void_reason = CASE WHEN _status IN ('failed','cancelled','refunded') THEN _reason ELSE void_reason END
   WHERE id = _payment_id RETURNING * INTO v_new;

  IF v_old.session_id IS NOT NULL THEN
    IF v_old.status = 'confirmed' AND _status <> 'confirmed' THEN
      UPDATE public.sessions SET amount_paid_minor = GREATEST(0, amount_paid_minor - v_old.amount_minor)
       WHERE id = v_old.session_id;
    ELSIF v_old.status <> 'confirmed' AND _status = 'confirmed' THEN
      UPDATE public.sessions SET amount_paid_minor = amount_paid_minor + v_old.amount_minor
       WHERE id = v_old.session_id;
    END IF;
  END IF;

  INSERT INTO public.audit_logs (actor_id, branch_id, action, entity_type, entity_id, details)
  VALUES (v_uid, v_old.branch_id, 'payment_status_changed', 'payments', _payment_id,
          jsonb_build_object('from', v_old.status, 'to', _status, 'reason', _reason));
  RETURN v_new;
END; $$;

-- ============ BRANCH ACCESS ENFORCEMENT ON CLOCK-IN ============
CREATE OR REPLACE FUNCTION public.start_session(
  _customer_id uuid, _branch_id uuid, _planned_minutes integer DEFAULT NULL, _authorized_user_id uuid DEFAULT NULL
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
  IF NOT public.has_branch_access(v_uid, _branch_id) THEN RAISE EXCEPTION 'Not authorised for this branch'; END IF;
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

-- ============ FUNCTION GRANTS ============
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.staff_is_active(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_branch_access(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_staff_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_staff_active(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_branch_access(uuid, uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_staff() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_customer_active(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_subscription_status(uuid, public.subscription_status, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_session_payment(uuid, text, text, bigint, text, text, public.payment_status) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.purchase_subscription(uuid, uuid, uuid, text, text, text, text, public.payment_status) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_payment_status(uuid, public.payment_status, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_is_active(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_branch_access(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_staff_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_staff_active(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_branch_access(uuid, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_customer_active(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_subscription_status(uuid, public.subscription_status, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_session_payment(uuid, text, text, bigint, text, text, public.payment_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_subscription(uuid, uuid, uuid, text, text, text, text, public.payment_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_payment_status(uuid, public.payment_status, text) TO authenticated;