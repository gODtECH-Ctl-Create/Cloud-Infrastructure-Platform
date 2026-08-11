-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'attendant');
CREATE TYPE public.customer_category AS ENUM ('subscriber', 'walk_in');
CREATE TYPE public.subscription_status AS ENUM ('active', 'paused', 'expired', 'cancelled');
CREATE TYPE public.session_status AS ENUM ('active', 'paused', 'completed', 'cancelled');
CREATE TYPE public.billing_mode AS ENUM ('subscription', 'walk_in');
CREATE TYPE public.payment_status AS ENUM ('pending', 'confirmed', 'failed', 'refunded');
CREATE TYPE public.pause_scope AS ENUM ('session', 'branch', 'system');

-- ============ SHARED HELPERS ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ BRANCHES ============
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  address text,
  phone text,
  timezone text NOT NULL DEFAULT 'Africa/Lagos',
  is_active boolean NOT NULL DEFAULT true,
  is_paused boolean NOT NULL DEFAULT false,
  pause_reason text,
  paused_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_branches_updated BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ STAFF PROFILES ============
CREATE TABLE public.staff_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text,
  email text,
  primary_branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_profiles TO authenticated;
GRANT ALL ON public.staff_profiles TO service_role;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_staff_profiles_updated BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_manager(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','manager')
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_staff_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.staff_profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created_staff
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_staff_user();

-- Branch policies
CREATE POLICY "Staff can view branches" ON public.branches FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Managers manage branches" ON public.branches FOR ALL TO authenticated
  USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

-- Staff profile policies
CREATE POLICY "Staff view own profile" ON public.staff_profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Staff update own profile" ON public.staff_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_manager(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.is_manager(auth.uid()));
CREATE POLICY "Managers manage staff profiles" ON public.staff_profiles FOR ALL TO authenticated
  USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

CREATE POLICY "Staff view roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_manager(auth.uid()));

-- ============ CUSTOMERS (GLOBAL) ============
CREATE SEQUENCE public.customer_code_seq START 1;

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code text NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text,
  email text,
  category public.customer_category NOT NULL DEFAULT 'walk_in',
  qr_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  registered_branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  address text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_name ON public.customers (lower(full_name));
CREATE INDEX idx_customers_phone ON public.customers (phone);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.assign_customer_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.customer_code IS NULL OR NEW.customer_code = '' THEN
    NEW.customer_code := 'WTW-' || lpad(nextval('public.customer_code_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_customers_code BEFORE INSERT ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.assign_customer_code();

CREATE POLICY "Staff view customers" ON public.customers FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff create customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff update customers" ON public.customers FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Managers delete customers" ON public.customers FOR DELETE TO authenticated USING (public.is_manager(auth.uid()));

-- ============ SUBSCRIPTION PLANS ============
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_minor bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  billing_period_days integer NOT NULL DEFAULT 30,
  weekly_hours numeric(8,2) NOT NULL DEFAULT 0,
  rollover_enabled boolean NOT NULL DEFAULT true,
  max_rollover_hours numeric(8,2) NOT NULL DEFAULT 0,
  max_authorized_users integer NOT NULL DEFAULT 0,
  overage_rate_minor bigint,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_plans TO authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_plans_updated BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Staff view plans" ON public.subscription_plans FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Managers manage plans" ON public.subscription_plans FOR ALL TO authenticated
  USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

-- ============ CUSTOMER SUBSCRIPTIONS ============
CREATE TABLE public.customer_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
  status public.subscription_status NOT NULL DEFAULT 'active',
  started_on date NOT NULL DEFAULT CURRENT_DATE,
  ends_on date,
  week_start_dow integer NOT NULL DEFAULT 1,
  sold_at_branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_subs_customer ON public.customer_subscriptions (customer_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_subscriptions TO authenticated;
GRANT ALL ON public.customer_subscriptions TO service_role;
ALTER TABLE public.customer_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_subs_updated BEFORE UPDATE ON public.customer_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Staff view subscriptions" ON public.customer_subscriptions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Managers manage subscriptions" ON public.customer_subscriptions FOR ALL TO authenticated
  USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

CREATE TABLE public.subscription_weekly_allowances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.customer_subscriptions(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  allowance_hours numeric(8,2) NOT NULL DEFAULT 0,
  rollover_in_hours numeric(8,2) NOT NULL DEFAULT 0,
  hours_used numeric(8,2) NOT NULL DEFAULT 0,
  rollover_out_hours numeric(8,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, week_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_weekly_allowances TO authenticated;
GRANT ALL ON public.subscription_weekly_allowances TO service_role;
ALTER TABLE public.subscription_weekly_allowances ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_allow_updated BEFORE UPDATE ON public.subscription_weekly_allowances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Staff view allowances" ON public.subscription_weekly_allowances FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff upsert allowances" ON public.subscription_weekly_allowances FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff update allowances" ON public.subscription_weekly_allowances FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Managers delete allowances" ON public.subscription_weekly_allowances FOR DELETE TO authenticated USING (public.is_manager(auth.uid()));

CREATE TABLE public.subscription_authorized_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.customer_subscriptions(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  phone text,
  relationship text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_authorized_users TO authenticated;
GRANT ALL ON public.subscription_authorized_users TO service_role;
ALTER TABLE public.subscription_authorized_users ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_authusers_updated BEFORE UPDATE ON public.subscription_authorized_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Staff view authorized users" ON public.subscription_authorized_users FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Managers manage authorized users" ON public.subscription_authorized_users FOR ALL TO authenticated
  USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

-- ============ PRICING RATES ============
CREATE TABLE public.pricing_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE CASCADE,
  category public.customer_category NOT NULL DEFAULT 'walk_in',
  rate_per_hour_minor bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  minimum_minutes integer NOT NULL DEFAULT 0,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_to timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_rates TO authenticated;
GRANT ALL ON public.pricing_rates TO service_role;
ALTER TABLE public.pricing_rates ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_rates_updated BEFORE UPDATE ON public.pricing_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Staff view rates" ON public.pricing_rates FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Managers manage rates" ON public.pricing_rates FOR ALL TO authenticated
  USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

-- ============ SESSIONS ============
CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  subscription_id uuid REFERENCES public.customer_subscriptions(id) ON DELETE SET NULL,
  authorized_user_id uuid REFERENCES public.subscription_authorized_users(id) ON DELETE SET NULL,
  status public.session_status NOT NULL DEFAULT 'active',
  billing_mode public.billing_mode NOT NULL DEFAULT 'walk_in',
  rate_per_hour_minor bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  planned_minutes integer,
  extension_minutes integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  paused_at timestamptz,
  paused_seconds integer NOT NULL DEFAULT 0,
  billable_minutes integer,
  subscription_minutes_used integer NOT NULL DEFAULT 0,
  amount_due_minor bigint NOT NULL DEFAULT 0,
  amount_paid_minor bigint NOT NULL DEFAULT 0,
  notes text,
  opened_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_branch_status ON public.sessions (branch_id, status);
CREATE INDEX idx_sessions_customer ON public.sessions (customer_id, started_at DESC);
CREATE UNIQUE INDEX idx_sessions_one_open_per_customer ON public.sessions (customer_id)
  WHERE status IN ('active','paused');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_sessions_updated BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Staff view sessions" ON public.sessions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff create sessions" ON public.sessions FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff update sessions" ON public.sessions FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Managers delete sessions" ON public.sessions FOR DELETE TO authenticated USING (public.is_manager(auth.uid()));

CREATE TABLE public.session_pauses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  scope public.pause_scope NOT NULL DEFAULT 'session',
  reason text,
  paused_at timestamptz NOT NULL DEFAULT now(),
  resumed_at timestamptz,
  paused_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resumed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pauses_session ON public.session_pauses (session_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_pauses TO authenticated;
GRANT ALL ON public.session_pauses TO service_role;
ALTER TABLE public.session_pauses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view pauses" ON public.session_pauses FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff create pauses" ON public.session_pauses FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff update pauses" ON public.session_pauses FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Managers delete pauses" ON public.session_pauses FOR DELETE TO authenticated USING (public.is_manager(auth.uid()));

-- ============ PAYMENTS ============
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES public.customer_subscriptions(id) ON DELETE SET NULL,
  amount_minor bigint NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  method text NOT NULL DEFAULT 'cash',
  status public.payment_status NOT NULL DEFAULT 'confirmed',
  provider text,
  provider_reference text,
  reference text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_branch_date ON public.payments (branch_id, paid_at DESC);
CREATE INDEX idx_payments_customer ON public.payments (customer_id, paid_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "Staff view payments" ON public.payments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff record payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Managers update payments" ON public.payments FOR UPDATE TO authenticated
  USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));
CREATE POLICY "Managers delete payments" ON public.payments FOR DELETE TO authenticated USING (public.is_manager(auth.uid()));

-- ============ AUDIT LOGS ============
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_created ON public.audit_logs (created_at DESC);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers read audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_manager(auth.uid()));
CREATE POLICY "Staff write audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));

-- ============ SYSTEM SETTINGS ============
CREATE TABLE public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view settings" ON public.system_settings FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Managers manage settings" ON public.system_settings FOR ALL TO authenticated
  USING (public.is_manager(auth.uid())) WITH CHECK (public.is_manager(auth.uid()));

INSERT INTO public.system_settings (key, value, description) VALUES
  ('global_pause', '{"active": false, "reason": null}'::jsonb, 'System-wide pause switch for all branches'),
  ('currency', '{"code": "NGN", "symbol": "₦"}'::jsonb, 'Default currency for pricing and payments');
