# 04 Minimum Viable Product Specification

## Objective

Prove that we can operate a small real cloud resource lifecycle from an Application Programming Interface (API) and a simple web console.

## Minimum viable product scope

### Account layer

- user registration and login
- organization/workspace
- project
- role-based access
- API key creation and revocation

### Compute

- virtual machine image selection
- name
- virtual CPU count
- memory allocation
- disk allocation
- start
- stop
- restart
- delete
- status
- basic console or Secure Shell (SSH) connection information

### Network

- private lab network
- virtual network interface
- internal address
- controlled public or port-forwarded access for lab testing
- basic firewall rules

### Storage

- persistent virtual disk
- snapshot concept
- storage capacity tracking

### Control plane

- resource database
- desired state
- actual state
- provisioning job
- job history
- error state
- audit event

### Dashboard

- resources page
- resource detail
- create resource form
- status indicators
- basic utilization metrics

### Billing foundation

Do not implement a full payment gateway first. Start by recording billable resource definitions and simulated usage.

Example:

`4 vCPU + 8 GB RAM + 100 GB disk + bandwidth` -> usage record -> estimated cost.

Actual payment collection can follow after the provisioning and accounting model is reliable.

## Example API surface

`POST /v1/projects`

`POST /v1/servers`

`GET /v1/servers`

`GET /v1/servers/:id`

`POST /v1/servers/:id/start`

`POST /v1/servers/:id/stop`

`POST /v1/servers/:id/restart`

`DELETE /v1/servers/:id`

`GET /v1/usage`

The exact API design will be refined during the Technical Requirements Document phase.

## Definition of done for the first end-to-end demo

A test user can log in, create a project, request a server, the control plane validates the request, an infrastructure adapter creates a real virtual machine, the dashboard reports its real state, the user can connect to the machine, and deleting the resource actually removes it.

The demo must survive a restart of the control-plane application without losing the resource record.

## Explicitly deferred

- multi-region scheduling
- automated autoscaling
- managed databases
- object storage
- serverless functions
- artificial intelligence or Graphics Processing Unit (GPU) compute
- advanced load balancing
- public Internet-facing customer production workloads
