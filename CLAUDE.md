# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Apex Retail — AI Multi-Agent Churn Detection POC**  
Detects customer churn risk across 6 isolated data systems and orchestrates a personalized retention campaign with human approval — all in under 2 minutes.  
**Demo customer:** CUST-000142 (Sarah Mitchell, Gold tier) — used as mock fallback in all data collectors.

---

## Commands

### Backend (Azure Functions — TypeScript)

```bash
cd backend
npm install
npm run build          # tsc compile → dist/
npm run watch          # tsc watch mode
npm start              # build then func start (port 7071)
npm test               # Jest (no jest.config — uses defaults)
npm test -- --testNamePattern="<pattern>"   # run tests matching name
npm test -- <path/to/test.ts>               # run single test file
```

No lint script is defined in `backend/package.json`. The CI workflow runs `npm run lint --if-present` which is a no-op locally.

### Frontend (React/Vite)

```bash
cd ui
npm install
npm run dev            # Vite dev server (port 3000, proxies /api → localhost:7071)
npm run build          # tsc && vite build → dist/
npm run lint           # ESLint on *.ts, *.tsx
npm run preview        # preview production build
```

### Infrastructure (Terraform)

```bash
cd infra
terraform init \
  -backend-config="resource_group_name=<RG>" \
  -backend-config="storage_account_name=<SA>" \
  -backend-config="container_name=tfstate" \
  -backend-config="key=apex-churn/dev.tfstate"
terraform plan -var="environment=dev"
terraform apply -var="environment=dev"
```

---

## Architecture

```
React SPA (Vite + Tailwind, port 3000)
      │ REST/HTTPS
      ▼
Azure Functions v4 (Node 20 TypeScript, port 7071)
  ├── HTTP API  →  backend/src/functions/httpFunctions.ts
  └── Durable Orchestrator  →  backend/src/orchestrator/churnOrchestrator.ts
        ├── Fan-out: 6 data collectors (parallel Task.all)
        ├── 4 Bedrock AI agents (sequential pipeline)
        └── External event wait: human approval (24h timeout)

Persistence: Azure Cosmos DB Serverless (9 containers)
Secrets:     Azure Key Vault (AWS Bedrock credentials)
Messaging:   Azure Service Bus (campaign dispatch)
```

### Function Registration

**Every new function must be imported in `backend/src/index.ts`** — that file is the sole entry point that registers all activities, orchestrators, and HTTP triggers with the Azure Functions runtime. Adding a file under `activities/` or `functions/` without updating `index.ts` means the function never runs.

### Orchestration Flow (11 Steps)

Defined in `churnOrchestrator.ts`:

1. Fan-out — 6 Cosmos data collectors run in parallel (`Task.all`)
2. Assemble `CustomerDataPackage` from 6 results
3. `scoreChurn` — Bedrock Sonnet 4.5 → `ChurnScore` (0–100, riskTier, citations)
4. `matchOffer` — Bedrock Sonnet 4.5 → `RetentionOffer` from 15-item catalog
5. `generateBrief` — Bedrock Sonnet 4.5 → markdown brief for CSM (300–500 words)
6. `draftOutreach` — Bedrock Haiku 4.5 → email HTML + SMS (≤160 chars) + push (≤60/120 chars)
7. `writePendingRecord` — Cosmos upsert, `approvalStatus=PENDING`
8. `notifyCrmManager` — **console stub** (wire ACS for prod)
9. **Wait** up to 24h for `ApprovalReceived` external event; auto-rejects on timeout
10. `dispatchCampaign` — **console stub** (wire Service Bus → Klaviyo/ACS for prod)
11. `writeAuditComplete` — final audit log entry

### Bedrock Integration

`backend/src/shared/bedrockClient.ts` wraps the AWS Bedrock SDK with:
- 3 retries with 1s/2s exponential backoff on all calls
- Two models: Sonnet 4.5 (reasoning tasks) and Haiku 4.5 (outreach copy)
- All responses parsed with regex JSON extraction — Bedrock returns raw text, not structured JSON

Model IDs:
- `BEDROCK_SONNET_MODEL` = `anthropic.claude-sonnet-4-5-20250929-v1:0`
- `BEDROCK_HAIKU_MODEL` = `anthropic.claude-haiku-4-5-20251001-v1:0`

### Cosmos DB Containers

| Container | Partition Key | Purpose |
|---|---|---|
| `crm_salesforce` | `customerId` | Source data |
| `transactions_shopify` | `customerId` | Source data |
| `loyalty_yotpo` | `customerId` | Source data |
| `email_klaviyo` | `customerId` | Source data |
| `support_zendesk` | `customerId` | Source data |
| `analytics_ga` | `customerId` | Source data |
| `offer_catalog` | `offerId` | 15 pre-defined retention offers |
| `retention_campaigns` | `correlationId` | Campaign records (PENDING/APPROVED/REJECTED/DISPATCHED) |
| `churn_audit_log` | `correlationId` | Append-only audit log (1-year TTL) |

All collectors fall back to mock data for `CUST-000142` if the Cosmos container is empty.

### Approval Flow (cross-service)

The approval endpoint in `httpFunctions.ts` does two things atomically:
1. Pre-updates Cosmos directly so the UI reflects the decision immediately
2. Raises the `ApprovalReceived` external event on the Durable orchestrator instance

This dual-write means the UI never has to wait for the orchestrator to resume and write back.

### Key Specifications

| Aspect | Value |
|---|---|
| Churn score range | 0–100 (0–44=LOW, 45–74=MEDIUM, 75–100=HIGH) |
| Approval timeout | 24 hours (auto-reject) |
| Bedrock max tokens | 4096 |
| Task hub name | `apexchurn` |
| Audit log TTL | 31,536,000 s (1 year) |

---

## Local Dev Setup

### Prerequisites

- Node.js 20
- Azure Functions Core Tools v4 (`npm i -g azure-functions-core-tools@4`)
- Azurite or a real Azure Storage account (for Durable Functions state)
- AWS credentials with Bedrock access in `us-east-1`

### Backend setup

```bash
cd backend
cp local.settings.json.example local.settings.json
# Fill all REPLACE_ME values, especially Cosmos and AWS creds
npm install && npm run build && func start
```

### Frontend setup

```bash
cd ui
cp .env.example .env          # VITE_API_BASE_URL=http://localhost:7071
npm install && npm run dev
```

### Azure CLI

Not installed on this machine. Install with:
```powershell
winget install Microsoft.AzureCLI
```

---

## CI/CD

| Workflow | Trigger | Steps |
|---|---|---|
| `backend.yml` | push `main` (backend/**) or manual | lint → test → build → deploy Function App → smoke `/api/health` |
| `ui.yml` | push `main` (ui/**) or manual | type-check → lint → Vite build → deploy SWA |
| `infra.yml` | push `main` (infra/**) or manual | tf fmt → validate → plan → apply |

All workflows support `workflow_dispatch` with `environment` (dev/staging/prod) and — for infra — `action` (plan/apply/destroy).

### Required GitHub Secrets

`AZURE_CREDENTIALS` (SP JSON) is required by all three workflows.

**infra.yml:** `TF_BACKEND_RESOURCE_GROUP`, `TF_BACKEND_STORAGE_ACCOUNT`, `TF_BACKEND_CONTAINER`

**backend.yml:** `AZURE_RESOURCE_GROUP`, `FUNCTION_APP_NAME`, `COSMOS_DB_CONNECTION_STRING`, `STORAGE_CONNECTION_STRING`, `SERVICEBUS_CONNECTION_STRING`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`

**ui.yml:** `AZURE_STATIC_WEB_APPS_API_TOKEN`, `VITE_API_BASE_URL`
