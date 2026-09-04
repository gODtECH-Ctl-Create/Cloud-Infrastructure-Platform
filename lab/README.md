# CloudLab Phase 0

This directory is the first runnable proof-of-concept for the cloud platform.

## Goal

Use one Linux laptop as the physical host and prove that our own control plane can manage a real virtual machine through libvirt.

Baseline host target:

- Intel Core i5 or comparable CPU
- 8 GB RAM
- 256 GB storage

We intentionally use one small virtual machine. This is a laboratory, not production cloud infrastructure.

## Stack

- Linux host
- QEMU (Quick Emulator)
- KVM (Kernel-based Virtual Machine)
- libvirt
- `virsh`
- `virt-install`
- Python 3 standard library
- SQLite

No Kubernetes, distributed storage, public customer workloads, or payment processing in Phase 0.

## 1. Prepare a Linux host

On Debian/Ubuntu-style systems:

```bash
sudo apt update
sudo apt install -y qemu-kvm libvirt-daemon-system libvirt-clients virtinst qemu-utils cpu-checker
sudo usermod -aG libvirt,kvm "$USER"
```

Log out and back in after changing group membership.

Then run:

```bash
bash lab/host-check.sh
virsh -c qemu:///system list --all
```

## 2. Run the control plane

From the repository root:

```bash
python3 lab/control-plane.py
```

It binds to `127.0.0.1:8080` by default.

Health check:

```bash
curl http://127.0.0.1:8080/health
```

## 3. Create the first real VM

Use a Linux installer ISO already present on the laptop. Example:

```bash
curl -X POST http://127.0.0.1:8080/v1/servers \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "cloudlab-01",
    "vcpus": 1,
    "memory_mb": 1024,
    "disk_gb": 8,
    "iso": "/absolute/path/to/linux.iso"
  }'
```

The control plane creates a real qcow2 disk and a real libvirt domain. The installer can then be completed through the local libvirt console or another intentionally configured access method.

## 4. Manage the VM

List resources:

```bash
curl http://127.0.0.1:8080/v1/servers
```

Inspect one resource:

```bash
curl http://127.0.0.1:8080/v1/servers/cloudlab-01
```

Start, stop, restart:

```bash
curl -X POST http://127.0.0.1:8080/v1/servers/cloudlab-01/start
curl -X POST http://127.0.0.1:8080/v1/servers/cloudlab-01/stop
curl -X POST http://127.0.0.1:8080/v1/servers/cloudlab-01/restart
```

Delete it:

```bash
curl -X DELETE http://127.0.0.1:8080/v1/servers/cloudlab-01
```

Deletion removes the libvirt domain and the PoC disk created by the control plane.

## Important safety rule

Do not bind the control plane to `0.0.0.0` during Phase 0. The API controls virtual machines and is intentionally local-only until authentication, authorization, firewalling, logging, and secure remote access are implemented.

## What counts as success

The project has proved its core idea when:

1. the laptop can run libvirt;
2. the control plane can see real libvirt state;
3. a real VM can be created or registered;
4. lifecycle operations change the real VM;
5. the control-plane registry survives an application restart; and
6. deleting the resource removes the actual VM.

That is the bridge from “I can run virtual machines” to “I am beginning to operate a cloud control plane.”
