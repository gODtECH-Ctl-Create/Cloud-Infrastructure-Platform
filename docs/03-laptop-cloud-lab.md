# 03 Laptop Cloud Lab

## Purpose

The first goal is not to build a production cloud. It is to prove the central idea with the smallest useful experiment.

We can do that on a modest laptop.

## Current lab hardware target

Assume the starting machine is approximately:

- Intel Core i5 processor
- 8 GB RAM
- 256 GB local storage

We should deliberately use only a small portion of those resources.

The laptop is a **single development host**, not production infrastructure.

## Minimum topology

```text
Laptop
  |
  +-- Host operating system
  |
  +-- Hypervisor / virtualization layer
          |
          +-- One Linux virtual machine
                  |
                  +-- Test application
                  +-- SSH access
```

The cloud control plane can initially run directly on the host or in a very lightweight container. We do not need multiple virtual machines yet.

## Suggested resource budget

The exact allocation depends on the host operating system, but the principle is:

- keep several gigabytes of RAM available to the host
- give the test virtual machine only what it needs
- keep substantial free disk space for the host
- avoid large snapshots, databases, Kubernetes clusters, or multiple operating-system images

For an 8 GB machine, a single small Linux virtual machine is enough for the proof of concept.

## What we are proving

The lab only needs to demonstrate this sequence:

```text
Create request
     |
     v
Control plane
     |
     v
Provision virtual machine
     |
     v
Virtual machine receives resources
     |
     v
Machine becomes reachable
     |
     v
Deploy test application
     |
     v
Read status / metrics
     |
     v
Stop / restart
     |
     v
Delete machine
```

If we can automate that lifecycle, the experiment has succeeded.

## First experiment

### Step 1

Install a suitable local virtualization layer.

### Step 2

Create one small Linux virtual machine.

### Step 3

Install OpenSSH (Open Secure Shell) and a tiny web server.

### Step 4

Create a very small local control service with operations such as:

```text
POST /servers
GET /servers
POST /servers/:id/start
POST /servers/:id/stop
POST /servers/:id/restart
DELETE /servers/:id
```

### Step 5

The control service calls the local virtualization layer to perform the requested action.

### Step 6

Persist the resource record so that restarting the control service does not lose the server's identity or state.

## What is intentionally excluded

Do not add these during the first experiment:

- multiple physical nodes
- high availability
- Kubernetes
- distributed storage
- public customer access
- automated billing
- multi-region networking
- object storage
- managed databases
- autoscaling
- advanced monitoring

Those belong to later phases.

## Safety

Keep the management interface on the local machine or a private local network. Do not expose the experimental control plane to the public Internet.

## Graduation condition

We graduate from the laptop lab when the following works reliably:

> A simple API can create, inspect, start, stop, restart, and delete a real virtual machine without manual intervention.

At that point, buying a small dedicated server becomes worthwhile because we will already know what the hardware is supposed to run.
