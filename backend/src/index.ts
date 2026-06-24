/**
 * Apex Retail Churn Detection — Azure Functions Entry Point
 *
 * Importing each module here causes the Azure Functions v4 runtime to register
 * all function handlers (HTTP, orchestrator, activities) at startup.
 */

// Durable orchestrator
import './orchestrator/churnOrchestrator';

// Data collection activities (fan-out)
import './activities/collectCrm';
import './activities/collectShopify';
import './activities/collectYotpo';
import './activities/collectKlaviyo';
import './activities/collectZendesk';
import './activities/collectGa';

// AI agent activities (sequential pipeline)
import './activities/scoreChurn';
import './activities/matchOffer';
import './activities/generateBrief';
import './activities/draftOutreach';

// Persistence & notification activities
import './activities/writePendingRecord';
import './activities/notifyCrmManager';
import './activities/dispatchCampaign';
import './activities/writeAuditComplete';

// HTTP-triggered functions (API surface)
import './functions/httpFunctions';
