-- Waste to Work — 04_seed.sql
-- Starter data so the app has something to work with on a fresh project.
-- Run FOURTH (optional but recommended). Safe to re-run: every insert is idempotent.
-- Edit the values below to match your real branches, plans and prices before running.
-- Money is stored in MINOR units (kobo): NGN 1,500.00 => 150000.

-- ---------- Branches ----------
INSERT INTO public.branches (code, name, address, phone, timezone)
VALUES
  ('HQ',  'Head Office',  'Lagos, Nigeria', NULL, 'Africa/Lagos'),
  ('BR2', 'Second Branch', NULL,            NULL, 'Africa/Lagos')
ON CONFLICT (code) DO NOTHING;

-- ---------- Subscription plans ----------
INSERT INTO public.subscription_plans
  (name, description, price_minor, currency, billing_period_days,
   weekly_hours, rollover_enabled, max_rollover_hours, max_authorized_users, overage_rate_minor)
SELECT v.name, v.description, v.price_minor, 'NGN', v.billing_period_days,
       v.weekly_hours, v.rollover_enabled, v.max_rollover_hours, v.max_authorized_users, v.overage_rate_minor
FROM (VALUES
  ('Starter Weekly',  'Light usage — 5 hours per week',      1500000::bigint, 30, 5.00,  true,  5.00,  1, 100000::bigint),
  ('Standard Weekly', 'Regular usage — 10 hours per week',   2500000::bigint, 30, 10.00, true, 10.00,  2, 100000::bigint),
  ('Pro Weekly',      'Heavy usage — 20 hours per week',     4500000::bigint, 30, 20.00, true, 20.00,  4,  80000::bigint)
) AS v(name, description, price_minor, billing_period_days, weekly_hours,
       rollover_enabled, max_rollover_hours, max_authorized_users, overage_rate_minor)
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscription_plans p WHERE p.name = v.name
);

-- ---------- Network-wide pricing rates (branch_id NULL = applies to all branches) ----------
INSERT INTO public.pricing_rates
  (name, branch_id, category, rate_per_hour_minor, currency, minimum_minutes)
SELECT v.name, NULL, v.category::public.customer_category, v.rate_per_hour_minor, 'NGN', v.minimum_minutes
FROM (VALUES
  ('Walk-in standard rate',      'walk_in',    150000::bigint, 30),
  ('Subscriber overage rate',    'subscriber', 100000::bigint,  0)
) AS v(name, category, rate_per_hour_minor, minimum_minutes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.pricing_rates r WHERE r.name = v.name AND r.branch_id IS NULL
);

-- ---------- System settings (created in 01; kept here for completeness / re-runs) ----------
INSERT INTO public.system_settings (key, value, description) VALUES
  ('global_pause', '{"active": false, "reason": null}'::jsonb, 'System-wide pause switch for all branches'),
  ('currency',     '{"code": "NGN", "symbol": "₦"}'::jsonb,    'Default currency for pricing and payments')
ON CONFLICT (key) DO NOTHING;
