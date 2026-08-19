# Apex Retail — AI Multi-Agent Churn Detection POC

An end-to-end proof-of-concept that detects customer churn risk across 6 isolated data systems, orchestrates a personalised retention campaign using Claude AI on AWS Bedrock, and gates campaign dispatch behind a human approval step — targeting completion in under 2 minutes.

**Demo customer:** `CUST-000142` — Sarah Mitchell, Gold tier (used as mock fallback across all data collectors when Cosmos containers are empty).

---

## Project Context

### Business Problem
- Retail businesses lose high-value customers silently — churn signals are scattered across CRM, e-commerce, loyalty, email, support, and analytics platforms with no unified view
- Manual analysis of 6 disconnected systems is too slow and inconsistent to act on at scale
- Retention campaigns often reach customers too late, or with generic offers that fail to convert

### What This POC Demonstrates
- **AI-powered churn detection** — Claude Sonnet 4.5 analyses signals from 6 data sources and produces a scored risk assessment (0–100) with cited evidence
- **Automated offer matching** — AI selects the most relevant retention offer from a 15-item catalog based on the customer's risk profile and behaviour
- **Personalised outreach generation** — Claude Haiku 4.5 drafts email, SMS, and push notification copy tailored to the individual customer
- **Human-in-the-loop governance** — a CSM reviews the AI's full reasoning before any campaign is dispatched; auto-rejects after 24 hours if no action is taken
- **End-to-end audit trail** — every step is logged to an append-only audit log with a 1-year retention period

### Technical Approach
- **Multi-agent orchestration** via Azure Durable Functions — fan-out data collection runs 6 collectors in parallel, then a sequential AI pipeline processes results
- **AWS Bedrock** hosts the Claude models; credentials are stored in Azure Key Vault and accessed via managed identity — no secrets in code
- **Dual-write approval pattern** — the approval API updates Cosmos directly AND raises a Durable Functions external event, so the UI reflects the decision instantly without polling
- **Mock-first development** — all 6 data collectors fall back to realistic mock data for `CUST-000142`, enabling full end-to-end demos without live data

### Key Constraints & Design Decisions
- Target latency: **under 2 minutes** from trigger to pending approval record written
- Bedrock calls use **3 retries with exponential backoff** (1 s / 2 s) to handle transient throttling
- Outreach copy enforces **hard character limits** at generation time (SMS ≤160, push headline ≤60, push body ≤120)
- Campaign dispatch (`notifyCrmManager`, `dispatchCampaign`) are **console stubs** — intentionally left unwired for the POC to avoid accidental sends
- Every Azure Function must be **explicitly imported in `index.ts`** — the runtime will silently skip any unregistered function

### Stack at a Glance
- **Frontend:** React 18 + Vite + Tailwind CSS, hosted on Azure Static Web Apps
- **Backend:** Azure Functions v4, Node 20, TypeScript, Durable Functions
- **AI:** AWS Bedrock — Claude Sonnet 4.5 (reasoning) + Claude Haiku 4.5 (copy generation)
- **Data:** Azure Cosmos DB Serverless — 9 containers across source data, campaigns, and audit log
- **Infrastructure:** Terraform on Azure (Consumption plan, Key Vault, Service Bus, ACS)

---

## Architecture Overview

```
React SPA (Vite + Tailwind, port 3000)
      │ REST/HTTPS
      ▼
Azure Functions v4 (Node 20 TypeScript, port 7071)
  ├── HTTP API  →  backend/src/functions/httpFunctions.ts
  └── Durable Orchestrator  →  backend/src/orchestrator/churnOrchestrator.ts
        ├── Fan-out: 6 data collectors (parallel Task.all)
        ├── 4 Bedrock AI agents (sequential pipeline)
        └── External event wait: human approval (24 h timeout)

Persistence:  Azure Cosmos DB Serverless (9 containers)
Secrets:      Azure Key Vault (AWS Bedrock credentials)
Messaging:    Azure Service Bus (campaign dispatch stub)
```

### Orchestration Flow (11 Steps)

| Step | Activity | Model | Output |
|------|----------|-------|--------|
| 1 | Fan-out — 6 data collectors in parallel | — | `CustomerDataPackage` |
| 2 | Assemble package | — | — |
| 3 | `scoreChurn` | Claude Sonnet 4.5 | `ChurnScore` (0–100, riskTier, citations) |
| 4 | `matchOffer` | Claude Sonnet 4.5 | `RetentionOffer` (from 15-item catalog) |
| 5 | `generateBrief` | Claude Sonnet 4.5 | Markdown brief for CSM (300–500 words) |
| 6 | `draftOutreach` | Claude Haiku 4.5 | Email HTML + SMS (≤160 chars) + Push (≤60/120 chars) |
| 7 | `writePendingRecord` | — | Cosmos upsert (`approvalStatus=PENDING`) |
| 8 | `notifyCrmManager` | — | Console stub (wire ACS for prod) |
| 9 | **Wait** up to 24 h for `ApprovalReceived` external event | — | Auto-rejects on timeout |
| 10 | `dispatchCampaign` | — | Console stub (wire Service Bus → Klaviyo/ACS for prod) |
| 11 | `writeAuditComplete` | — | Final audit log entry |

---

## Repository Layout

```
case-study-retail-poc/
├── backend/          # Azure Functions (TypeScript, Node 20)
├── ui/               # React SPA (Vite + Tailwind CSS)
├── infra/            # Terraform IaC (Azure)
└── .github/
    └── workflows/    # CI/CD: backend.yml, ui.yml, infra.yml
```

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20 | Backend & frontend |
| Azure Functions Core Tools | v4 | Local function runtime |
| Azurite (or real Azure Storage) | latest | Durable Functions state |
| AWS credentials | — | Bedrock access in `us-east-1` |
| Terraform | 1.7.5+ | Infrastructure provisioning |
| Azure CLI | latest | Deployment (`winget install Microsoft.AzureCLI`) |

---

## Local Development

### Backend (Azure Functions)

```bash
cd backend
cp local.settings.json.example local.settings.json
# Fill all REPLACE_ME values — Cosmos endpoint/key and AWS credentials are required
npm install
npm run build   # tsc → dist/
npm start       # builds then runs func start on port 7071
```

**Required env vars** (set in `local.settings.json`):

| Variable | Description |
|----------|-------------|
| `AzureWebJobsStorage` | `UseDevelopmentStorage=true` for Azurite |
| `COSMOS_DB_ENDPOINT` | Cosmos DB account endpoint |
| `COSMOS_DB_KEY` | Cosmos DB primary key |
| `AWS_ACCESS_KEY_ID` | AWS key with Bedrock access |
| `AWS_SECRET_ACCESS_KEY` | AWS secret |
| `AWS_REGION` | Default: `us-east-1` |
| `BEDROCK_SONNET_MODEL` | Default: `anthropic.claude-sonnet-4-5-20250929-v1:0` |
| `BEDROCK_HAIKU_MODEL` | Default: `anthropic.claude-haiku-4-5-20251001-v1:0` |
| `SERVICE_BUS_CONNECTION_STRING` | Azure Service Bus (stubbed locally) |
| `COMMUNICATION_SERVICES_CONNECTION_STRING` | ACS (stubbed locally) |
| `APPROVAL_BASE_URL` | Default: `http://localhost:4280` |

```bash
# Run tests
npm test
npm test -- --testNamePattern="<pattern>"
npm test -- <path/to/test.ts>
```

> **Important:** Every new function must be imported in [backend/src/index.ts](backend/src/index.ts). That file is the sole entry point that registers all activities, orchestrators, and HTTP triggers with the Azure Functions runtime. A file not imported there will never run.

### Frontend (React/Vite)

```bash
cd ui
cp .env.example .env    # sets VITE_API_BASE_URL=http://localhost:7071
npm install
npm run dev             # Vite dev server on port 3000, proxies /api → localhost:7071
```

---

## HTTP API Reference

All endpoints are `authLevel: anonymous` with CORS `*`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Liveness check — returns `{status:'ok', timestamp}` |
| `GET` | `/api/campaigns` | List all campaigns (lightweight — id, score, status, timestamps) |
| `GET` | `/api/campaigns/:correlationId` | Full campaign document |
| `POST` | `/api/trigger` | Start churn detection. Body: `{customerId}`. Returns 202 with `correlationId` |
| `POST` | `/api/approvals/:correlationId` | Submit approval. Body: `{decision, approverId, notes?}`. Dual-writes to Cosmos and raises `ApprovalReceived` Durable event |

### Approval Dual-Write

The approval endpoint pre-updates Cosmos directly so the UI reflects the decision immediately, then raises the `ApprovalReceived` external event on the Durable orchestrator. This means the UI never has to wait for the orchestrator to resume and write back.

---

## Key Domain Types

```typescript
// Churn score from AI analysis
interface ChurnScore {
  score: number;           // 0–100 (0–44=LOW, 45–74=MEDIUM, 75–100=HIGH)
  riskTier: 'HIGH' | 'MEDIUM' | 'LOW';
  citations: SignalCitation[];
  reasoning: string;
}

// Campaign lifecycle
type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DISPATCHED';

// Outreach content generated by Haiku
interface OutreachDraft {
  emailSubject: string;
  emailHtml: string;
  smsText: string;        // ≤ 160 chars
  pushHeadline: string;   // ≤ 60 chars
  pushBody: string;       // ≤ 120 chars
}
```

---

## Cosmos DB Containers

| Container | Partition Key | Purpose |
|-----------|---------------|---------|
| `crm_salesforce` | `customerId` | CRM source data |
| `transactions_shopify` | `customerId` | Transaction source data |
| `loyalty_yotpo` | `customerId` | Loyalty source data |
| `email_klaviyo` | `customerId` | Email engagement source data |
| `support_zendesk` | `customerId` | Support ticket source data |
| `analytics_ga` | `customerId` | Web analytics source data |
| `offer_catalog` | `offerId` | 15 pre-defined retention offers |
| `retention_campaigns` | `correlationId` | Campaign records |
| `churn_audit_log` | `correlationId` | Append-only audit log (1-year TTL) |

All 6 data collectors fall back to mock data for `CUST-000142` if their container is empty.

---

## Bedrock Integration

[backend/src/shared/bedrockClient.ts](backend/src/shared/bedrockClient.ts) wraps the AWS Bedrock SDK with:

- 3 retries with 1 s / 2 s exponential backoff on every call
- `invokeModel` — returns raw text string
- `invokeModelJson<T>` — regex-extracts the first `{...}` JSON block and parses as `T`
- Max tokens: 4096 per call

---

## Infrastructure (Terraform)

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

**Provisioned resources:**

| Resource | Notes |
|----------|-------|
| Resource Group | `rg-apex-churn-poc` |
| Cosmos DB (Serverless) | 9 containers, BoundedStaleness |
| Azure Functions (Consumption) | Linux, Node 20, SystemAssigned identity |
| Azure Storage | Durable Functions state |
| Key Vault (Standard) | Stores 5 AWS/Bedrock secrets; function app has Get/List access via managed identity |
| Service Bus (Standard) | Queue `churn-detection-jobs` |
| Static Web App (Free) | React SPA hosting |
| Log Analytics + App Insights | 30-day retention |
| Azure Communication Services | Email + SMS stub |

---

## CI/CD

All workflows support `workflow_dispatch` with an `environment` input (dev / staging / prod).

| Workflow | Trigger | Steps |
|----------|---------|-------|
| [backend.yml](.github/workflows/backend.yml) | Push to `main` (backend/**) | lint → test → build → deploy Function App → smoke `/api/health` |
| [ui.yml](.github/workflows/ui.yml) | Push to `main` (ui/**) | type-check → lint → Vite build → deploy Static Web App |
| [infra.yml](.github/workflows/infra.yml) | Push to `main` (infra/**) | tf fmt → validate → plan → apply |

### Required GitHub Secrets

**All workflows:** `AZURE_CREDENTIALS` (service principal JSON)

**backend.yml:** `AZURE_RESOURCE_GROUP`, `FUNCTION_APP_NAME`, `COSMOS_DB_CONNECTION_STRING`, `STORAGE_CONNECTION_STRING`, `SERVICEBUS_CONNECTION_STRING`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`

**ui.yml:** `AZURE_STATIC_WEB_APPS_API_TOKEN`, `VITE_API_BASE_URL`

**infra.yml:** `TF_BACKEND_RESOURCE_GROUP`, `TF_BACKEND_STORAGE_ACCOUNT`, `TF_BACKEND_CONTAINER`

---

## Production Stubs (Not Yet Wired)

Two activities are currently console stubs that log their payload instead of dispatching:

- **`notifyCrmManager`** (Step 8) — wire to Azure Communication Services to email/SMS the CSM
- **`dispatchCampaign`** (Step 10) — wire to Azure Service Bus → Klaviyo / ACS for actual outreach delivery

---

## Key Specifications

| Aspect | Value |
|--------|-------|
| Churn score range | 0–100 |
| Risk tiers | 0–44 LOW · 45–74 MEDIUM · 75–100 HIGH |
| Approval timeout | 24 hours (auto-reject) |
| Bedrock max tokens | 4096 |
| Task hub name | `apexchurn` |
| Audit log TTL | 31,536,000 s (1 year) |
| Bedrock region | `us-east-1` |
