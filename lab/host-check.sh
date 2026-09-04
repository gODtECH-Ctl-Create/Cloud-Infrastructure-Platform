#!/usr/bin/env bash
set -euo pipefail

printf '=== Cloud Lab Host Check ===\n'

if command -v lscpu >/dev/null 2>&1; then
  printf '\nCPU:\n'
  lscpu | grep -E '^(Model name|CPU\(s\)|Thread|Core|Socket)' || true
else
  printf '\nCPU: lscpu not available\n'
fi

if command -v free >/dev/null 2>&1; then
  printf '\nMemory:\n'
  free -h
else
  printf '\nMemory: free not available\n'
fi

printf '\nStorage:\n'
df -h . || true

printf '\nVirtualization:\n'
if [[ -r /proc/cpuinfo ]] && grep -qE 'vmx|svm' /proc/cpuinfo; then
  echo 'CPU hardware virtualization flags detected.'
else
  echo 'No vmx/svm flag detected. Check firmware settings or host architecture.'
fi

if command -v virt-host-validate >/dev/null 2>&1; then
  printf '\nlibvirt host validation:\n'
  virt-host-validate || true
else
  echo 'virt-host-validate is not installed yet.'
fi

printf '\nLibvirt tools:\n'
command -v virsh || echo 'virsh: not installed'
command -v virt-install || echo 'virt-install: not installed'
command -v qemu-system-x86_64 || echo 'qemu-system-x86_64: not installed'
