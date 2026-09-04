# 06 Security and Operations

## Security baseline

The platform will eventually host customer workloads, so security must be designed before public production use.

### Identity

- strong authentication
- Multi-Factor Authentication (MFA)
- short-lived credentials where appropriate
- API-key rotation and revocation
- least-privilege access

### Authorization

Every resource request must be evaluated against the organization, project, role, and resource ownership. Administrative access must be auditable.

### Tenant isolation

Tenant boundaries must exist in the control plane, network configuration, storage access, credentials, and monitoring paths.

### Secrets

Do not commit credentials, API keys, private keys, or environment secrets to Git. The old repository contained a tracked `.env` file; the reset intentionally removes it from the active tree.

### Host security

- patched operating systems
- host firewalls
- minimal exposed services
- secure remote administration
- encrypted administrative connections
- disabled unused services
- restricted management networks

## Monitoring

Every production node should expose at least:

- CPU utilization
- memory utilization
- disk capacity
- disk latency where available
- network throughput
- packet/errors where available
- node health
- workload health

## Logging

Record:

- authentication events
- API calls
- provisioning actions
- resource state transitions
- administrative actions
- billing events
- security-relevant events

Logs should be timestamped and attributable to an actor or system component.

## Backups

At minimum:

- control-plane database backups
- configuration backups
- workload backup strategy defined per service
- backup integrity checks
- restore testing

A backup that has never been restored should not be treated as proven recovery.

## Incident response

We need a documented path for:

Detection -> triage -> containment -> recovery -> customer communication -> root-cause review -> corrective action

## Availability

The laptop lab has no availability guarantee. A production service must define realistic targets only after measuring actual infrastructure redundancy, recovery procedures, and operational staffing.

## Data protection

Before commercial launch in Nigeria, review obligations under the Nigeria Data Protection Act and any applicable rules or contractual requirements for customer data, cross-border transfers, retention, security, and incident handling.

## Operations maturity

Do not expose the platform to general public workloads until:

- authentication is real
- authorization is tested
- tenant isolation is tested
- secrets are managed safely
- backups are working
- monitoring and alerting are active
- recovery procedures have been rehearsed
- resource quotas are enforced
- abuse controls exist
