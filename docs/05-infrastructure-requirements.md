# 05 Infrastructure Requirements

## Phase 0: laptop laboratory

Required categories:

### Host

- laptop with hardware virtualization enabled
- sufficient RAM for several virtual machines
- sufficient SSD capacity for operating-system images and test disks
- stable power
- stable local network

### Virtualization

Use a hypervisor appropriate to the host operating system. Preferred Linux path: Kernel-based Virtual Machine (KVM) with a management layer such as Proxmox Virtual Environment where practical.

### Operating system

Linux virtual machines for infrastructure nodes and workload experiments.

### Networking

- isolated virtual bridge/network
- internal address range
- host firewall
- controlled ingress for lab services
- optional virtual router for experiments

### Storage

Start with local virtual disks. Do not pretend local storage is distributed storage. Distributed storage is a later milestone.

### Monitoring

Prometheus-compatible metrics and Grafana dashboards are a reasonable starting point.

## Phase 1: small production cluster

A first dedicated cluster should target redundancy rather than raw quantity.

Conceptual minimum:

- 3 compute-capable physical servers
- dedicated or redundant storage design
- managed switching
- redundant network uplinks where affordable
- remote hardware management
- reliable power and cooling supplied by the data center
- backup strategy independent of the primary workload disks

## Physical server considerations

Prefer enterprise servers with:

- adequate CPU core count
- Error-Correcting Code (ECC) memory
- redundant power supplies
- hot-swappable components where practical
- remote management such as Dell iDRAC, HPE iLO, or equivalent
- multiple network interfaces
- Solid-State Drive (SSD) or Non-Volatile Memory Express (NVMe) storage suitable for virtualization

Exact hardware models must be selected from current prices, availability, warranty, and data-center compatibility rather than assumed in advance.

## Network requirements as the platform matures

- Layer 2 switching
- Layer 3 routing
- firewalling
- private networks
- public address allocation
- load balancing
- monitoring
- upstream Internet transit
- redundancy

Later, Internet routing may involve an Autonomous System Number (ASN), Border Gateway Protocol (BGP), and independent upstream providers. This is not required for the laptop laboratory.

## Data center requirements

When we move production off the laptop, prefer colocation or a managed data-center facility before building our own building.

The facility should provide:

- redundant power
- cooling
- physical security
- network connectivity
- fire detection and suppression
- rack space
- remote hands support
- environmental monitoring
- service-level commitments appropriate to the product

## Storage evolution

Stage 1: local virtual disks

Stage 2: replicated storage for critical resources

Stage 3: distributed storage such as a Ceph-based cluster where the operational trade-offs justify it

Stage 4: object storage service

## Compute evolution

Stage 1: virtual machines

Stage 2: better placement and resource accounting

Stage 3: containers and Kubernetes orchestration

Stage 4: specialized compute, including Graphics Processing Unit (GPU) capacity, only when customer demand justifies the capital cost
