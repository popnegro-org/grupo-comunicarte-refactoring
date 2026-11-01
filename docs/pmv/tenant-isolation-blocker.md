# PMV blocker: tenant isolation

**Status: BLOCKED — implementation requires a product/data decision.**

## Verified state

Read-only inspection of the Neon preview branch showed:

- `tenants` contains `tenant-ba` (Buenos Aires OOH Premium) and `tenant-default` (LeadMóvil Mendoza OOH).
- `supports` has no `tenant_id` column; `mediakit_requests` and `mediakit_request_items` also have no tenant ownership column.
- `mediakits` has a nullable `tenant_id` and its three existing records are assigned (one to Buenos Aires, two to Mendoza).
- PostgreSQL row-level security is disabled on `supports`, `mediakit_requests`, `mediakit_request_items`, `mediakits`, `support_media` and `support_pricing`.
- Current backend services list/read/write supports and Media Kit requests without a tenant predicate or tenant context.
- Existing support inventory can be mapped by city for active records (10 Buenos Aires, 19 Mendoza); 10 inactive records have no city.
- Of 18 existing Media Kit requests, 15 reference supports from one tenant and 3 contain supports from both tenants. Assigning those 3 to either tenant would be an unsupported data decision.

## Required decision

Before implementing tenant isolation, confirm:

1. Whether tenant context is selected at login or resolved from the request hostname/domain.
2. Whether the 3 mixed-tenant requests should remain unassigned, be split, or be assigned by a business rule.
3. Whether the 10 inactive supports without city remain unassigned or belong to a tenant.

## Safety

No database writes or schema changes were performed during this audit. The preview and main Neon branches were queried read-only. Production data remains unchanged.

Tenant isolation is a PMV acceptance blocker; it must not be declared complete based only on the existing `mediakits.tenant_id` column.
