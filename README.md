# Cloud Infrastructure Platform

Working repository for the new cloud infrastructure project. The final product name is intentionally undecided for now.

## Why this repository exists

This repository replaces the old Waste to Work application workspace with a clean technical and product ground for experimenting with our own cloud infrastructure.

The immediate goal is not to compete with Amazon Web Services, Microsoft Azure, or Google Cloud. The immediate goal is to build a small, understandable cloud from first principles and grow it only when the foundations are reliable.

## Core idea

We will begin with a laptop as the physical host for a private cloud laboratory. The laptop will run virtual machines and cloud-management software so we can learn and prove the complete workflow before buying or colocating dedicated servers.

The first proof-of-concept milestone is intentionally tiny:

> Our own control plane can create or register one real virtual machine, read its real state, start/stop/restart it, persist its resource record, and delete it.

The laptop is therefore the **first infrastructure host for the lab**, not the intended production data center.

## Initial direction

- Phase 0: laptop-based cloud laboratory
- Phase 1: small dedicated server or mini-server node
- Phase 2: multi-node compute, storage, networking, monitoring, and billing
- Phase 3: managed databases, object storage, containers, and developer deployment
- Phase 4: multi-region African infrastructure

## Runnable Phase 0 lab

The first implementation lives under `lab/`:

- `lab/host-check.sh` - checks CPU, memory, storage, virtualization flags, and installed virtualization tooling
- `lab/control-plane.py` - minimal local HTTP control plane backed by real libvirt and a SQLite resource registry
- `lab/README.md` - installation, runbook, API examples, safety rules, and acceptance criteria

The current implementation is intentionally standard-library-only on the control-plane side. It uses `virsh`, `virt-install`, `qemu-img`, libvirt, and SQLite rather than pretending to provision infrastructure through a mock interface.

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

Current state: **Phase 0 implementation started.** The repository contains the architecture/documentation foundation and the first runnable local control-plane scaffold. No production infrastructure is implied by the existence of this repository.
