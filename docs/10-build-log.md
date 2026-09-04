# 10 Build Log

## 2026-09-04 - Repository reset and cloud project started

### Repository action

The former Waste2Work-Hub application tree is being replaced by documentation and architecture material for the new cloud infrastructure project.

The previous application is not being silently mixed into the new project. Git history remains available for reference, while the active `main` tree becomes the clean project ground.

### Initial technical conclusion

A laptop can serve as the physical host for the first cloud laboratory.

The laptop supplies the raw resources: CPU, memory, storage, and network interface. Virtualization turns those resources into isolated virtual machines. A control plane can then manage those virtual machines through an infrastructure adapter.

### Important distinction

This is a development cloud laboratory, not a production cloud. The lab is for learning, prototyping, architecture validation, provisioning automation, failure testing, and cost discovery.

### Next work item

Inspect the actual development laptop hardware and operating system, then choose the first virtualization path and design the exact lab topology.

### First concrete proof

Create one Linux virtual machine, create a second Linux virtual machine, connect them through an isolated network, and build a minimal service capable of creating and deleting a test virtual machine through the infrastructure layer.
