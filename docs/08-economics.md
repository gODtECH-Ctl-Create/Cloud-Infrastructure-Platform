# 08 Economics

## Economic model

The cloud business converts fixed infrastructure into rentable capacity.

Core cost categories:

- servers
- storage media
- switches and network equipment
- data-center space
- power and cooling
- upstream bandwidth
- Internet addresses and transit where applicable
- software and support
- backups
- engineering and operations

## Capacity model

For each compute node we should track:

- physical CPU capacity
- allocatable virtual CPU capacity
- physical memory
- allocatable memory
- storage capacity
- reserved capacity
- customer-used capacity
- failed/unavailable capacity

The difference between physical capacity and sellable capacity must be measurable.

## Utilization

Buying more servers does not automatically create more profit. We need enough utilization to cover the fixed cost of the cluster while preserving operational headroom.

Do not target maximum physical utilization. Leave room for failures, bursts, maintenance, and safe scheduling.

## Pricing model

Start with a transparent unit model such as:

Compute + memory + storage + bandwidth + optional public networking + managed services.

The actual prices must be based on measured infrastructure cost and customer willingness to pay.

## Example resource unit

A virtual machine could have:

- 2 virtual CPU cores
- 4 GB RAM
- 50 GB storage

The platform should calculate a monthly or usage-based price from a central pricing configuration.

## Billing principles

- prices are versioned
- usage is recorded independently of the user interface
- discounts are explicit
- refunds are auditable
- unpaid resources follow a documented lifecycle
- billing events are immutable or append-only where practical

## Early financial experiment

The laptop lab is not expected to be profitable. Its purpose is to discover the real technical cost drivers before capital is committed.

Before buying the first production servers, estimate:

1. monthly fixed infrastructure cost
2. usable compute capacity
3. usable storage capacity
4. expected utilization
5. expected bandwidth cost
6. backup cost
7. support/operations cost
8. target gross margin
9. break-even customer count

## Capital strategy

The preferred sequence is:

Learn on laptop -> prove demand -> colocate small cluster -> increase utilization -> reinvest -> expand regions.

Avoid building expensive physical infrastructure before there is evidence of sustained demand.
