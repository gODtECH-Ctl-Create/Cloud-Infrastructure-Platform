# Workspace Hub

You are building a production-ready multi-branch workspace management system called Waste to Work.

Waste to Work operates physical internet workspaces where customers pay for internet/workspace usage based on time. The business has multiple branches, and all branches must operate from one centralized database.

This is NOT a separate database per branch.

The core principle is:

One Waste to Work customer account can be used across multiple Waste to Work branches.

The system must be designed so that customer identity, subscriptions, available hours, rollover hours, authorized subscription access, payment records, and usage history remain synchronized across all branches.

Product Scope

The application will manage:

Customers

Walk-in customers

Subscribers

Subscription plans

Weekly usage allowances

Rollover hours

Customer identification

QR-code identification

Clock-in and clock-out

Time tracking

Session extensions

Billing

Payments

Multiple branches

Branch-level operations

Global and branch-level session pausing

Power outage handling

Authorized users of subscriptions

Revenue reporting

Customer history

Session history

Administrative controls

Staff/attendant accounts

Audit logs

Notifications

Reporting

Future scalability

Important Development Rule

Do not attempt to implement every feature in this prompt immediately.

First inspect the project and establish a clean technical foundation.

Do not replace working functionality unnecessarily.

Do not create fake functionality that only looks functional.

Every major feature must eventually connect to real persisted data.

Before finishing each development stage, verify that the application builds successfully and that existing functionality has not been broken.

Architecture Principles

The application must support multiple branches from the beginning.

Customers belong to Waste to Work globally, not to individual branches.

Sessions belong to a customer and a branch.

Payments belong to a customer, session/transaction where appropriate, and branch.

Subscription usage must be calculated from centralized records.

The server/database must be the source of truth for time calculations.

Do not rely on browser timers as the authoritative source of elapsed time.

The application must be designed so additional branches can be added without restructuring the core system.

Customer Identity

Every customer must have a globally unique Waste to Work Customer ID.

Example:

WTW-000001
WTW-000002
WTW-000003

Names must never be used as the unique identifier.

Two customers may have identical names.

Customer ID must therefore be the primary human-facing identifier.

Customers should also be searchable using:

Customer ID

Name

Phone number

Other appropriate customer information

Customer Categories

The system must support at least:

Subscriber

Walk-in/regular customer

Subscribers receive their configured subscription pricing.

Walk-in customers use the normal configured rate.

Do not hard-code pricing into the interface.

Pricing must be configurable.

Future Compatibility

Design the foundation so that payment-provider integration, automated payment verification, additional branches, additional subscription types, and more advanced reporting can be added later.

Do not build assumptions that would prevent these future capabilities.

At the end of this stage, provide a concise implementation summary and identify the exact components/database structures created.

Do not proceed to unrelated feature implementation until this foundation is stable.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2ad28679-f30e-4746-8856-eadb58c4c774).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
