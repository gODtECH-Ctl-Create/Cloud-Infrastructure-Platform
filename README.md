# Cloud Infrastructure Platform

Working repository for the new cloud infrastructure project. The final product name is intentionally undecided for now.

## Why this repository exists

This repository replaces the old Waste to Work application workspace with a clean technical and product ground for experimenting with our own cloud infrastructure.

The immediate goal is not to compete with Amazon Web Services, Microsoft Azure, or Google Cloud. The immediate goal is to build a small, understandable cloud from first principles and grow it only when the foundations are reliable.

## Core idea

We will begin with a laptop as the physical host for a private cloud laboratory. The laptop will run virtual machines and cloud-management software so we can learn and prove the complete workflow before buying or colocating dedicated servers.

The first useful milestone is:

> A user can create a virtual machine, receive a network address, connect to it securely, deploy an application, see basic resource usage, and have the platform record the resource and its cost.

The laptop is therefore the **first infrastructure host for the lab**, not the intended production data center.

## Initial direction

- Phase 0: laptop-based cloud laboratory
- Phase 1: small dedicated server cluster in a professional data center
- Phase 2: production compute, storage, networking, monitoring, and billing
- Phase 3: managed databases, object storage, containers, and developer deployment
- Phase 4: multi-region African infrastructure

## Documentation map

- `docs/00-project-charter.md` - project purpose, principles, and boundaries
- `docs/01-product-vision.md` - customer problem and product direction
- `docs/02-architecture.md` - control plane, data plane, compute, storage, and networking
- `docs/03-laptop-cloud-lab.md` - how the first cloud will run on a laptop
- `docs/04-mvp-specification.md` - minimum viable cloud product
- `docs/05-infrastructure-requirements.md` - physical infrastructure needed as we grow
- `docs/06-security-and-operations.md` - security, tenancy, backups, monitoring, and operations
- `docs/07-roadmap.md` - phased path from laptop to production cloud
- `docs/08-economics.md` - capacity, pricing, utilization, and unit economics
- `docs/09-open-decisions.md` - decisions still requiring research or testing
- `docs/10-build-log.md` - running record of validated progress

## Important rule

We will not pretend that a feature works when it is only a user-interface mock. Every infrastructure capability must eventually be connected to real resources, real state, and real measurements.

## Repository status

Current state: documentation foundation created. No production infrastructure is implied by the existence of this repository.
