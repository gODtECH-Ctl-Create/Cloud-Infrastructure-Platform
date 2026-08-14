# Waste to Work — Remaining Implementation Prompts

This document records the important implementation gaps identified by the repository audit on 14 August 2026.

The existing application already has the core workspace, customer, subscription, session, rollover, branch pause, pricing and payment-record foundations. These prompts are **incremental**. They must be executed one stage at a time in Lovable and verified before the next stage begins.

## Current audit conclusion

The application is usable for normal core testing. The remaining work below is mainly operational completeness, missing user interfaces, stronger controls, and production readiness.

## Stage 12 — QR Membership Cards and Scanner

### Objective
Complete the QR workflow that is currently only represented by a customer `qr_token` and displayed as text. The repository currently has no QR scanner route/component.

### Prompt

> Implement the Waste to Work QR membership workflow without replacing the existing customer-ID search workflow.
>
> Every customer must have a stable QR identifier associated with their globally unique WTW customer ID.
>
> Add a proper digital membership card for the customer profile containing Waste to Work branding, customer name, WTW ID, QR code, customer category, and subscription status where appropriate.
>
> Add a staff-facing **Scan QR** action on the workspace floor/clock-in workflow. Use the laptop/device camera through a browser-supported QR scanner. After scanning, resolve the customer from the central Supabase database and open the normal customer/session action flow.
>
> Do not put sensitive personal information inside the QR payload. The payload should resolve to a non-sensitive unique customer identifier/token.
>
> Keep manual lookup by WTW ID, name and phone as a fallback.
>
> Handle camera permission denial, unsupported cameras, invalid QR codes, inactive customers and unknown tokens gracefully.
>
> Do not create duplicate customer records when a QR is scanned.
>
> Test scanning, fallback search, invalid codes, inactive customers and clock-in after successful identification.

### Acceptance criteria

- A customer can view/print their membership card.
- The QR code is actually rendered, not just the token text.
- Staff can scan using a supported camera.
- A valid scan opens the correct customer.
- Manual lookup still works.
- No sensitive data is exposed in the QR payload.

---

## Stage 13 — Subscription Purchase, Renewal and Payment Confirmation

### Objective
Strengthen the current payment recording flow into the actual billing workflow discussed for Waste to Work.

The existing customer detail page can record a payment directly, but the repository does not yet provide a complete pending → verified/approved billing workflow tied cleanly to subscription purchases or session settlement.

### Prompt

> Complete the Waste to Work billing workflow while keeping manual payment confirmation as the default.
>
> Supported payment methods must include Cash, Bank Transfer, POS/Card and Other.
>
> A payment must be associated with the relevant customer and, where applicable, subscription purchase, session, branch and attendant.
>
> Do not integrate directly with a POS terminal in this stage. The physical POS terminal remains external. The attendant performs the payment on the terminal and then confirms receipt inside Waste to Work.
>
> For transfer and POS payments, allow an optional transaction/reference number.
>
> Add a clear confirmation step so an attendant cannot accidentally mark a payment as received with a single ambiguous click.
>
> Support payment states such as Pending, Paid/Confirmed, Failed, Cancelled and Refunded/Adjusted where appropriate. Historical financial records must not be silently deleted.
>
> When a subscription is purchased or renewed, show the amount due, selected plan, customer, branch and payment method, then allow the attendant to confirm payment and activate/renew the subscription.
>
> For session billing, show amount due at checkout and allow payment confirmation from the checkout flow. Keep unpaid/partially paid sessions visible to authorized staff.
>
> Ensure payment amounts and subscription activation are protected against duplicate submission.
>
> Keep all financial calculations server-authoritative.
>
> Do not invent automatic POS or bank verification. Design the data model so a future payment-provider API can be integrated later.

### Acceptance criteria

- Subscription purchase/renewal has a clear payment workflow.
- POS/card and transfer payments can be manually confirmed.
- Payment references are retained.
- Duplicate payment submission is prevented.
- Paid, pending and unpaid states are visible.
- Session checkout can record payment correctly.
- Historical financial records remain auditable.

---

## Stage 14 — Staff, Roles and Branch Access Management

### Objective
The database has role concepts, but the current route tree does not expose a dedicated staff-management interface.

### Prompt

> Build the Waste to Work staff and access-management module using the existing Supabase authentication and role model.
>
> Add an admin-only staff management area where authorized administrators can view staff, assign roles and assign branch access.
>
> Support at minimum: Super Admin/Admin, Branch Manager and Attendant.
>
> A staff member must not automatically gain access to every branch merely because they are authenticated.
>
> Support branch-specific access for managers and attendants while preserving Super Admin access to the entire organization.
>
> Enforce authorization server-side with Supabase Row Level Security and existing role helpers. UI hiding is not sufficient security.
>
> Allow administrators to deactivate staff access without deleting historical session/payment records.
>
> Record who created or changed important staff assignments.
>
> Do not expose service-role credentials in client code.

### Acceptance criteria

- Admin can manage staff roles.
- Branch access is configurable.
- Unauthorized users cannot access restricted branches/data by manipulating URLs or requests.
- Staff can be deactivated without destroying history.
- Role and branch permissions are enforced server-side.

---

## Stage 15 — Customer Profile Operations and Subscription Lifecycle

### Objective
Complete the customer-management operations that are necessary for real daily use.

### Prompt

> Complete customer profile operations without changing the global one-customer identity model.
>
> Allow authorized staff to edit customer contact/profile information, deactivate/reactivate a customer, and review the complete customer history.
>
> Preserve the WTW customer ID permanently once issued.
>
> A customer must never receive a second customer record because they changed branch.
>
> Complete subscription lifecycle controls: activate, renew, suspend, cancel and expire while preserving historical subscriptions.
>
> Display current weekly allowance, used hours, rollover hours, remaining hours, active sessions, payment history and branch-by-branch session history.
>
> Clearly distinguish the subscription owner from any authorized users who may use the owner's subscription.
>
> Prevent assigning multiple conflicting active subscriptions unless the business rules explicitly allow it.
>
> Add confirmation dialogs for destructive or financially significant actions.

### Acceptance criteria

- Customer records can be maintained safely.
- Customer IDs never change.
- Subscription history is preserved.
- Current balance and rollover are understandable.
- Active subscription conflicts are handled.
- Customer history can be audited across branches.

---

## Stage 16 — Authorized Subscription Users and Cross-Branch Use

### Objective
The database and customer page already contain authorized-user foundations, but the actual usage/identification workflow needs to be completed.

### Prompt

> Complete authorized subscription usage across all Waste to Work branches.
>
> The subscription owner may authorize another person to use their subscription according to the plan's `max_authorized_users` rule.
>
> Authorized users must be represented as identifiable people, not merely free-text names. Where appropriate, issue them their own non-owner identity/identifier so staff can identify them without logging in as the subscription owner.
>
> When an authorized user arrives at any branch, staff must be able to identify them and see that they are using another customer's subscription.
>
> Starting a session for an authorized user must consume the subscription owner's shared allowance and must record both the actual user and subscription owner.
>
> The system must show this relationship in session history, payment history where relevant and customer profiles.
>
> The same subscription balance must be shared across Branch A, Branch B and all other Waste to Work branches.
>
> Do not create branch-specific subscription balances.
>
> Respect plan limits on authorized users and prevent unauthorized use after access is removed or the subscription expires.

### Acceptance criteria

- Owner can add/remove authorized users according to plan limits.
- Authorized user can be identified without impersonating the owner.
- Usage consumes the owner's shared allowance.
- Cross-branch use works from the same centralized data.
- Audit history identifies both owner and actual user.

---

## Stage 17 — Notifications and Session Expiry Alerts

### Objective
The existing floor screen visually identifies overtime sessions, but the full notification behavior discussed for attendants is not yet implemented.

### Prompt

> Implement operational notifications for Waste to Work session management.
>
> When a customer's planned session reaches its end, notify the attendant clearly that the session has expired.
>
> The attendant must be able to end the session or extend it from the notification context.
>
> Do not repeatedly spam notifications every second. Use sensible thresholds and deduplicate notifications for the same session.
>
> If a session is paused because of a branch or global power outage, do not send an expiry notification while billable time is not advancing.
>
> Resume normal expiry tracking after the pause ends.
>
> Provide in-app notifications/toasts first. Design the notification layer so browser notifications or other channels can be added later without rewriting session logic.

### Acceptance criteria

- Session expiry is clearly surfaced.
- Extend/end actions remain available.
- Paused sessions do not falsely expire due to outage time.
- Notifications are not duplicated or spammy.

---

## Stage 18 — Management Dashboard and Operational Reporting

### Objective
Ensure the management dashboard covers the business metrics originally requested, not only payment totals.

### Prompt

> Complete the Waste to Work management dashboard and reporting module.
>
> Provide branch-level and organization-wide reporting for authorized users.
>
> At minimum show:
>
> - Today's revenue
> - Revenue by payment method
> - Revenue by branch
> - Number of customers served today
> - Number of active sessions
> - Completed sessions
> - Hours used today
> - Subscriber usage
> - Walk-in usage
> - Outstanding balances
> - Active subscriptions
> - New customers
> - Rollover usage
> - Branch comparison
>
> Support useful date ranges such as today, yesterday, this week, last week, this month and custom range.
>
> All totals must come from persisted database records and use server-side filtering/aggregation where appropriate.
>
> Managers must only see data for branches they are authorized to manage. Admins can see organization-wide data.
>
> Avoid misleading double-counting when a customer visits multiple branches.
>
> Add export capability for authorized reports where practical, without exposing unauthorized customer data.

### Acceptance criteria

- Management can answer how much was made today.
- Management can compare branches.
- Management can see customer/session activity.
- Date filtering works.
- Access restrictions are enforced.
- Reports reconcile with payment/session records.

---

## Stage 19 — Audit Trail, Data Integrity and Production Hardening

### Objective
Prepare the application for real operational use.

### Prompt

> Perform a production-readiness hardening pass on Waste to Work.
>
> Review all important business actions and ensure they have an audit trail where appropriate, including:
>
> - Customer creation and status changes
> - Subscription activation/renewal/cancellation
> - Rollover creation/adjustment
> - Session start/pause/resume/extend/end
> - Branch/global pause and resume
> - Payment creation/confirmation/refund/adjustment
> - Staff role and branch-access changes
> - Authorized-user changes
>
> Audit records should capture who performed the action, when, branch context where relevant, affected entity and a concise description of the change.
>
> Review Supabase Row Level Security policies for every table and ensure no customer, payment, subscription or branch data can be accessed outside the caller's authorization.
>
> Review all privileged functions for safe search paths, appropriate execution privileges and authorization checks.
>
> Ensure service-role credentials are server-only.
>
> Add validation for invalid durations, negative amounts, duplicate payments, duplicate active sessions, expired subscriptions, inactive customers and invalid branch access.
>
> Review race conditions around starting sessions, extending sessions, consuming subscription hours and recording payments.
>
> Add appropriate database constraints/transactions so concurrent attendants cannot overspend the same subscription allowance.
>
> Add user-friendly error handling without exposing database internals.

### Acceptance criteria

- Critical business actions are auditable.
- RLS and role enforcement are reviewed.
- Financial and time operations are protected from race conditions.
- Invalid inputs are rejected safely.
- Secrets are not exposed.
- Production error messages are safe and understandable.

---

## Stage 20 — End-to-End Testing, Deployment and Handover

### Objective
Verify the complete system before production use.

### Prompt

> Perform a complete end-to-end validation of Waste to Work without redesigning working functionality.
>
> Test the following real workflows:
>
> 1. Admin sign-in.
> 2. Create two branches.
> 3. Create manager and attendant users with different branch permissions.
> 4. Register the same customer once.
> 5. Confirm the WTW ID is unique.
> 6. Activate a weekly subscription.
> 7. Confirm subscriber pricing differs from walk-in pricing when configured.
> 8. Start a one-hour session at Branch A.
> 9. Pause and resume the session.
> 10. Extend the session.
> 11. Complete checkout and manually confirm POS/card payment.
> 12. Record a bank transfer with reference.
> 13. Test unpaid/partial payment handling.
> 14. Test weekly allowance consumption.
> 15. Test rollover into the next period.
> 16. Move to Branch B and confirm the same customer/subscription/balance is available.
> 17. Test an authorized user consuming the owner's allowance.
> 18. Test branch-only power outage pause.
> 19. Test global power outage pause.
> 20. Test session expiry notification.
> 21. Test QR membership card and QR scan.
> 22. Test unauthorized branch/data access.
> 23. Test inactive customer behavior.
> 24. Test subscription expiry/cancellation.
> 25. Reconcile dashboard revenue against payment records.
>
> Run lint, type checking and production build. Fix all errors introduced by this work.
>
> Verify environment variables, Supabase configuration, authentication redirect URLs and Vercel deployment configuration.
>
> Do not claim production readiness if any critical workflow fails. Produce a concise test report showing passed, failed and deferred items.

### Acceptance criteria

- Core business workflows pass end-to-end.
- Cross-branch data remains consistent.
- Billing reconciles.
- Access controls work.
- QR workflow works.
- Outage pauses work.
- Build/lint/type checks pass.
- Deployment configuration is documented.
