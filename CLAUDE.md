# CLAUDE.md — Apex Retail AI Multi-Agent Churn Detection POC

## Project Overview

**Project Name:** Apex Retail — AI Multi-Agent Churn Detection POC  
**Purpose:** Detect customer churn risk across 6 isolated data systems and orchestrate a personalized retention campaign with human approval — all in under 2 minutes.  
**Demo Customer:** CUST-000142 (Sarah Mitchell, Gold tier) — used as fallback mock in all collectors.

---

## Architecture Summary

```
React SPA (Vite + Tailwind)
      │
      │ HTTPS / REST
      ▼
Azure Functions (Node 20, TypeScript)
  ├── HTTP API: /api/health, /api/campaigns, /api/trigger, /api/approvals/:id
  └── Durable Orchestrator: 11-step fan-out/fan-in + human approval wait
        │
        ├── 6 Data Collectors (parallel fan-out) → Cosmos DB
        ├── 4 AI Agents → Amazon Bedrock (Claude Sonnet 4.5 + Haiku 4.5)
        └── Persistence → Cosmos DB (retention_campaigns, churn_audit_log)

Infrastructure: Azure (Terraform IaC)
  ├── Cosmos DB Serverless (8 containers)
  ├── Service Bus Standard (churn-detection-jobs queue)
  ├── Key Vault (AWS Bedrock credentials)
  ├── Application Insights (30-day retention)
  ├── Azure Static Web Apps (Free tier)
  └── Function App (Y1 Consumption Plan, Linux, Node 20)
```

---

## Repository Structure

```
project-root/
├── infra/                          # Terraform IaC
│   ├── providers.tf                # azurerm ~3.90, random ~3.6, Terraform >=1.5
│   ├── variables.tf                # resource_prefix, location, environment, aws_region, cosmos_db_name
│   ├── main.tf                     # data source for client config, random suffix
│   ├── resource_group.tf           # rg-apex-churn-poc
│   ├── monitoring.tf               # Log Analytics + Application Insights
│   ├── storage.tf                  # Standard LRS StorageV2 (Functions runtime)
│   ├── cosmos.tf                   # Serverless Cosmos DB SQL (8 containers)
│   ├── service_bus.tf              # Standard SKU namespace + queue
│   ├── event_grid.tf               # Standard Event Grid topic
│   ├── key_vault.tf                # Standard SKU Key Vault (AWS creds + model IDs)
│   ├── static_web_app.tf           # Free tier SWA for React UI
│   ├── communication_services.tf   # Email + general Communication Service
│   ├── functions.tf                # Linux Function App (Y1, Node 20, Managed Identity)
│   ├── outputs.tf                  # 10 outputs (URLs, keys, endpoints)
│   └── terraform.tfvars.example    # Default variable values
│
├── backend/                        # Azure Functions (TypeScript/Node.js)
│   ├── src/
│   │   ├── index.ts                # Entry point — imports all functions for registration
│   │   ├── orchestrator/
│   │   │   └── churnOrchestrator.ts  # 11-step Durable orchestrator
│   │   ├── activities/
│   │   │   ├── collectCrm.ts       # CRM data collector (Cosmos + mock fallback)
│   │   │   ├── collectShopify.ts   # Shopify data collector
│   │   │   ├── collectYotpo.ts     # Loyalty data collector
│   │   │   ├── collectKlaviyo.ts   # Email data collector
│   │   │   ├── collectZendesk.ts   # Support data collector
│   │   │   ├── collectGa.ts        # Analytics data collector
│   │   │   ├── scoreChurn.ts       # Bedrock Sonnet 4.5 — churn scoring agent
│   │   │   ├── matchOffer.ts       # Bedrock Sonnet 4.5 — offer selection agent
│   │   │   ├── generateBrief.ts    # Bedrock Sonnet 4.5 — CSM brief agent
│   │   │   ├── draftOutreach.ts    # Bedrock Haiku 4.5 — 3-channel copy agent
│   │   │   ├── writePendingRecord.ts  # Cosmos upsert (PENDING status)
│   │   │   ├── notifyCrmManager.ts    # Notification stub (console log)
│   │   │   ├── dispatchCampaign.ts    # Dispatch stub (console log)
│   │   │   └── writeAuditComplete.ts  # Final audit log entry
│   │   ├── functions/
│   │   │   └── httpFunctions.ts    # 4 HTTP routes (health, campaigns, trigger, approvals)
│   │   └── shared/
│   │       ├── config.ts           # Centralized env var config
│   │       ├── models.ts           # All TypeScript interfaces (Campaign, ChurnScore, etc.)
│   │       ├── cosmosClient.ts     # Lazy CosmosClient singleton
│   │       ├── bedrockClient.ts    # AWS Bedrock SDK wrapper
│   │       └── auditLogger.ts      # Structured audit logging to Cosmos
│   ├── host.json                   # Task hub: apexchurn, App Insights sampling
│   ├── package.json                # apex-churn-backend, Node 20, Jest
│   ├── tsconfig.json               # ES2020, strict, decorators
│   ├── local.settings.json.example # All env vars with REPLACE_ME placeholders
│   └── .funcignore
│
├── ui/                             # React SPA (Vite + Tailwind)
│   ├── src/
│   │   ├── App.tsx                 # Router + Navbar (3 routes)
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx   # Campaign list, stats, TriggerModal
│   │   │   ├── ReviewPage.tsx      # Full review layout (brief, signals, offer, outreach, approve)
│   │   │   └── ConfirmationPage.tsx # Post-approval confirmation
│   │   ├── components/
│   │   │   ├── CustomerCard.tsx    # Name, tier badge, ID, status
│   │   │   ├── ChurnScoreGauge.tsx # Animated circular gauge 0-100
│   │   │   ├── SignalTable.tsx     # 6-row signal health table (red/amber/green)
│   │   │   ├── RetentionBrief.tsx  # Markdown brief + keySignals list
│   │   │   ├── OfferCard.tsx       # Headline, terms, rationale, override dropdown
│   │   │   ├── OutreachTabs.tsx    # Email/SMS/Push preview tabs (editable)
│   │   │   ├── ActionBar.tsx       # Sticky approve/reject/escalate bar
│   │   │   └── AuditTimeline.tsx   # Vertical orchestration step timeline
│   │   ├── api/
│   │   │   └── client.ts           # Axios client (getCampaigns, triggerChurnDetection, submitApproval)
│   │   └── types/
│   │       └── index.ts            # TypeScript interfaces (Campaign, RetentionOffer, etc.)
│   ├── vite.config.ts              # Port 3000, proxy /api → localhost:7071
│   ├── tailwind.config.js
│   ├── staticwebapp.config.json    # Azure SWA routing
│   ├── index.html
│   └── .env.example                # VITE_API_BASE_URL=http://localhost:7071
│
├── .github/workflows/
│   ├── backend.yml                 # Build + deploy Azure Functions
│   ├── ui.yml                      # Build + deploy Static Web App
│   └── infra.yml                   # Terraform plan/apply/destroy
│
├── check_bedrock.py                # Bedrock connectivity test script
├── IMPLEMENTATION_PLAN.md          # 633-line detailed architecture guide
└── CLAUDE.md                       # This file
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **AI Models** | Amazon Bedrock — Claude Sonnet 4.5 (scoring/offer/brief), Claude Haiku 4.5 (outreach copy) |
| **Orchestration** | Azure Durable Functions v3 (fan-out/fan-in + external event wait) |
| **Backend Runtime** | Azure Functions v4, Node 20, TypeScript |
| **Database** | Azure Cosmos DB Serverless (SQL API) |
| **Messaging** | Azure Service Bus Standard |
| **Secrets** | Azure Key Vault (Standard SKU) |
| **Observability** | Azure Application Insights + Log Analytics |
| **Frontend** | React 18, Vite 5, Tailwind CSS 3, React Router v6 |
| **Hosting (UI)** | Azure Static Web Apps (Free tier) |
| **IaC** | Terraform 1.7.5 (azurerm ~3.90) |
| **CI/CD** | GitHub Actions (3 workflows) |

---

## Cosmos DB Containers (8)

| Container | Partition Key | Purpose |
|---|---|---|
| `crm_salesforce` | `customerId` | CRM source data |
| `transactions_shopify` | `customerId` | Transaction source data |
| `loyalty_yotpo` | `customerId` | Loyalty source data |
| `email_klaviyo` | `customerId` | Email source data |
| `support_zendesk` | `customerId` | Support source data |
| `analytics_ga` | `customerId` | Analytics source data |
| `offer_catalog` | `offerId` | 15 pre-defined retention offers |
| `churn_audit_log` | `correlationId` | Append-only audit log (1-year TTL) |
| `retention_campaigns` | `correlationId` | Campaign records (PENDING/APPROVED/REJECTED/DISPATCHED) |

---

## Orchestration Flow (11 Steps)

```
Step 1:  Fan-out — 6 data collectors run in parallel (Task.all)
Step 2:  Assemble CustomerDataPackage from 6 source results
Step 3:  scoreChurn — Bedrock Sonnet 4.5 → ChurnScore (0-100, riskTier, citations)
Step 4:  matchOffer — Bedrock Sonnet 4.5 → RetentionOffer from catalog
Step 5:  generateBrief — Bedrock Sonnet 4.5 → RetentionBrief (markdown for CSM)
Step 6:  draftOutreach — Bedrock Haiku 4.5 → OutreachDraft (email/SMS/push)
Step 7:  writePendingRecord — Cosmos upsert with approvalStatus=PENDING
Step 8:  notifyCrmManager — stub (prints approval URL, wire up ACS for real)
Step 9:  Wait for ApprovalReceived event — 24h timeout (auto-reject on expiry)
Step 10: dispatchCampaign (if approved) — updates Cosmos, prints dispatch details
Step 11: writeAuditComplete — final audit log entry
```

---

## HTTP API Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/health` | Health check → `{status: "ok", timestamp}` |
| `GET` | `/api/campaigns` | List all campaigns (DESC by createdAt) |
| `GET` | `/api/campaigns/:correlationId` | Fetch single campaign |
| `POST` | `/api/trigger` | Start churn detection `{customerId}` → 202 with correlationId |
| `POST` | `/api/approvals/:correlationId` | Submit decision `{decision, approverId, notes?}` |

All endpoints have CORS `*` (POC only — restrict in production).

---

## GitHub Secrets Required

### All Workflows
| Secret | Description |
|---|---|
| `AZURE_CREDENTIALS` | Service Principal JSON (`az ad sp create-for-rbac --sdk-auth`) |

### infra.yml (Terraform Backend)
| Secret | Description |
|---|---|
| `TF_BACKEND_RESOURCE_GROUP` | RG containing Terraform state storage account |
| `TF_BACKEND_STORAGE_ACCOUNT` | Storage account name for `.tfstate` files |
| `TF_BACKEND_CONTAINER` | Blob container name (e.g. `tfstate`) |

### backend.yml (Function App)
| Secret | Description |
|---|---|
| `AZURE_RESOURCE_GROUP` | RG where Function App is deployed |
| `FUNCTION_APP_NAME` | Function App name (default: `apex-churn-func`) |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint URL |
| `AZURE_OPENAI_DEPLOYMENT` | Azure OpenAI deployment/model name |
| `COSMOS_DB_CONNECTION_STRING` | From Cosmos DB → Keys |
| `STORAGE_CONNECTION_STRING` | From Storage Account → Access keys |
| `SERVICEBUS_CONNECTION_STRING` | From Service Bus → Shared access policies |

### ui.yml (Static Web App)
| Secret | Description |
|---|---|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | From SWA → Manage deployment token |
| `VITE_API_BASE_URL` | Backend API base URL |

---

## Local Development Setup

### Prerequisites
- Node.js 20
- Azure Functions Core Tools v4
- Azure CLI (`az`)
- Azurite (local storage emulator) or a real Azure storage account
- AWS credentials with Bedrock access

### Backend
```bash
cd backend
cp local.settings.json.example local.settings.json
# Fill in all REPLACE_ME values in local.settings.json
npm install
npm run build
func start
# Runs on http://localhost:7071
```

### Frontend
```bash
cd ui
cp .env.example .env
# VITE_API_BASE_URL=http://localhost:7071 (default)
npm install
npm run dev
# Runs on http://localhost:3000
```

### Infrastructure (Terraform)
```bash
cd infra
cp terraform.tfvars.example terraform.tfvars
# Fill in values
terraform init \
  -backend-config="resource_group_name=<RG>" \
  -backend-config="storage_account_name=<SA>" \
  -backend-config="container_name=tfstate" \
  -backend-config="key=apex-churn/dev.tfstate"
terraform plan -var="environment=dev"
terraform apply -var="environment=dev"
```

---

## Environment Variables (Backend)

All set in `backend/local.settings.json` locally; injected as Function App settings in CI/CD.

| Variable | Value / Source |
|---|---|
| `AzureWebJobsStorage` | `UseDevelopmentStorage=true` (local) or storage connection string |
| `FUNCTIONS_WORKER_RUNTIME` | `node` |
| `WEBSITE_NODE_DEFAULT_VERSION` | `~20` |
| `COSMOS_DB_ENDPOINT` | Cosmos DB URI |
| `COSMOS_DB_KEY` | Cosmos DB primary key |
| `AWS_ACCESS_KEY_ID` | AWS IAM key with Bedrock access |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret |
| `AWS_REGION` | `us-east-1` |
| `BEDROCK_SONNET_MODEL` | `anthropic.claude-sonnet-4-5-20250929-v1:0` |
| `BEDROCK_HAIKU_MODEL` | `anthropic.claude-haiku-4-5-20251001-v1:0` |
| `SERVICE_BUS_CONNECTION_STRING` | Service Bus shared access connection string |
| `COMMUNICATION_SERVICES_CONNECTION_STRING` | Azure Communication Services |
| `APPROVAL_BASE_URL` | React UI base URL (for approval deep links) |

---

## Key Design Patterns

1. **Fan-Out/Fan-In** — 6 collectors run in parallel via `Task.all`, merged into `CustomerDataPackage`
2. **External Event Wait** — Orchestrator waits up to 24h for `ApprovalReceived` event; auto-rejects on timeout
3. **Retry with Exponential Backoff** — 3 attempts (1s, 2s delays) on all Bedrock calls
4. **Idempotent Upserts** — Cosmos documents keyed by `correlationId`; safe to replay
5. **Fallback Patterns** — All collectors return mock data for CUST-000142 if Cosmos is empty
6. **JSON Extraction from LLM** — Regex-based JSON parsing from Bedrock response + validation before use
7. **Managed Identity** — Function App uses system-assigned identity for Cosmos (no keys in code)
8. **Key Vault References** — App settings use `@Microsoft.KeyVault(SecretUri=...)` syntax
9. **Stub Integrations** — `notifyCrmManager` and `dispatchCampaign` are console stubs (wire up ACS/Klaviyo for prod)

---

## Key Specifications

| Aspect | Value |
|---|---|
| Target end-to-end latency | < 2 minutes |
| Bedrock max tokens per call | 4096 |
| Orchestration approval timeout | 24 hours |
| Churn score range | 0–100 (0–44=LOW, 45–74=MEDIUM, 75–100=HIGH) |
| Offer catalog size | 15 pre-defined offers |
| Audit log TTL | 1 year (31,536,000 seconds) |
| App Insights retention | 30 days |
| Service Bus lock duration | 5 minutes, max delivery count: 10 |
| Backend local port | 7071 |
| Frontend local port | 3000 |
| Durable task hub name | `apexchurn` |
| Demo customer | CUST-000142 (Sarah Mitchell, Gold, mock churn signals) |

---

## Bedrock Models

| Model | Use Case | Model ID |
|---|---|---|
| Claude Sonnet 4.5 | Churn scoring, offer matching, CSM brief generation | `anthropic.claude-sonnet-4-5-20250929-v1:0` |
| Claude Haiku 4.5 | 3-channel outreach copy (email/SMS/push) | `anthropic.claude-haiku-4-5-20251001-v1:0` |

Sonnet 4.5 used for complex reasoning tasks; Haiku 4.5 used where speed and cost matter more than depth.

---

## Data Flow

```
POST /api/trigger {customerId}
  → Durable orchestrator starts
  → Fan-out: 6 Cosmos queries (parallel)
  → Assemble CustomerDataPackage
  → Bedrock Sonnet: ChurnScore (score, riskTier, citations, reasoning)
  → Bedrock Sonnet: RetentionOffer (from 15-item catalog in Cosmos)
  → Bedrock Sonnet: RetentionBrief (markdown for CSM, 300-500 words)
  → Bedrock Haiku: OutreachDraft (email HTML, SMS ≤160 chars, push ≤60/120 chars)
  → Cosmos upsert: retention_campaigns (status=PENDING)
  → Notify CRM manager (stub — prints approval URL)
  → WAIT (up to 24h) for ApprovalReceived external event

POST /api/approvals/:correlationId {decision, approverId, notes}
  → Raises ApprovalReceived event on orchestrator
  → Pre-updates Cosmos so UI reflects decision immediately
  → Orchestrator resumes:
      if approved → dispatchCampaign (stub) → writeAuditComplete
      if timeout/rejected → mark REJECTED → writeAuditComplete
```

---

## UI Routes

| Route | Component | Purpose |
|---|---|---|
| `/` | `DashboardPage` | Campaign list, stats cards, trigger new campaign |
| `/review/:correlationId` | `ReviewPage` | Full campaign review (brief, signals, offer, outreach, approve) |
| `/confirmed/:correlationId` | `ConfirmationPage` | Post-approval confirmation screen |

---

## Stub Integrations (Wire Up for Production)

| Stub | File | Real Integration |
|---|---|---|
| CRM Manager Notification | `notifyCrmManager.ts` | Azure Communication Services (email/SMS) |
| Campaign Dispatch | `dispatchCampaign.ts` | Azure Service Bus → Klaviyo API, ACS, mobile push provider |
| Offer Catalog | All collectors | Fully populated `offer_catalog` Cosmos container |
| Data Sources | All collectors | Real CRM/Shopify/Yotpo/Klaviyo/Zendesk/GA API calls |

---

## Azure CLI — Not Installed

Azure CLI (`az`) is not installed on the development machine. Install with:
```powershell
winget install Microsoft.AzureCLI
```
After install, restart terminal and run `az login`.

---

## CI/CD Workflows

| Workflow | Trigger | What It Does |
|---|---|---|
| `backend.yml` | Push to `main` (backend/**) or manual | Lint → test → build → zip → deploy Function App → smoke test `/api/health` |
| `ui.yml` | Push to `main` (ui/**) or manual | Type check → lint → Vite build → deploy SWA → Lighthouse CI (optional) |
| `infra.yml` | Push to `main` (infra/**) or manual | Terraform init → fmt → validate → plan → apply (on main push or manual apply) |

All workflows support `workflow_dispatch` with `environment` (dev/staging/prod) and `action` (plan/apply/destroy for infra) inputs.
