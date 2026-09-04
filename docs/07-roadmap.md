# 07 Roadmap

## Phase 0: Cloud Laboratory

Goal: build and understand the smallest real cloud environment on a laptop.

Milestones:

1. Record host hardware and operating system.
2. Enable and verify hardware virtualization.
3. Create the first Linux virtual machine.
4. Create a second Linux virtual machine.
5. Establish an isolated virtual network.
6. Deploy a basic workload.
7. Build a small control-plane service that can create and destroy a test resource through an infrastructure adapter.
8. Persist resource state in a database.
9. Add metrics and a basic operations dashboard.
10. Document failure experiments and recovery.

Exit condition: a repeatable end-to-end provisioning workflow works without manual creation of the workload virtual machine.

## Phase 1: Single-region production foundation

- obtain or colocate dedicated servers
- build a redundant compute foundation
- establish storage strategy
- establish production networking
- secure management access
- deploy control plane
- implement resource provisioning
- implement quotas
- implement usage accounting
- private beta

## Phase 2: Developer cloud

- application deployment workflow
- container workloads
- persistent storage service
- object storage
- managed PostgreSQL
- backups and snapshots
- logs and metrics for customers
- billing and payment integration

## Phase 3: Platform maturity

- better scheduling
- autoscaling
- load balancing
- image management
- high-availability control plane
- disaster recovery
- abuse detection
- customer organizations and teams
- infrastructure Application Programming Interface (API) maturity

## Phase 4: Regional infrastructure

- additional African regions based on demand
- redundant Internet connectivity
- more advanced routing
- capacity planning by region
- cross-region backup or replication
- regional data residency options

## Phase 5: Specialized infrastructure

Potential services include:

- Graphics Processing Unit (GPU) compute
- high-memory instances
- managed Kubernetes
- event-driven/serverless execution
- advanced observability

Only build these after the economics and demand are validated.
