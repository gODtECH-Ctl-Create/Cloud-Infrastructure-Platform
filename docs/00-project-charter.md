# 00 Project Charter

## Working title

Cloud Infrastructure Platform. Product naming will be decided after the technical direction is clearer.

## Purpose

Build a small cloud infrastructure platform that can turn pooled computing resources into simple, controllable services for developers and businesses.

We will learn by building the smallest real system first, then scale the architecture as demand and operational maturity increase.

## Problem

Developers and businesses need predictable compute, storage, networking, deployments, monitoring, and backups without having to understand the underlying physical infrastructure. Our long-term opportunity is to make those capabilities simple and economically attractive, with an initial focus on African customers.

## Product thesis

Infrastructure becomes a product when customers can provision it themselves, use it safely, understand its state, and pay for what they consume.

## Principles

1. Build from the infrastructure upward: hardware, virtualization, networking, storage, control plane, then customer experience.
2. Start in a laptop laboratory before spending heavily on physical infrastructure.
3. Prefer proven open-source infrastructure where it reduces cost and lock-in.
4. Keep the control plane independent from individual infrastructure vendors where practical.
5. Never rely on a fake user-interface state when a real resource state is required.
6. Design for tenant isolation from the beginning.
7. Treat observability, backups, security, and recovery as product features.
8. Measure capacity and unit economics before scaling hardware.
9. Do not build services before there is a clear customer or operational reason.

## Non-goals for the first stage

- A global hyperscale cloud
- Owning a data center
- Global content delivery network infrastructure
- Advanced artificial intelligence training clusters
- Dozens of managed services
- Full feature parity with major public clouds

## Success criteria for Phase 0

By the end of the laboratory phase we should understand and demonstrate:

- how a physical host is prepared
- how virtual machines are created and isolated
- how virtual networking works
- how persistent storage is attached
- how resources are tracked
- how the control plane requests and observes infrastructure changes
- how a customer-facing API could trigger provisioning
- how monitoring and failure handling work

## Success criteria for Phase 1

A small production cluster should be able to provision virtual machines through an API and dashboard, track resource usage, expose safe networking, provide persistent storage, collect metrics, and support basic billing.
