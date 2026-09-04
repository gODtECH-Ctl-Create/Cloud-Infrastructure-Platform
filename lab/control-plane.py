#!/usr/bin/env python3
"""Tiny local cloud control plane for the Phase 0 laboratory.

This is intentionally small. It manages real libvirt domains through virsh and
persists only the control-plane resource registry in SQLite. It binds to
127.0.0.1 by default so VM management is not exposed to the public Internet.
"""

from __future__ import annotations

import json
import os
import re
import sqlite3
import subprocess
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

HOST = os.getenv("CLOUDLAB_HOST", "127.0.0.1")
PORT = int(os.getenv("CLOUDLAB_PORT", "8080"))
LIBVIRT_URI = os.getenv("LIBVIRT_URI", "qemu:///system")
STATE_DB = Path(os.getenv("CLOUDLAB_DB", "./lab/cloudlab.sqlite3"))
DISK_DIR = Path(os.getenv("CLOUDLAB_DISK_DIR", "./lab/disks")).resolve()
NAME_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9._-]{0,62}$")


def db() -> sqlite3.Connection:
    STATE_DB.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(STATE_DB)
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS resources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            kind TEXT NOT NULL DEFAULT 'vm',
            vcpus INTEGER NOT NULL,
            memory_mb INTEGER NOT NULL,
            disk_gb INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    return conn


def run(*args: str) -> str:
    proc = subprocess.run(
        [*args],
        check=False,
        capture_output=True,
        text=True,
        timeout=30,
    )
    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout).strip() or f"exit code {proc.returncode}"
        raise RuntimeError(detail)
    return proc.stdout.strip()


def virsh(*args: str) -> str:
    return run("virsh", "-c", LIBVIRT_URI, *args)


def domain_exists(name: str) -> bool:
    output = virsh("dominfo", name)
    return bool(output)


def state(name: str) -> str:
    return virsh("domstate", name).strip().lower()


def info(name: str) -> dict[str, Any]:
    raw = virsh("dominfo", name)
    result: dict[str, Any] = {}
    for line in raw.splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            result[key.strip().lower().replace(" ", "_")] = value.strip()
    result["name"] = name
    result["state"] = state(name)
    return result


def list_domains() -> list[str]:
    raw = virsh("list", "--all", "--name")
    return [line.strip() for line in raw.splitlines() if line.strip()]


def provision_vm(name: str, vcpus: int, memory_mb: int, disk_gb: int, iso: str | None) -> None:
    if not NAME_RE.fullmatch(name):
        raise ValueError("Invalid VM name")
    if not 1 <= vcpus <= 4:
        raise ValueError("vcpus must be between 1 and 4 for the laptop PoC")
    if not 512 <= memory_mb <= 6144:
        raise ValueError("memory_mb must be between 512 and 6144")
    if not 4 <= disk_gb <= 64:
        raise ValueError("disk_gb must be between 4 and 64")
    if domain_exists(name):
        raise ValueError("A libvirt domain with this name already exists")

    DISK_DIR.mkdir(parents=True, exist_ok=True)
    disk = DISK_DIR / f"{name}.qcow2"
    run("qemu-img", "create", "-f", "qcow2", str(disk), f"{disk_gb}G")

    args = [
        "virt-install",
        "--connect", LIBVIRT_URI,
        "--name", name,
        "--memory", str(memory_mb),
        "--vcpus", str(vcpus),
        "--disk", f"path={disk},format=qcow2",
        "--network", "network=default",
        "--graphics", "none",
        "--noautoconsole",
    ]
    if iso:
        iso_path = Path(iso).expanduser().resolve()
        if not iso_path.is_file():
            raise ValueError("ISO path does not exist")
        args += ["--cdrom", str(iso_path)]
    else:
        raise ValueError("For the first PoC, provide an existing Linux ISO path via iso")

    run(*args)


def response(handler: BaseHTTPRequestHandler, status: int, payload: Any) -> None:
    body = json.dumps(payload, indent=2).encode()
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


class Handler(BaseHTTPRequestHandler):
    server_version = "CloudLab/0.1"

    def log_message(self, fmt: str, *args: Any) -> None:
        print(f"[{self.log_date_time_string()}] {fmt % args}")

    def read_json(self) -> dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length > 64 * 1024:
            raise ValueError("Request too large")
        raw = self.rfile.read(length) if length else b"{}"
        data = json.loads(raw.decode("utf-8"))
        if not isinstance(data, dict):
            raise ValueError("JSON body must be an object")
        return data

    def do_GET(self) -> None:  # noqa: N802
        try:
            path = urlparse(self.path).path.rstrip("/") or "/"
            conn = db()
            if path == "/health":
                response(self, HTTPStatus.OK, {"status": "ok", "libvirt_uri": LIBVIRT_URI})
                return
            if path == "/v1/servers":
                resources = conn.execute("SELECT * FROM resources ORDER BY id").fetchall()
                payload = []
                for row in resources:
                    item = dict(row)
                    try:
                        item["state"] = state(item["name"])
                    except Exception as exc:  # noqa: BLE001
                        item["state"] = "unknown"
                        item["error"] = str(exc)
                    payload.append(item)
                response(self, HTTPStatus.OK, payload)
                return
            if path.startswith("/v1/servers/"):
                name = path.split("/", 3)[-1]
                row = conn.execute("SELECT * FROM resources WHERE name = ?", (name,)).fetchone()
                if not row:
                    response(self, HTTPStatus.NOT_FOUND, {"error": "resource not found"})
                    return
                item = dict(row)
                item["libvirt"] = info(name) if domain_exists(name) else {"state": "missing"}
                response(self, HTTPStatus.OK, item)
                return
            response(self, HTTPStatus.NOT_FOUND, {"error": "route not found"})
        except Exception as exc:  # noqa: BLE001
            response(self, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(exc)})

    def do_POST(self) -> None:  # noqa: N802
        try:
            path = urlparse(self.path).path.rstrip("/")
            data = self.read_json()
            if path == "/v1/servers":
                name = str(data.get("name", ""))
                vcpus = int(data.get("vcpus", 1))
                memory_mb = int(data.get("memory_mb", 1024))
                disk_gb = int(data.get("disk_gb", 8))
                iso = data.get("iso")
                provision_vm(name, vcpus, memory_mb, disk_gb, str(iso) if iso else None)
                conn = db()
                conn.execute(
                    "INSERT INTO resources(name, vcpus, memory_mb, disk_gb) VALUES (?, ?, ?, ?)",
                    (name, vcpus, memory_mb, disk_gb),
                )
                conn.commit()
                response(self, HTTPStatus.CREATED, {"name": name, "state": state(name)})
                return

            parts = path.split("/")
            if len(parts) == 5 and parts[1:3] == ["v1", "servers"]:
                name, action = parts[3], parts[4]
                if not NAME_RE.fullmatch(name):
                    raise ValueError("Invalid VM name")
                if not domain_exists(name):
                    response(self, HTTPStatus.NOT_FOUND, {"error": "libvirt domain not found"})
                    return
                command = {"start": "start", "stop": "shutdown", "restart": "reboot"}.get(action)
                if not command:
                    response(self, HTTPStatus.NOT_FOUND, {"error": "unsupported action"})
                    return
                virsh(command, name)
                response(self, HTTPStatus.OK, {"name": name, "action": action, "state": state(name)})
                return
            response(self, HTTPStatus.NOT_FOUND, {"error": "route not found"})
        except (ValueError, json.JSONDecodeError) as exc:
            response(self, HTTPStatus.BAD_REQUEST, {"error": str(exc)})
        except Exception as exc:  # noqa: BLE001
            response(self, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(exc)})

    def do_DELETE(self) -> None:  # noqa: N802
        try:
            path = urlparse(self.path).path.rstrip("/")
            parts = path.split("/")
            if len(parts) != 4 or parts[1:3] != ["v1", "servers"]:
                response(self, HTTPStatus.NOT_FOUND, {"error": "route not found"})
                return
            name = parts[3]
            conn = db()
            row = conn.execute("SELECT 1 FROM resources WHERE name = ?", (name,)).fetchone()
            if not row:
                response(self, HTTPStatus.NOT_FOUND, {"error": "resource not found"})
                return
            if domain_exists(name):
                try:
                    if state(name) == "running":
                        virsh("destroy", name)
                except Exception:
                    pass
                virsh("undefine", name, "--remove-all-storage")
            disk = DISK_DIR / f"{name}.qcow2"
            if disk.exists():
                disk.unlink()
            conn.execute("DELETE FROM resources WHERE name = ?", (name,))
            conn.commit()
            response(self, HTTPStatus.OK, {"deleted": name})
        except Exception as exc:  # noqa: BLE001
            response(self, HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(exc)})


if __name__ == "__main__":
    print(f"CloudLab control plane listening on http://{HOST}:{PORT}")
    print(f"libvirt: {LIBVIRT_URI}")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
