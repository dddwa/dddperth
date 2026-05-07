# Infrastructure

This repository's Bicep templates provision the Azure resources for the DDD Adelaide website.

## Subscription

- Name: DDD Adelaide
- ID: `f7ecc9c7-68d3-4725-b404-72bf507e4fd2`
- Tenant: `f23a99d6-f54b-4ab1-b48a-4aaac25b2b30`

## Resource groups

| Environment | Resource group | Region |
|---|---|---|
| Staging | `dddadl-site-stg` | australiaeast |
| Prod | `dddadl-site-prd` | australiaeast |

## Deployed resources

### Staging (`dddadl-site-stg`)

| Resource | Name |
|---|---|
| Container App | `dddadl-ca-ddd-vkrlpcysogyvu` |
| Container Apps Env | `dddadl-cae-vkrlpcysogyvu` |
| ACR | `dddadlcrvkrlpcysogyvu` |
| Storage Account | `dddadlstvkrlpcysogyvu` |
| Key Vault | `dddadl-kv-vkrlpcysogyvu` |
| App Insights | `dddadl-appi-vkrlpcysogyvu` |
| Log Analytics | `dddadl-log-vkrlpcysogyvu` |
| Managed Identity | `dddadl-id-ddd-vkrlpcysogyvu` |
| Dashboard | `dddadl-dash-vkrlpcysogyvu` |

### Prod (`dddadl-site-prd`)

| Resource | Name |
|---|---|
| Container App | `dddadl-ca-ddd-eehkvrrepb42s` |
| Container Apps Env | `dddadl-cae-eehkvrrepb42s` |
| ACR | `dddadlcreehkvrrepb42s` |
| Storage Account | `dddadlsteehkvrrepb42s` |
| Key Vault | `dddadl-kv-eehkvrrepb42s` |
| App Insights | `dddadl-appi-eehkvrrepb42s` |
| Log Analytics | `dddadl-log-eehkvrrepb42s` |
| Managed Identity | `dddadl-id-ddd-eehkvrrepb42s` |
| Dashboard | `dddadl-dash-eehkvrrepb42s` |

## Deploy

The Bicep template is **subscription-scoped** (`targetScope = 'subscription'`); the resource group is created by the template itself.

```bash
az deployment sub create \
  --location australiaeast \
  --name <deployment-name> \
  --template-file infra/main.bicep \
  --parameters infra/main.parameters.json \
  --parameters environmentName=site-<stg|prd> location=australiaeast
```

The committed `main.parameters.json` uses `${VAR}` syntax that `azd` would expand. For manual `az` deploys, override values that have `${VAR}` references via `--parameters key=value` on the command line.

## Custom domain `dddadelaide.com`

`dddadelaide.com` is registered as a hostname on the prod Container App but **not yet bound with a managed certificate**. Cert provisioning requires the domain to resolve to the Container App (HTTP-01 challenge), which doesn't happen until DNS cutover at Stage 5.

To verify domain ownership and prepare for the Stage 5 cutover, the following TXT record should be added to `dddadelaide.com` DNS:

- Type: TXT
- Name: `asuid` (or `asuid.dddadelaide.com` in your DNS UI)
- Value: `131AC2352B395443752EF9106C7C89DE472AC4E82B0D736A81392B2C353E1296`
- TTL: 3600

Prod Container App FQDN (the cutover target): `dddadl-ca-ddd-eehkvrrepb42s.bluetree-ecfded7c.australiaeast.azurecontainerapps.io`

## Recovery on failed Bicep deploy

```bash
az deployment operation group list \
  --resource-group <RG> \
  --name <DEPLOYMENT_NAME> \
  -o table

# or for subscription-scoped deployments:
az deployment operation sub list --name <DEPLOYMENT_NAME> -o table
```

Common failures:
- **Naming-policy conflicts**: rename and re-run.
- **Regional capacity**: try `australiasoutheast` instead.
- **RBAC**: verify the executor has `Contributor` on the subscription.
- **`@minLength(1)` parameter validation**: most Bicep params require non-empty strings even for placeholder values. Use `placeholder` rather than empty string when the real value isn't known yet.
- **`${VAR}` references not expanded**: `az` doesn't expand `${VAR}` syntax in parameter files. Use `azd up` (which does), or pass real values via `--parameters key=value`.

## Voting blob container

Both staging and prod storage accounts have a `voting` blob container (provisioned by the Bicep). Vote table data lands in `Votes${year}` Azure Table Storage tables (created lazily by the application on first write).

## Outstanding follow-ups

- **`infra/main.parameters.json` `${VAR}` references**: kept committed because `azd` consumers expect them. Manual `az` consumers must use a separate parameters file or `--parameters key=value` overrides.
- **`gitHubAppId` and related secrets**: deployed with `placeholder` values. Real values are configured at the Container App env-var level (Stage 4) once GitHub OAuth app is created.
- **`certificateId` parameter**: currently empty (`""`); cert binding deferred to Stage 5 cutover.
