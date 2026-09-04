# 02 Architecture

## System model

The platform is divided into two major planes.

### Control plane

The control plane is the brain of the cloud. It handles identity, projects, quotas, resource requests, scheduling, provisioning, state, billing, audit logs, and the customer API.

Conceptual flow:

Customer -> Web Console / API -> Control Plane -> Infrastructure Adapter -> Resource Cluster

### Data plane

The data plane is where customer workloads actually run. It includes virtual machines, containers, storage volumes, networks, and related runtime services.

## Core components

### Identity and access

Users, organizations, projects, teams, roles, API keys, and multi-factor authentication.

### Resource manager

Tracks virtual machines, disks, networks, IP addresses, images, snapshots, and lifecycle states.

### Scheduler

Chooses an appropriate compute node based on available CPU, memory, storage, policy, and placement constraints.

### Provisioner

Turns a desired resource definition into an actual infrastructure resource.

### Infrastructure adapter

A boundary between the control plane and infrastructure tooling. This should allow the first implementation to use one virtualization stack and later support another without rewriting the entire product.

### Usage and billing

Records provisioned resources and measured consumption. Billing must eventually be derived from durable usage records rather than frontend calculations.

### Observability

Collects metrics, logs, events, and health state for both infrastructure and customer resources.

## Phase 0 reference architecture

Laptop host

- Linux host preferred for the most direct virtualization experience
- Virtual machines for infrastructure experiments
- virtual network between lab nodes
- local persistent storage
- control-plane services running separately from customer workloads

Possible lab stack:

- Linux
- Kernel-based Virtual Machine (KVM) where available
- Proxmox Virtual Environment or another virtualization manager
- PostgreSQL for control-plane metadata
- Redis for transient queues or caching where justified
- Prometheus for metrics
- Grafana for dashboards
- Docker and Kubernetes only where they solve a specific lab objective

## Phase 1 production architecture

Data center -> redundant network -> compute nodes -> storage cluster -> control plane -> customer dashboard/API

A production deployment should separate management traffic from customer traffic where practical and should avoid making one physical machine a single point of failure for all services.

## Multi-tenancy boundary

Every resource must belong to an organization/project and must be authorized through the control plane. Network, storage, credentials, and API operations must respect tenant boundaries.

## Resource lifecycle

Requested -> Validating -> Scheduled -> Provisioning -> Ready -> Updating / Stopping -> Stopped -> Deleting -> Deleted

Failed states must be explicit and recoverable.

## Key principle

The customer interface should represent infrastructure state from the control plane. A successful button click is not equivalent to a successfully created virtual machine.
