# 03 Laptop Cloud Lab

## The answer to the core question

Yes. For the first miniature version, the laptop can act as the physical hardware underneath the cloud laboratory.

What makes it a cloud experiment is not the laptop itself. The cloud behavior comes from the software stack that virtualizes resources, creates isolated workloads, manages networking and storage, exposes an API, and tracks state.

The laptop is therefore the **host machine**. The virtual machines and services running on it form the first laboratory cluster.

## Example

One laptop might have:

- 8 to 16 CPU cores
- 16 to 64 gigabytes of RAM
- 512 gigabytes to 2 terabytes of Solid-State Drive (SSD) storage
- wired or wireless Internet access

Inside it we could create:

- control-plane virtual machine
- compute node 1
- compute node 2
- storage or observability node

The exact numbers depend on the laptop. We should measure the actual hardware before selecting the lab topology.

## Example topology

Laptop

-> Hypervisor

-> vm-control-plane

-> vm-compute-01

-> vm-compute-02

-> vm-monitoring

A more constrained laptop can combine roles. The purpose is learning, not high availability.

## Recommended host approach

A Linux laptop is the cleanest target for the first serious lab because Linux offers direct access to Kernel-based Virtual Machine (KVM) virtualization and standard networking tools.

A Windows or macOS laptop can still be used through its available virtualization layer, but nested virtualization and network behavior may add complexity.

## What the lab should prove

1. Create a virtual machine from an image.
2. Assign virtual CPU and memory.
3. Attach persistent storage.
4. Connect the machine to a private virtual network.
5. Optionally expose a public or forwarded port.
6. Discover the resource from the control plane.
7. Start, stop, restart, resize, and delete the machine.
8. Collect CPU, memory, disk, and network metrics.
9. Record resource lifecycle events.
10. Demonstrate that a failure becomes visible to the control plane.

## Why the laptop is not production cloud infrastructure

A laptop usually has:

- one physical host
- limited power resilience
- limited cooling
- consumer-grade storage
- changing Internet connectivity
- possible carrier-grade network address translation
- no redundant network path
- no physical security controls
- no hardware replacement process

Therefore the laptop is the development laboratory, not the production availability layer.

## First laboratory safety rule

Do not expose the experimental management interface directly to the public Internet. Keep the control plane on a private network until authentication, firewalling, logging, patching, and remote-access controls have been intentionally designed.

## First experiment

The simplest complete experiment is:

Laptop -> Hypervisor -> Linux virtual machine -> SSH access -> simple web server

Then add a second virtual machine and make the control plane create and destroy the first machine.

That second step is where the project changes from ordinary virtualization into the beginning of a cloud platform.
