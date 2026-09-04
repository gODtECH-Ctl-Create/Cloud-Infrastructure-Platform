# 04 Minimum Viable Product Specification

## Objective

Prove one thing:

> We can use software to control a real virtual machine as a cloud resource.

This is a laboratory proof of concept, not a production cloud.

## Minimum viable product

The first version has only four parts.

### 1. Local control service

A lightweight service that stores the identity and desired state of one virtual machine.

### 2. Infrastructure adapter

A small adapter that talks to the local virtualization layer and translates cloud actions into actual machine actions.

### 3. One virtual machine

A small Linux virtual machine with Secure Shell (SSH) access and a simple test application.

### 4. Tiny operator interface

A simple web page or command-line interface (CLI) that can:

- create
- inspect
- start
- stop
- restart
- delete

The first interface does not need customer accounts, polished design, payments, or a large dashboard.

## Core resource model

At minimum, store:

```text
server_id
name
provider_type
status
desired_state
cpu
memory_mb
disk_gb
network_address
created_at
updated_at
```

The database can initially be a local SQLite database. We can move to PostgreSQL when the control plane becomes multi-user or production-oriented.

## Example API

```text
POST   /servers
GET    /servers
GET    /servers/:id
POST   /servers/:id/start
POST   /servers/:id/stop
POST   /servers/:id/restart
DELETE /servers/:id
```

## End-to-end demonstration

The proof of concept succeeds when this sequence works:

```text
Operator
   |
   v
Create server
   |
   v
Control service
   |
   v
Virtualization adapter
   |
   v
Real Linux VM created
   |
   v
IP / local address returned
   |
   v
SSH connection works
   |
   v
Test application responds
   |
   v
Start / stop / restart works
   |
   v
Delete request removes the VM
```

## Success criteria

1. No fake status is allowed. The reported machine state must come from the actual virtualization layer.
2. Deleting a resource must actually delete the virtual machine.
3. Restarting the control service must not erase the resource record.
4. The operator can repeat the lifecycle without manually opening the hypervisor interface for each action.
5. The experiment can run on an 8 GB RAM, 256 GB storage, Core i5 laptop with a deliberately small footprint.

## Explicitly deferred

- user authentication
- organizations and teams
- billing
- public customer traffic
- multiple physical nodes
- Kubernetes
- distributed storage
- load balancers
- virtual private cloud networking
- autoscaling
- managed databases
- object storage
- serverless computing
- Graphics Processing Unit (GPU) infrastructure
- multi-region deployment
- high availability

## Next phase

After this lifecycle is proven, the next step is not immediately "build more features."

The next step is to move the same control model from the laptop to a small dedicated server and prove that the architecture survives on real always-on hardware.
