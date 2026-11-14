# Backend

Every endpoint, including health, requires a valid Microsoft Entra v2 access token issued to this API for a user assigned the `Trainer` or `Committee` app role and the delegated `access_as_user` scope. The token signature, expiry, issuer, tenant and audience are validated. Missing configuration fails closed. The Function registration's `anonymous` setting does not bypass this application-level check.

Set `ENTRA_TENANT_ID` and `ENTRA_API_CLIENT_ID` to the tenant and API app registration UUIDs. The single-tenant API issues v2 access tokens, exposes `access_as_user`, defines user-assignable `Trainer` and `Committee` roles, and requires an explicit app assignment. The PWA is preauthorized for that API scope. Invite external Microsoft accounts as guests in the tenant and explicitly assign the applicable API role when needed. Frontend sign-in and the live client are implemented, but the final SPA redirect URI and live integration must be configured and verified. Never store youth-player personal information.

All authorized users can read team goals and training data. Writing team season goals, seasons, programs, session completion or skill progress requires an explicit team assignment or the `Committee` role. Creating or updating teams and managing assignments requires `Committee`. Committee members manage assignments using `GET /api/teams/{teamId}/trainers` and `PUT` / `DELETE /api/teams/{teamId}/trainers/{objectId}`; the object ID must be the user's object ID in this tenant, including for guests. Assignments are per team, not per season; multiple teams and multiple trainers are supported. These identifiers are personal data. Assigning an ID does not invite the user or grant an Entra app role. Role changes in Entra take effect when a new token is issued; team assignment removal is checked on each write. Live permission tests are still required.

## Local operation

Install workspace dependencies, then run `npm --prefix api run build` and `npm --prefix api test`. Start Cosmos DB emulator and Azurite before `npm --prefix api start`. `local.settings.json` selects `AZURE_FUNCTIONS_ENVIRONMENT=Development`, the emulator connection string, and `AzureWebJobsStorage=UseDevelopmentStorage=true`. Supply the actual emulator key locally; do not use that connection string in Azure. The host—not application code—uses Blob Storage. Local storage health checks reachability of the default Azurite Blob endpoint; an HTTP 400/403 proves reachability, not host authentication.

Local HTTP requests also require the Entra settings and a valid assigned-user token; there is no development authentication bypass.

Any value other than the exact string `Development` selects Cosmos `COSMOSDB_ENDPOINT` plus `DefaultAzureCredential`; no key or connection-string fallback is used. Set `COSMOSDB_DATABASE` (default `honkbal`). Configure the Functions host with identity-based `AzureWebJobsStorage__accountName` or `AzureWebJobsStorage__blobServiceUri`, `AzureWebJobsStorage__queueServiceUri`, and `AzureWebJobsStorage__tableServiceUri` as required by the host/extensions, and grant the Function identity the documented host-storage roles including Storage Blob Data Owner and Storage Queue Data Contributor. Do not configure production `AzureWebJobsStorage` as a secret-bearing connection string. The production Blob health probe authenticates to list containers and requires appropriate RBAC. Cosmos and host storage are essential; there are no enhancement dependencies. Health reports degraded (one of two checks passes) with HTTP 200 and unhealthy (neither passes) with HTTP 503.

## Integration data contract

No containers, migrations or seed data are created by this scaffold. The integration agent must create the database and containers and import the existing catalog without modifying `data/nl/`. All IDs and `kind` values below are case-sensitive. Remove Cosmos system properties from externally returned records.

| Container | Partition key | Logical collections / records |
|---|---|---|
| `team-records` | `/team_id` | `team`, `season`, `season-year`, `team-goal`, `composition`, `program`, `session`, `skill-progress`, `trainer-assignment`, `development-assignments` |
| `reference-data` | `/pk` | `catalog`, `skill`, `progression`, `age-goal`, `curriculum`, `development-model` |

Reference documents have `id`, `kind`, and `pk`, plus the fields from the matching shared entity. Use `pk=catalog` for one `catalog` document containing `drills`, `categories` and `warmup`; `pk=skills` for `skill`; `pk=progression:{age_group_id}:{version}` for progression; `pk=age-goal:{age_group_id}:{version}` for generic goals. This permits a stable generic goal ID to recur across versions while remaining unique inside a partition. Reference queries use kind/age fields and can cross partitions. Integration must ensure the catalog document fits Cosmos's item size limit.

Committee members can publish an age-group curriculum through `PUT /api/age-groups/{ageGroupId}/curriculum`, with an expected version for conflict detection. Each publication is a new immutable document under `pk=curriculum:{ageGroupId}`; the current version supplies generic goals and skill progression, while previous versions remain available to existing season compositions. Skill IDs must match catalog tags for program selection. The endpoint does not infer a player's progression or copy objectives between categories.

The separate development model is available at `GET` / `PUT
/api/development-model`; writes require `Committee`, the full validated model
and an `expectedVersion` (0 only for the initial version). Each version is a
new document under `pk=development-model`, without modifying the existing
curriculum. `GET` / `PUT
/api/teams/{teamId}/seasons/{seasonId}/development-goals` reads or saves a
team's development-goal assignments; writes require the assigned trainer or
Committee and include both `expectedVersion` and `modelVersion`. Assignment
revisions are immutable team-partition documents and refer to an immutable
model version. Goal references, overlapping active age bands, duplicate
assignments and concurrent writes are checked. Archived goals cannot be
activated. No seed data is imported at deployment; a Committee user must
explicitly load and save a supplied model. The ignored `data/nl/` directory
is optional for tests: synthetic fixtures always run, while the actual seed
test runs only when that separately supplied file is present.

Validate the local catalog without writing using `npm run catalog:import --workspace honkbal-trainer-api`. Once the target Cosmos database and container exist and the signed-in operator has Cosmos **data-plane** read/query and upsert permissions, set `COSMOSDB_ENDPOINT` and optionally `COSMOSDB_DATABASE`, then add `-- --apply` to run the import. The script uses `DefaultAzureCredential`, checks the document size and rejects conflicting catalog records. It creates no database, container, goals, skills, players or credentials. Existing `catalog` data is overwritten on a successful repeated import. The source catalog is not included in the public repository pending rights review.

Each team document has `team_id=id`. Every team-owned document has that team's ID in `team_id`, and a `kind` identifying its logical collection. Skill progress IDs are `skill-{skill_id}`. Compositions use `composition-{seasonId}`; they contain a frozen `goals` snapshot and source/version references, while individual team goals remain separate documents. A `season-year-{year}` guard record per team is created atomically with the season to enforce one season per calendar year. Imports of existing seasons must also create these guards. Team programs and their 12 generated sessions are created in a same-partition transactional batch. Composition and associated team-goal creates, updates and removals are also atomic; Cosmos's 100-operation limit is enforced and concurrent composition writes use ETags. Program and session routes have no team identifier in their approved contracts; they locate globally unique UUIDs across partitions, then session lists and writes use the discovered team partition. Team/season routes always use the supplied team partition.

The scaffold planner produces 12 weekly sessions beginning on or after the configured start date. It filters by the team's current category skill mappings, required equipment, indoor and field/cage/mound constraints, and enforces each drill's minimum repeat gap. Every session must fill the requested duration: if any week cannot be filled, creation returns HTTP 422 (`VALIDATION_ERROR`) with the date, requested, planned and missing minutes; no program or sessions are saved. Check equipment, space, curriculum skill mappings and the available drill pool rather than silently relaxing constraints. Existing underfilled programs are not changed automatically. The catalog and progression reference records must exist before program creation; a missing progression is reported rather than silently creating empty sessions. The optional supplied-catalog test verifies all twelve 90-minute HB3 demo sessions, block continuity and repeat gaps when `data/nl/` is present. No universal age norms or ceiling-height suitability are inferred.
