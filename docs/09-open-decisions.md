# 09 Open Decisions

These decisions should remain explicit until tested or researched.

## Product name

Final company/product name is undecided.

## Primary infrastructure stack

Candidates include a Proxmox Virtual Environment plus Kernel-based Virtual Machine (KVM) path, direct KVM tooling, or OpenStack when scale requires it.

Decision rule: choose the smallest stack that can demonstrate the required behavior reliably.

## Container strategy

Containers and Kubernetes are not required for the first virtual-machine milestone. Introduce them when they solve a customer or platform requirement.

## Storage

The first lab can use local virtual disks. Production needs a tested redundancy model before customer data is trusted to it.

## Network edge

Initial public connectivity can be provided by a data center or upstream provider. Owning network transit and advanced routing is a later decision.

## Region strategy

Start with one region. Choose the physical location only after evaluating power quality, connectivity, data-center options, latency, regulation, and customer demand.

## Billing

Decide between prepaid, postpaid, usage-based, subscriptions, or a hybrid after customer discovery.

## Market wedge

Possible first wedge: simple virtual machines and application deployment for African developers and small teams.

## Data residency

Determine which customers require local or regional data residency and which workloads can use other regions.

## Service-level objectives

Availability targets should be defined after the architecture can actually support them. Do not advertise an uptime percentage before it is measurable and backed by redundancy and recovery procedures.

## Next technical decisions

1. What operating system does the development laptop run?
2. What are the host CPU, RAM, storage, and virtualization capabilities?
3. Which virtualization stack provides the cleanest first experiment?
4. Should the first control plane be a small Node.js/TypeScript service or another backend stack?
5. What database schema should represent resources and their desired/actual state?
6. What is the simplest safe network topology for the lab?
7. What provisioning interface should the infrastructure adapter expose?
