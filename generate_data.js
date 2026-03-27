const fs = require('fs');

const today = new Date();
const addDays = (days) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
};

const gId = (prefix) => prefix + '_' + Math.random().toString(36).substr(2, 9);

const proj_assetosx = "proj_assetosx";
const proj_jarvis = "proj_jarvis_sys";
const proj_openclaw = "proj_openclaw";
const proj_cortana = "proj_cortana";
const proj_medellin = "proj_medellin";

const projects = [
    {
        id: proj_assetosx,
        title: "AssetOSX",
        description: "Enterprise media logistics platform handling multi-stage workflows, approvals, permissions, and billing."
    },
    {
        id: proj_jarvis,
        title: "Jarvis",
        description: "AI command center, agents, memory system, and execution dashboard with internal Mission Control UI."
    },
    {
        id: proj_openclaw,
        title: "OpenClaw Integration",
        description: "LLM routing, budget enforcement, rate limiting, and provider abstraction."
    },
    {
        id: proj_cortana,
        title: "Cortana AI",
        description: "User-facing AI product layer with assistant interface, workflow automation, and user memory."
    },
    {
        id: proj_medellin,
        title: "Medellin Social Club",
        description: "Premium membership platform with onboarding, membership tiers, events, and admin tools in the main app."
    }
];

const objectivesRaw = [
    // --- AssetOSX ---
    {
        id: "obj_ast_1", project_id: proj_assetosx, title: "Deploy Multi-Stage Workflows & Media Gating", description: "Design and deploy the core state machine mapping media assets from physical on-site handling to post-production and final delivery.", priority: "high", target_date: addDays(30), tasks: [
            "Architect media state machine DB schema|Design states (ingest, raw, proxy, review, approved, delivered) and audit logs for transitions.|Draft Prisma schema,Build state transition service,Write unit tests for invalid transitions,Create DB migrations",
            "Implement high-throughput presigned URL ingestion|Create the ingestion API that generates S3 presigned URLs for raw multi-gigabyte files.|Setup S3 CORS,Implement presign API,Implement progress tracking webhook,Optimize chunk sizes",
            "Establish proxy generation queue worker|Build an EventBridge + Lambda pipeline to automatically generate 720p proxies from raw 4K footage.|Write Lambda handler,Configure FFmpeg layer,Setup SQS queue for failures,Update DB on completion",
            "Develop Media Gating access control middleware|Create permissions middleware that blocks unapproved clients from accessing raw bucket URLs.|Write auth middleware,Map roles to asset states,Write JWT validation,Test unauthorized access blocks",
            "Implement multi-file batch approval endpoints|Create atomic endpoints for clients/reviewers to approve, reject, or request changes on a batch of files.|Define API payload,Handle transaction rollback,Trigger email notifications,Update asset states via batch",
            "Build robust file versioning logic|Allow editors to upload specific revisions of a file without overwriting the master file history.|Update schema for asset_versions,Write version increment logic,Implement rollback endpoint,Map versions to UI preview",
            "Create watermarking proxy service|Automatically burn in timecodes and client names into proxy clips for secure review gating.|Integrate FFmpeg watermark filter,Dynamically render overlay text,Handle encoding artifacts,Store watermarked asset safely",
            "Develop on-site media offload validation|Build a utility/API for on-site technicians to verify checksums (MD5) before marking offload complete.|Implement checksum generation schema,Write client verification logic,Log offload metadata,Trigger ingest start event",
            "Build external client share-link generator|Implement securely hashed, time-expiring share links for unauthenticated reviewers.|Create ShareLink table,Implement AES encryption for link parameters,Write token validation middleware,Build read-only UI handler",
            "Implement CDN edge caching for proxies|Configure CloudFront to aggressively cache review proxies to reduce latency for global clients.|Setup CloudFront distribution,Map S3 origin with OAI,Configure cache invalidation triggers,Test edge latency"
        ]
    },
    {
        id: "obj_ast_2", project_id: proj_assetosx, title: "Restructure Org Hierarchy & Dynamic Approvals", description: "Build nested organizational models allowing complex client hierarchies (parent corp, agencies, teams) and mapped approval rights.", priority: "medium", target_date: addDays(45), tasks: [
            "Design nested organization DB schema|Move from flat tenant model to hierarchical structural tables (Organization, Department, Team).|Add parent_org_id to schema,Write recursive CTE queries for ancestry,Handle circular loops,Migrate existing tenant data",
            "Develop RBAC matrix mapping|Define standard roles (Admin, Manager, Creative, Viewer) across organizational scopes.|Create Role table,Map permissions enum,Write validation service,Audit existing assignments",
            "Implement dynamic approval workflows|Allow organizations to define custom multi-step approval pipelines (e.g. Legal -> Brand -> Final).|Design Workflow schema,Create step runner engine,Implement parallel vs sequential logic,Write approval webhook",
            "Build custom client dashboard scopes|Ensure clients only see assets assigned to their specific nodes in the organizational tree.|Refactor asset listing API,Apply RLS (Row Level Security) via Prisma,Write scope injection middleware,Test cross-tenant leaks",
            "Implement cross-org sharing mechanisms|Allow a parent corp to securely delegate specific asset visibility down to an external agency.|Create OrgShare schema,Write delegation verification,Prevent transitive sharing bugs,Audit log all share events",
            "Create organizational onboarding workflows|Automate the process for a new client adopting the system, including default role generation.|Build Org seed script,Trigger welcome emails,Setup default project folders,Assign initial limits",
            "Build team membership invitation system|Develop email + token based invites with specific role assignments tied to a sub-department.|Create TeamInvite table,Write SendGrid integration,Handle token expiration,Implement accept/reject logic",
            "Develop audit trail reporting API|Expose endpoints for enterprise clients to download CSVs of all user actions (views, downloads, approvals).|Create AuditLog table context,Write async CSV generator,Secure download endpoint,Setup data retention cron",
            "Implement automated NDA gatekeeping|Require new members in specific organizational units to accept a digital NDA before accessing the hierarchy.|Build NDA state flag,Create interceptor middleware,Record timestamps and IP,Store PDF snapshot of terms",
            "Migrate legacy user roles to new hierarchy|Write standard operating procedures and migration scripts to port current users without data loss.|Write dry-run script,Map old roles to new matrix,Handle orphaned users,Execute production migration"
        ]
    },
    {
        id: "obj_ast_3", project_id: proj_assetosx, title: "Integrate Stripe Billing & Technician Payouts", description: "Implement end-to-end financial workflows mapping client SaaS billing to automated contractor/technician payouts.", priority: "high", target_date: addDays(60), tasks: [
            "Implement Stripe Connect for technicians|Setup custom Stripe Connect onboarding flows to allow technicians to receive payouts directly.|Configure Connect webhooks,Write onboarding URL generator,Handle account status verification,Store Stripe Account IDs",
            "Build metered storage billing logic|Calculate daily bucket sizes per client and report to Stripe usage-based billing endpoints.|Write S3 size aggregator script,Map to Stripe Price IDs,Implement cron reporter,Handle usage discrepancies",
            "Develop project-based invoicing system|Allow admins to trigger manual line-item invoices for on-site productions inside the app.|Generate invoice via Stripe API,Map to internal Project entity,Sync payment success webhook,Handle partial payments",
            "Implement automated contractor ledger|When a project completes, calculate technician splits and queue payouts on the internal ledger.|Design LedgerEntry schema,Calculate net vs gross,Write queue worker,Handle currency conversions",
            "Create manual payout override controls|Give admins a UI back-office endpoint to hold, reverse, or boost a technician's payout before execution.|Build pause payout API,Write adjustment log,Recalculate ledger balances,Issue updated receipt",
            "Sync Stripe subscription statuses|Listen to subscription updated/deleted webhooks and automatically restrict or downgrade orgs.|Register webhook endpoints,Map status to Org active flag,Trigger grace period logic,Email downgrade warnings",
            "Implement tax documentation collection|Use Stripe or internal forms to ensure W9s/1099s are collected before payouts exceed threshold.|Track YTD earnings per tech,Block payouts over $600 without tax info,Integrate Stripe Tax,Generate annual summary",
            "Develop client billing dashboard API|Aggregate current cycle usage, past invoices, and active subscriptions for the client portal.|Fetch Stripe Invoice history,Calculate upcoming prorations,Format PDF download links,Expose as GraphQL/REST",
            "Build cost-margin reporting engine|Compare incoming client invoice payments against outgoing technician payouts to evaluate project margins.|Write aggregation query,Group by date/project,Calculate percentage yield,Expose charting data",
            "Implement failed payment dunning logic|Create a systematic workflow for retrying failed invoices and gradually restricting platform access.|Set retry schedules,Lock user write access,Lock download access,Trigger warning banners"
        ]
    },
    {
        id: "obj_ast_4", project_id: proj_assetosx, title: "Establish Technician Lifecycle & Permissions", description: "End-to-end management of on-site technicians, from vetting and equipment assignment to rating and offboarding.", priority: "medium", target_date: addDays(75), tasks: [
            "Design Technician profile database schema|Store skills, certifications, equipment lists, and geographic availability.|Create TechProfile table,Map nested equipment JSON,Write GeoJSON location fields,Link to Base User ID",
            "Build equipment manifest module|Allow techs to register specific gear (cameras, lenses) making them searchable for specific project needs.|Write CRUD for gear,Implement search filters for gear,Validate serialization formats,Sync with payout tiers",
            "Implement geography-based assignment routing|Create an API to pull available technicians within a 50-mile radius of a new production location.|Implement PostGIS/Geo queries,Build availability calendar sync,Write sorting algorithm,Return ranked candidates",
            "Develop post-project rating engine|Allow Project Managers to submit 5-star ratings and private notes on technician performance.|Create Rating schema,Aggregate average scores,Implement decay curves for old ratings,Trigger low-rating alerts",
            "Build automated availability checking|Send SMS or email pings to candidate technicians for a new job, locking in the first to accept.|Integrate Twilio SMS,Write expiring token logic,Handle race conditions on acceptance,Trigger confirmation to PM",
            "Create strike system for no-shows|Implement a moderation protocol that automatically flags or suspends technicians with repeated infractions.|Define strike thresholds,Write suspension middleware,Create admin appeal endpoint,Log all infractions",
            "Implement NDA and IP tracking per technician|Track which sensitive projects a technician has touched and enforce strict IP offboarding.|Map ProjectAccess logs,Require digital signature for offboard,Automate password revocations,Generate compliance certificate",
            "Develop real-time on-site status tracking|Allow technicians to check-in/out of locations via GPS to verify time logic.|Build mobile-friendly check-in API,Validate against project coordinates,Log timestamps,Compare with estimated hours",
            "Build credential verification workflows|Create internal admin queues for manually verifying driver's licenses, passports, or union cards.|Build upload presign for secure docs,Create pending approval queue,Add expiration trackers,Trigger renewal warnings",
            "Implement tier-progression system|Create logic that promotes technicians from Junior to Lead based on successful completions and high ratings.|Define tier requirements,Write nightly evaluation cron,Update billing rates automatically,Send congratulatory emails"
        ]
    },

    // --- Jarvis ---
    {
        id: "obj_jrv_1", project_id: proj_jarvis, title: "Architect Execution Dashboard & Projects Container", description: "Build the central nervous system UI and backend containers where all high-level projects and statuses are monitored.", priority: "high", target_date: addDays(30), tasks: [
            "Develop isolated Project Container data models|Create logical boundaries ensuring specific agents and memories are sandboxed within a Project ID.|Create Project context schema,Enforce strict relations,Write isolation tests,Migrate existing tasks",
            "Build unified execution dashboard API|Aggregate task velocity, active agent processes, and blockers into a single summary payload.|Write complex aggregation queries,Calculate burnout/velocity metrics,Format standard dashboard JSON,Implement sub-50ms caching",
            "Implement internal Mission Control views|Render global views of all active tasks and AI streams, replacing legacy hardcoded models.|Design Mission Control layout,Connect to WS streams,Build global filter bars,Remove legacy project models",
            "Develop unified project configuration files|Allow projects to have a `jarvis.json` or YAML defining specific agent rules and environment variables.|Write parser service,Validate schema,Inject into agent context,Implement hot-reloading",
            "Build global timeline visualization data layer|Format tasks and agent activities into a timeline structure for UI rendering (Gantt-style).|Calculate critical paths,Format D3/Chart data,Resolve date conflicts,Expose pagination",
            "Implement WebSockets for real-time task updates|Push real-time state changes from backend directly to the Mission Control dashboard.|Setup Socket.io/WS layer,Map connection auth,Emit task transition events,Handle reconnect state",
            "Create quick-action command palette|Allow power-users to trigger background scripts or task creations via a keyboard-first API overlay.|Define command schemas,Implement fuzzy search,Write execution handler,Wire to UI overlay",
            "Develop cross-project dependency graphs|Allow Task A in Jarvis to block Task B in AssetOSX, visualizing these nodes via API.|Create Dependency schema,Write cycle-detection validation,Implement blocking logic on status,Expose graph payload",
            "Implement global search across all containers|Index all tasks, files, and project metadata into a unified search endpoint.|Integrate Meilisearch/Elastic,Create standard index schema,Write ingestion workers,Expose fast search API",
            "Build automated project health scoring|Run heuristics (stale tasks, missing updates) to assign a Red/Yellow/Green status to projects.|Define heuristic weights,Write scoring cron job,Update project metadata,Emit alerts on drops"
        ]
    },
    {
        id: "obj_jrv_2", project_id: proj_jarvis, title: "Build Agent Lifecycle & Orchestration Engine", description: "Create the core control plane that spawns, monitors, and terminates autonomous AI agents across the system.", priority: "high", target_date: addDays(45), tasks: [
            "Implement persistent Agent State Machine|Define initialization, processing, waiting, and dead states for agents mapped into the database.|Draft Agent schema,Write state transition logic,Implement heartbeat monitor,Create failure recovery logs",
            "Develop Docker-based execution sandboxes|Spawn agents into isolated Docker containers to prevent rogue system access during execution.|Configure Docker Engine API,Build base agent image,Implement container orchestration,Setup volume mounts",
            "Architect agent-to-agent message bus|Use Redis Pub/Sub or similar queue to allow heterogeneous agents to pass JSON payloads and context reliably.|Configure Redis streams,Write publisher abstractions,Write subscriber listen loop,Implement message durability",
            "Build filesystem control plane for agents|Provide agents with restricted virtual filesystems mapping back to real directories with strict bounds.|Implement virtual FS middleware,Enforce directory jail,Provide safe read/write endpoints,Audit file mutations",
            "Implement autonomous task consumption logic|Allow designated agents to pull 'todo' tasks, analyze them, and transition them to 'in_progress'.|Write queue polling logic,Add LLM decision step for suitability,Implement locking mechanism,Log assignment context",
            "Develop agent timeout and kill switches|Automatically terminate agents that loop infinitely or exceed expected runtime thresholds.|Define max execution times,Write health check monitor,Implement force-kill Docker command,Log panic reasons",
            "Build agent capability registration system|Allow new agents to register themselves and their specific toolsets to the orchestration engine.|Create Capability schema,Implement registration payload,Map tools to LLM functions,Update global agent directory",
            "Implement human-in-the-loop blocking states|When an agent lacks confidence, it must pause and request human input securely via the DB.|Create 'blocked_on_user' state,Send webhook alert to Mission Control,Expose resume API,Inject human response to LLM",
            "Develop cost-accumulation tracking per agent|Track total token usage and map cost to the specific agent instance and task it was performing.|Hook into OpenClaw callbacks,Aggregate total costs,Enforce local budgets,Halt agent on limit hit",
            "Build replayable execution traces|Store exact prompts, tool calls, and LLM responses natively so any agent's workflow can be precisely debugged.|Create Trace Log table,Serialize complex JSON arrays,Optimize storage compression,Expose replay endpoint"
        ]
    },
    {
        id: "obj_jrv_3", project_id: proj_jarvis, title: "Develop Memory System (Projects, Knowledge, Decisions)", description: "Establish Long-Term Memory (LTM) utilizing vector databases and structural logs to give Jarvis persistent context.", priority: "high", target_date: addDays(60), tasks: [
            "Architect multi-tiered memory taxonomy|Create structural divisions between ephemeral context, project rules, and global immutable knowledge.|Design memory schemas,Define retention policies,Implement tiered access APIs,Write architecture doc",
            "Implement Pinecone/ChromaDB integrations|Set up vector database clusters for semantic retrieval of past decisions and codebase specifics.|Provision vector DB,Write generic upsert wrappers,Implement search queries,Handle dimension scaling",
            "Build automatic codebase ingestion engine|Periodically scan git repositories, chunk files, and generate embeddings for agent search.|Write file parser,Implement semantic chunking,Call embedding model,Upsert to vector DB",
            "Develop decision abstraction layers|When an agent concludes a task, automatically distill the 'why' and store it as a core architectural principle.|Draft abstraction prompt,Implement post-task hook,Save localized rule,Broadcast to project context",
            "Implement context-window management logic|Dynamically construct prompts by querying vector DB and packing relevant memory without exceeding limits.|Write token estimator,Implement priority ranking for context,Build prompt assembler,Test truncation limits",
            "Build memory conflict resolution algorithms|When a new rule contradicts an old one, synthesize the conflict or flag for human review.|Detect contradictory embeddings,Prompt LLM for conflict resolution,Mark old memory deprecated,Alert Mission Control",
            "Develop memory decay and forgetting curves|Slowly deprecate older, less-accessed episodic memories to keep retrieval fast and context sharp.|Write daily decay cron,Lower memory relevance scores,Archive dead memories,Optimize index size",
            "Implement user preference memory layer|Specifically track the founder's explicit instructions (e.g. 'Never use tabs') globally across all agents.|Design strict preference schema,Inject into system prompts universally,Create UI to manage overrides,Test compliance",
            "Build episodic task logging|Store complete histories of high-complexity tasks as 'episodes' for few-shot prompting in the future.|Define episode JSON structure,Filter out noise logs,Compress successful flows,Expose as few-shot examples",
            "Develop memory debugging interface|Create a UI view to manually inspect, edit, or delete the vector embeddings and raw memories.|Build admin query API,Render memory graphs,Provide manual edit/delete tools,Log manual adjustments"
        ]
    },
    {
        id: "obj_jrv_4", project_id: proj_jarvis, title: "System Brain & Autonomous Prioritization", description: "Create an autonomous decision matrix that ranks tasks, assigns computing resources, and acts dynamically without prompts.", priority: "medium", target_date: addDays(90), tasks: [
            "Implement Eisenhower Matrix prioritization heuristics|Algorithmically weigh urgency, dependency locks, and project priority to rank global tasks.|Define calculation weights,Write sorting algorithm,Update ranks hourly,Expose top 10 queue",
            "Develop autonomous routine triggers|Allow the Brain to spawn agents daily for maintenance, code review, or status checking without human input.|Build cron scheduler for agents,Write routine definition files,Map to specific agents,Log routine outcomes",
            "Build resource allocation dynamic limits|If multiple projects demand agents, prioritize high-value projects while restricting token usage for lower tiers.|Implement token budget distributor,Calculate current active limits,Pause low-priority agents,Monitor via Mission Control",
            "Implement deadline anticipation modeling|Analyze task history to predict if an objective will miss its due date and alert the founder proactively.|Map velocity history,Run predictive model,Flag at-risk objectives,Suggest scope cuts",
            "Develop multi-agent debate protocols|For architectural decisions, spawn two agents with different system prompts to debate and reach consensus.|Write orchestrator script,Define back-and-forth prompt rules,Parse final output,Log debate transcript",
            "Build system anomaly detection|Monitor error rates, high latency, or weird agent loops and trigger a global 'defcon' state if necessary.|Define baseline metrics,Write anomaly detection script,Implement system lock-down modes,Fire external alerts",
            "Implement asynchronous user-polling hooks|If the Brain needs input on priority, queue an async message to the user and wait across sessions.|Write message queue schema,Build polling UI,Map response back to Brain context,Handle timeout defaults",
            "Develop cost-benefit analysis endpoints|Before starting a massive DB migration task, estimate total LLM cost and require founder approval if over $X.|Estimate token count via task size,Calculate expected cost,Implement approval gate,Trigger notification",
            "Build objective auto-generation logic|Allow Jarvis to look at a high-level goal and automatically break it down into 10 executable tasks.|Draft breakdown system prompt,Implement recursive check,Validate output against rules,Bulk insert tasks to DB",
            "Deploy the 'Founder Mode' override system|A simple global toggle that immediately pauses all autonomous execution, leaving only manual control.|Implement global kill-switch flag,Hook into all polling mechanisms,Broadcast WS pause event,Log manual intervention"
        ]
    },

    // --- OpenClaw ---
    {
        id: "obj_oc_1", project_id: proj_openclaw, title: "Provider Abstraction & Model Routing", description: "Create a universal interface to abstract Anthropic, OpenAI, Local models, and Groq behind a single intelligent router.", priority: "high", target_date: addDays(30), tasks: [
            "Architect Unified Model Interface|Design a common interface ensuring payloads for all providers normalize gracefully.|Define Standard Payload schema,Implement translation layers,Handle tool-calling mapping,Map standard response objects",
            "Implement intelligent model routing logic|Dynamically choose Claude for coding, GPT-4 for reasoning, and Local/Groq for fast classification.|Write routing heuristic engine,Define task categories,Map models to categories,Test routing accuracy",
            "Develop Groq integration for sub-50ms tasks|Set up specific high-speed pipelines to Groq for cheap, rapid tasks like JSON validation.|Integrate Groq SDK,Write fallback to OpenAI,Benchmark latency,Optimize prompt sizes",
            "Build streaming normalization wrapper|Ensure Server-Sent Events (SSE) from different APIs look identical to downstream Jarvis consumers.|Normalize chunk structures,Handle provider-specific disconnects,Write unified stream parser,Test UI rendering",
            "Implement multimodal abstraction logic|Abstract image and audio inputs uniformly regardless of the targeted provider.|Create generic multimodal payload,Implement base64 encoders,Map to Anthropic Vision,Map to GPT-4V",
            "Develop local model failover via Ollama|Allow seamless degradation to local Ollama models if external APIs drop or budget hits zero.|Configure Ollama endpoints,Map models (Llama3/Mistral),Test hardware latency,Implement silent fallback",
            "Build system prompt injection middleware|Create standard layers that silently inject context/memory before the request hits the provider.|Write injection concatenator,Enforce max token limits,Log final prompt,Secure keys",
            "Implement tool-calling unified registry|Standardize how tools are sent and invoked across Anthropic and OpenAI formats.|Create Tool Schema standard,Write parser for Claude JSON,Write parser for GPT JSON,Test execution mapping",
            "Develop retry and backoff mechanisms|Implement exponential backoff specifically tuned to the rate limits of each provider.|Write retry logic wrapper,Intercept 429 errors,Implement jitter,Log provider downtime",
            "Build prompt caching optimizations|Integrate Anthropic's prompt caching for massive system prompts to drastically reduce costs.|Implement cache control headers,Structure block logic for caching,Verify cache hit rates,Calculate cost savings"
        ]
    },
    {
        id: "obj_oc_2", project_id: proj_openclaw, title: "Budget Enforcement & Telemetry", description: "Deploy strict financial guardrails to prevent token-burn alongside massive observability into model performance.", priority: "high", target_date: addDays(45), tasks: [
            "Develop global budget enforcement layer|Hard-stop all requests if global daily/monthly token costs exceed configured bounds.|Create Budget schema,Implement Redis counter,Write interceptor,Alert on 80% and 100% threshold",
            "Implement cost attribution per project/agent|Track exact costs and assign them to specific internal projects to identify expensive workflows.|Map cost to Project ID in DB,Write aggregation scripts,Calculate mixed provider costs,Expose reporting API",
            "Build latency and Time-to-First-Token monitoring|Log millisecond-accurate TTFT and total request times for every LLM call.|Implement timing wrappers,Stream telemetry to DB,Setup dashboards for slow models,Alert on degradation",
            "Develop automated context-window throttling|If cost spikes locally, force models to dynamically truncate context or use cheaper models.|Write dynamic context slicer,Inject token constraints,Map trigger to budget spikes,Test graceful degradation",
            "Implement prompt injection defense proxy|Run lightweight heuristics or local models to scan inputs for jailbreaks before expensive API calls.|Design prompt firewall,Integrate Llama-Guard or local heuristics,Block malicious requests,Log IP/User",
            "Build response quality scoring mechanisms|Randomly sample LLM outputs and use a secondary cheaper model to assign a quality score (1-10).|Write sampling cron,Construct evaluator prompt,Store scores in telemetry,Flag models dropping in quality",
            "Develop API Key rotation and secret management|Securely rotate keys programmatically without downtime, handling multiple workspace environments.|Integrate AWS KMS or Vault,Write dynamic loader,Implement auto-rotation scripts,Validate new keys",
            "Implement real-time billing dashboard|Create a UI component in Mission Control showing rolling 24hr costs categorized by provider.|Write GraphQL/REST endpoint,Calculate rolling sums,Format Chart.js payloads,Sync with Redis counters",
            "Build webhook alerting for rate-limits|Push alerts directly to Slack/Discord if OpenAI or Anthropic starts returning excessive 429s.|Integrate external webhooks,Set alert thresholds,Format alert messages,Implement cooling-off period",
            "Develop offline reconciliation engine|Nightly, pull exact API usage logs from OpenAI/Anthropic and reconcile against internal estimates.|Fetch provider billing APIs,Compare with local DB logs,Adjust internal algorithms,Report discrepancies"
        ]
    },
    {
        id: "obj_oc_3", project_id: proj_openclaw, title: "Fallback Mechanisms & Offline Degradation", description: "Ensure the execution engine never fails entirely by routing down to smaller models progressively if outages occur.", priority: "medium", target_date: addDays(60), tasks: [
            "Architect the degradation staircase model|Design rules for shifting from Claude 3 Opus -> Sonnet -> Haiku -> GPT-3.5 -> Local based on load.|Build staircase JSON map,Write transition script,Apply timeout triggers,Audit loop checks",
            "Implement offline capability detection|On startup, detect available local Docker instances or local Ollama bins for offline capabilities.|Write ping utility,Register local models to internal registry,Store local active state,Test instance wake-up",
            "Develop semantic parity checks|When downgrading from GPT-4 to Haiku, ensure the system prompt is rewritten to fit the smaller model's context.|Write prompt summarizer,Store dual-prompts for tools,Measure token difference,Test output structure",
            "Build automated API status polling|Constantly ping provider `/v1/models` endpoints to determine uptime independent of user requests.|Set up health cron,Update global router status,Cache known-down providers,Trigger alerts",
            "Implement long-running offline batching|If internet drops, queue low-priority tasks locally and process them automatically upon reconnect.|Use IndexedDB/Redis queue,Implement connection listener,Process queue sequentially,Avoid rate-limit spikes on reconnect",
            "Develop strict fallback circuit breakers|Avoid infinite loops across APIs by limiting fallback attempts to max 3 layers before halting the task.|Implement breaker logic,Write recursion limits,Set 'failed_routing' state,Log failure chain",
            "Build local embeddings failover|If Pinecone or OpenAI embeddings drop, seamlessly switch to a local SentenceTransformers model.|Load ONNX model,Write local inference wrapper,Normalize dimension sizes,Test cosine similarity accuracy",
            "Implement fallback logging and analytics|Track exactly how often Jarvis degrades to offline models and calculate the cost savings or latency hits.|Store fallback events,Query performance drop-offs,Generate weekly reliability reports,Expose in OpenClaw UI",
            "Develop failover testing harnesses|Create simulated outages to test if the Jarvis orchestration engine successfully switches to Ollama within 100ms.|Write chaos engineering script,Mock Anthropic 503s,Measure switch latency,Ensure task success",
            "Implement data residency constraints|Allow certain project IDs to forbid API routing, enforcing that sensitive files are ONLY processed via local failovers.|Create 'local_only' project flag,Enforce router block logic,Return pre-flight errors on API attempt,Test secure parsing"
        ]
    },
    {
        id: "obj_oc_4", project_id: proj_openclaw, title: "System Prompt Management & Guardrails", description: "Build centralized tools for managing, versioning, and testing core AI system prompts across all capabilities.", priority: "medium", target_date: addDays(75), tasks: [
            "Architect the Prompt Registry DB schema|Create tables to hold versioned prompt templates, variables, and performance metadata.|Draft PromptTemplate schema,Create versioning links,Store A/B test states,Implement migration",
            "Implement variable interpolation engine|Allow dynamic injection of context (e.g. {{user_name}}, {{current_date}}) into raw prompts at runtime.|Write handlebar parser,Enforce missing variable errors,Sanitize inputs against injection,Test dynamic loading",
            "Develop prompt version control UI|Build an internal dashboard to edit, rollback, and branch system prompts like a Git repository.|Design editor UI,Implement diff viewer,Create commit logic,Deploy draft states",
            "Build A/B testing framework for prompts|Route 10% of agent tasks to 'Prompt Variant B' and measure explicit success rates automatically.|Implement split router,Assign task to variant,Calculate completion velocity,Generate comparison metrics",
            "Implement rigorous guardrail middleware|Run an explicit check on outputs ensuring they match predefined JSON schemas before passing back to Jarvis.|Write JSON schemaValidator,Trigger auto-retry on syntax error,Draft repair prompt,Log hallucination events",
            "Develop automated regression testing for prompts|Before deploying a prompt update, run it against 50 past task logs to verify it still solves them correctly.|Write test runner,Mock past memories,Assert exact JSON outputs,Generate fail/pass report",
            "Implement role-playing personality consistency|Ensure the 'Cortana' user-facing prompts maintain a specific tone, separating them from dry 'Jarvis' system prompts.|Map tone files,Inject tone strings,Test personality adherence,Create negative constraints (e.g., 'don't be overeager')",
            "Build external prompt fetching API|Allow authorized external apps to fetch the latest approved system prompts via JWT.|Create read-only GraphQL endpoint,Implement cache layer,Add API keys,Test access limits",
            "Develop toxicity and bias scanners|Scan LLM outputs periodically for unacceptable language or biases, especially in user-facing Cortana logs.|Integrate moderation endpoint,Write regex fallbacks,Flag logs for admin review,Update system restraints",
            "Implement dynamic context injection caps|Automatically truncate historical messages or vector memories if the assembled prompt exceeds the model's max limit.|Write token counter,Drop oldest memories first,Keep system instructions intact,Log truncation events"
        ]
    },

    // --- Cortana AI ---
    {
        id: "obj_cor_1", project_id: proj_cortana, title: "Primary Assistant Interface", description: "Build the polished, user-facing conversational product layer focusing on speed, context, and immediate actionability.", priority: "high", target_date: addDays(30), tasks: [
            "Architect main chat UI component|Build the core React/Next.js interface with extremely low-latency streaming and markdown rendering.|Implement React Markdown,Build SSE consumer,Style with Tailwind CSS,Manage scroll anchor",
            "Implement polymorphic action rendering|When Cortana returns structured data, render a UI widget (e.g. a chart or interactive card) instead of raw text.|Define Action schemas,Build widget registry,Intercept JSON in stream,Render dynamic components",
            "Develop local offline queue system|If the user drops connection, queue chat messages locally via IndexedDB and sync upon reconnect.|Implement Service Worker,Write IndexedDB wrappers,Build sync manager,Handle message ordering conflicts",
            "Build context-aware file attachments|Allow users to drag-and-drop PDFs, images, or code files instantly attaching them to the context window.|Implement Dropzone,Process base64/URL payloads,Map to multimodal backend,Show visual file tokens",
            "Implement branching conversation trees|Allow users to 'edit' a past message, branching the core conversation invisibly without losing history.|Update Message schema with parent_id,Write logic to traverse tree branches,Implement UI to swap branches,Ensure context integrity",
            "Develop natural language command parsing|Detect slash commands or explicit directives (e.g. '/deploy') inside chat and route to fast background services.|Write regex parsers,Implement fast-path routing,Bypass main LLM for strict commands,Return instant confirmations",
            "Build personalized voice-input integration|Use Whisper API to allow seamless voice interactions, auto-sending when user stops speaking.|Implement Web Audio API,Handle silence detection,Stream audio to Whisper,Inject transcribed text",
            "Implement cross-platform syncing|Ensure active chat sessions, typed inputs, and history sync perfectly via WebSockets across desktop and mobile.|Store draft state in Redis,Emit sync events,Rehydrate state on load,Handle race conditions",
            "Develop contextual 'suggestions' engine|Analyze current screen state or recent messages to provide 3 highly relevant quick-action buttons.|Feed context to fast Groq model,Generate 3 short intents,Render as UI chips,Auto-execute on click",
            "Build accessibility and keyboard-first navigation|Ensure the entire chat interface, works flawlessly without a mouse.|Implement ARIA roles,Handle global shortcut keys,Manage focus traps,Test with screen readers"
        ]
    },
    {
        id: "obj_cor_2", project_id: proj_cortana, title: "Workflow Automation Integrations", description: "Transform the assistant from absolute text into an agent that connects to external tools, APIs, and executes complex logic.", priority: "medium", target_date: addDays(45), tasks: [
            "Architect external API integration framework|Create a standardized plugin system allowing Cortana to securely hold OAuth tokens and hit external REST APIs.|Design Plugin schema,Implement OAuth flow,Store encrypted tokens,Write proxy execution layer",
            "Implement Google Workspace integrations|Allow reading and drafting emails, modifying calendar events, and extracting Drive documents.|Setup GCP OAuth,Write Gmail API wrappers,Implement Calendar conflict logic,Register as Cortana tools",
            "Develop multi-step trigger automation|Allow the assistant to build 'When X happens, do Y' background automations for the user.|Draft Automation schema,Implement webhook listener,Write rule evaluator engine,Execute action sequence",
            "Build local system execution tools|Provide a secure bridge allowing Cortana to run local shell scripts or modify local files based on user requests.|Implement local companion app,Write secure RPC bridge,Restrict shell permissions,Audit all local commands",
            "Implement human-in-loop approval for workflows|When a workflow initiates a destructive action, require one-click UI confirmation.|Design Approval state,Render confirmation widget in chat,Pause execution queue,Handle timeout rejection",
            "Develop custom API builder interface|Allow the founder to paste a Swagger/OpenAPI spec, automatically generating a usable tool within Cortana's context.|Parse OpenAPI JSON,Generate dynamic schemas,Register tool dynamically,Test endpoint health",
            "Build automated summarization crons|Schedule Cortana to read specified RSS feeds or emails daily, generating a morning brief.|Setup cron scheduler,Write ingestion scripts,Use inexpensive models for summarization,Push notification via UI",
            "Implement Stripe and financial integrations|Connect viewing dashboards of revenue, failed payments, and executing internal refunds via chat commands.|Register Stripe API tools,Write read-only summaries,Implement secure refund logic,Restrict logic by user role",
            "Develop contextual browser extension|Create an extension that can inject the current active web page text directly into Cortana's context window.|Build Chrome Extension manifest,Extract DOM text cleanly,Send via local WebSocket,Handle extension auth",
            "Build failure recovery for automations|If an API breaks mid-workflow, allow the assistant to use its reasoning capability to find an alternative route or notify.|Implement try/catch wrappers,Inject error logs to LLM context,Prompt LLM to self-correct,Log final failure state"
        ]
    },
    {
        id: "obj_cor_3", project_id: proj_cortana, title: "User Memory & Personalization Engine", description: "Establish long-term persistent context so the AI remembers the user's preferences, projects, and biographical facts natively.", priority: "medium", target_date: addDays(60), tasks: [
            "Architect the Graph Memory database for users|Map user relationships, preferences, and facts using a Graph DB approach suitable for the LLM to query.|Setup Neo4j or EdgeDB,Draft Node schema for facts,Write Cypher query generator,Test relationship traversal",
            "Implement implicit preference extraction|Analyze ongoing chat patterns silently in the background to deduce and store preferences (e.g., 'Prefers bullet points').|Deploy background agent crawler,Write abstraction prompts,Update User Profile JSON,Inject into system loop",
            "Develop explicit 'Remember this' functions|Create a direct slash command (`/remember`) that instantly commits a specific string to permanent memory with priority weighting.|Implement slash command handler,Write secure DB insert,Provide visual confirmation chip,Tag with timestamp",
            "Build context-window distillation algorithms|Prevent the prompt size from bloating by distilling old session logs into dense summary paragraphs nightly.|Write summarization cron,Replace old chat rows with summaries,Ensure searchable vectors remain,Calculate token savings",
            "Implement user emotion and tone matching|Dynamically shift Cortana's response tone (formal, empathetic, concise) based on the user's current session sentiment.|Setup sentiment analyzer module,Map sentiment to prompt modifiers,Test emotional transitions,Ensure fallback neutral tone",
            "Develop multi-device session continuity|Ensure that a user ending a voice chat in the car can immediately resume the exact context on desktop text chat.|Store active context in Redis cache,Broadcast state via WebSockets,Sync UI inputs in real-time,Handle offline delta merges",
            "Build biometric or secure voice identification|Authenticate the user via voice print before exposing highly sensitive financial context within a voice session.|Integrate Azure Voice ID or similar,Write enrollment flow,Enforce strict fallback,Lock secure tool execution",
            "Implement proactive 'check-in' capabilities|Allow Cortana to initiate conversations based on calendar events or external triggers without user input.|Write proactive message engine,Send push notifications,Handle quiet hours logic,Render UI chat bubble smoothly",
            "Develop memory debugging and deletion UI|Give the user an interface to see exactly 'what Cortana knows about me' and easily delete incorrect facts.|Render categorized fact list,Implement delete/edit endpoints,Sync updates to vector DB,Ensure GDPR compliance",
            "Build specialized 'Coding Persona' memory triggers|Automatically switch memory contexts if the user says 'Let's write code', loading their preferred languages and git setups.|Implement context-switch detector,Load specific tech stack rules,Drop casual memory constraints,Provide coding UI enhancements"
        ]
    },
    {
        id: "obj_cor_4", project_id: proj_cortana, title: "Local Device Control & OS Integration", description: "Extend the assistant beyond the browser, allowing native desktop and mobile interactions like file management and application control.", priority: "medium", target_date: addDays(75), tasks: [
            "Architect Tauri-based Desktop Application|Wrap the web experience in a Rust-based Tauri app to gain native OS capabilities without massive overhead.|Initialize Tauri project,Migrate web assets,Configure build pipelines for macOS/Windows,Implement auto-updaters",
            "Implement bidirectional file system bridging|Allow Cortana to securely read local directories and create files when instructed by the user.|Write Rust FS APIs,Expose safe invoke targets to JS,Implement UI permission gates,Audit file creation logic",
            "Develop AppleScript / PowerShell execution layers|Give the assistant tools to open native applications, adjust volume, or move windows on the user's machine.|Map OS-specific scripts,Write execution wrappers,Parse return statuses,Prompt user for script approval",
            "Build global keyboard shortcut triggers|Allow hitting a universal hotkey (e.g., Cmd+Space) to instantly summon the Cortana interface over any application.|Implement global hotkey listener,Manage OS window focus,Create transparent overlay UI,Test multi-monitor support",
            "Implement local clipboard context injection|Add a tool that allows Cortana to automatically read the OS clipboard if the user references it (e.g. 'Fix this code').|Write clipboard read API,Detect textual intent,Warn user of privacy access,Execute and clear buffer",
            "Develop native notifications and deep linking|Push system notifications that link directly back into specific conversational states or required approvals.|Integrate Rust desktop notifications,Parse deep links,Route React Router state,Handle app waking from sleep",
            "Build offline Llama.cpp degradation model|Embed a lightweight local model directly in the desktop app for basic tasks if Wi-Fi is unavailable.|Bundle Llama.cpp binary,Manage model downloading/caching,Detect network offline state,Switch API endpoints transparently",
            "Implement local calendar and contact syncing|Allow the app to read native Apple Contacts or Outlook locally without relying exclusively on cloud OAuth.|Write OS-level calendar hooks,Normalize events to internal schema,Sync changes upstream,Respect OS privacy settings",
            "Develop 'Screen Context' snapshotting|Take scheduled screenshots (with explicit permission), process via local OCR, to give the assistant context on what the user is looking at.|Implement screenshot utility,Run Tesseract/local OCR,Discard image immediately,Pass text to context window",
            "Build isolated execution environments (Sandboxing)|Ensure any shell scripts drafted by the AI are executed within a restricted local Docker container or tight sandbox.|Setup local VM/sandbox tech,Restrict network access of scripts,Mount specific safe directories,Catch execution traps"
        ]
    },

    // --- Medellin Social Club ---
    {
        id: "obj_msc_1", project_id: proj_medellin, title: "Invite-Only Onboarding System", description: "Build an ultra-exclusive, highly vetted onboarding pipeline utilizing rich user data extraction and review gating.", priority: "high", target_date: addDays(30), tasks: [
            "Architect multi-step application database schema|Define complex application states, tracking external data, social links, and internal referral webs.|Draft Application schema,Create Review state enums,Implement referral mapping,Write initial migrations",
            "Build dynamic encrypted application forms|Create frontend form components that store data progressively and handle rich media uploads securely.|Implement React Hook Form,Build progressive saving logic,Handle secure S3 uploads,Encrypt sensitive fields",
            "Implement social graph referral verifications|Connect applicant profiles to existing members, mapping a network graph to identify trusted nodes.|Write referral input logic,Calculate network proximity score,Graph DB mapping,Flag high-value nodes",
            "Develop automated OSINT enrichment|When an application is submitted, use Clearbit or similar APIs to pull public LinkedIn/X data for verification.|Integrate enrichment APIs,Parse external payloads,Display summary on admin dashboard,Flag discrepancies",
            "Build the Admin Review Queue dashboard|Create a complex table view for admins to process, reject, or waitlist applications with bulk actions.|Implement complex data tables,Handle status filtering,Render side-by-side profile comparisons,Implement bulk change APIs",
            "Implement secure magical-link authentication|Remove standard passwords entirely; use secure, expiring email/SMS links for login and application tracking.|Build token generator,Write JWT issuance,Configure SendGrid transactional loops,Handle token expiration",
            "Develop tiered waitlisting logic|Algorithmically slot approved users into specific waitlist positions based on internal scores and region caps.|Calculate waitlist score,Implement region quotas,Write slot allocation logic,Expose user status API",
            "Build localized Stripe onboarding flows|When off the waitlist, trigger a localized Stripe checkout page mapping to specific membership tiers.|Implement Stripe Checkout,Handle local currencies,Sync subscription status to DB,Activate member profile",
            "Implement secret-keeper invite generation|Allow 'Founder' tier members to generate single-use, cryptographic invite codes that bypass standard waitlisting.|Design InviteCode schema,Write cryptographic generator,Enforce generation limits,Track code redemption lineage",
            "Develop welcome experience personalization|Upon first login, customize the portal UI, greeting, and available events based on the user's vetted persona.|Construct Persona tags,Implement UI state variations,Draft personalized automated welcome email,Log first login metrics"
        ]
    },
    {
        id: "obj_msc_2", project_id: proj_medellin, title: "Event Management & Experience Booking", description: "Deploy a global event system with strict access controls, limited inventory, and dynamic tier-based visibility.", priority: "high", target_date: addDays(45), tasks: [
            "Architect high-concurrency Event & Ticket schemas|Design robust models to handle hundreds of users attempting to book 20 available spots simultaneously.|Draft Event and Booking schemas,Implement DB-level row locking,Handle transaction rollbacks,Test high-load scenarios",
            "Implement dynamic tier visibility rules|Ensure an exclusive 'Inner Circle' dinner is invisible to standard 'Member' tiers across all APIs.|Write visibility middleware,Map tier enums to Event access rules,Test restricted API calls,Audit GraphQL resolvers",
            "Develop location-aware event discovery|Filter and notify users of events happening in their current city or flagged travel destinations.|Integrate GeoIP tracking,Write radius-based queries,Implement 'My Trips' tagging,Push specialized alerts",
            "Build mobile-first booking UI flows|Create frictionless purchasing flows optimized specifically for iOS/Android WebView contexts.|Design mobile touch-points,Integrate Stripe Elements natively,Handle connection drops cleanly,Generate digital receipt",
            "Implement digital ticket generation via Apple/Google Wallet|Generate .pkpass files mapping internal RSVPs to native mobile wallets with dynamic QR codes.|Integrate PKPass generator,Map QR codes to Booking IDs,Configure push notifications for updates,Test cross-device rendering",
            "Develop on-site QR scanner admin capability|Build a specific view inside the app for event staff to rapid-scan and check-in attendees via camera.|Implement HTML5 QR decoder,Write fast check-in mutation,Handle offline sync caching,Render guest list fallback",
            "Build algorithmic event waitlists|If an event is full, allow users to join a queue; if a spot opens, auto-charge and notify the next in line.|Implement queue schema,Write cancellation webhooks,Execute Stripe auto-charge,Implement fairness checks",
            "Implement guest-pass allocation logic|Allow high-tier members to assign temporary digital guest passes to non-members for specific public events.|Create GuestPass entity,Generate temporary magic links,Limit quantities per event,Require basic guest info",
            "Develop post-event gallery and engagement features|Release locked photo galleries visible only to verified attendees, allowing discrete saving and sharing.|Hook to S3 secure buckets,Verify attendance records via API,Implement long-press save protection,Log viewing metrics",
            "Build automated event ROI reporting|Generate financial reports for admins comparing ticket revenue versus estimated costs per experience.|Write data aggregation pipelines,Calculate profit margins,Analyze attendance drop-off rates,Export as PDF"
        ]
    },
    {
        id: "obj_msc_3", project_id: proj_medellin, title: "Admin Concierge & Members Directory", description: "Provide premium concierge tools and a carefully curated internal directory for members to network.", priority: "medium", target_date: addDays(60), tasks: [
            "Architect the Members Directory privacy schema|Allow users to opt-in or strictly obscure specific contact points (email, phone, socials) from other members.|Design Privacy Settings table,Write query sanitization logic,Verify strict masking,Add default-off values",
            "Build high-performance directory search interface|Develop an Algolia-like instant search for the member base, filtering by industry, city, and interests.|Integrate Meilisearch,Index verified profiles,Build frontend debounced search UI,Implement pagination",
            "Implement secure member-to-member direct messaging|Allow members to message each other within the platform without exposing native phone numbers or emails.|Design Message schema,Write WebSocket delivery,Implement push notifications,Provide blocking mechanics",
            "Develop dynamic Concierge request ticketing|Build a polished form where members can request specific global reservations or assistance mapping to a Zendesk-like admin queue.|Create Request schema,Design request categories,Write webhook to internal Slack channel,Expose resolution API updates",
            "Build the internal admin CMS for concierge|Give staff a dashboard to assign, track, and resolve member requests, charging the Stripe account directly if needed.|Implement Kanban board UI,Write assignment logic,Implement Stripe immediate charge mechanism,Generate resolution receipts",
            "Implement AI-assisted concierge routing|Use LLMs to automatically categorize a user's request (e.g. 'Restaurant Booking' vs 'Travel Visa Assist') and auto-assign to the correct staff.|Write categorization prompt,Map outputs to staff IDs,Log accuracy,Provide admin override",
            "Develop 'City Guides' CMS & UI|Create curated, admin-managed city guides available to members based on their travel itineraries.|Design Guide schemas,Implement rich-text editor for admins,Render engaging mobile views,Link guides to member locations",
            "Build automated birthday and milestone triggers|Automatically alert the concierge team 7 days before a VIP member's birthday to organize gifts or experiences.|Write daily scanning cron,Hook into birthdate field,Generate automated Slack alert,Track gift fulfillment history",
            "Implement global timezone synchronization|Ensure timezone-agnostic interactions where a member in Tokyo sees concierge availability and messages correctly mapped against staff in NY.|Force UTC DB storage,Write robust frontend date parsers,Implement localized formatting,Test DST edge cases",
            "Develop cross-member 'Introduction' workflows|Allow members to officially request introductions to other members, brokered through the concierge team for privacy.|Design Introduction entity,Implement double-opt-in mechanic,Send brokered emails,Log success rates"
        ]
    },
    {
        id: "obj_msc_4", project_id: proj_medellin, title: "Internal Trust & Moderation Engine", description: "Ensure the community remains high-quality through automated flagging, strike systems, and strict content moderation.", priority: "medium", target_date: addDays(75), tasks: [
            "Architect global strike and moderation schema|Track specific user infractions (no-shows, harassment reports) maintaining a numerical strike tally against their profile.|Design Strike table,Map infraction categories,Implement cumulative tallying,Create threshold limits",
            "Implement anonymous reporting APIs|Allow any member to report messages, profiles, or event behavior securely and anonymously to the moderation team.|Write report ingestion endpoint,Scrub identifying metadata conditionally,Alert admins immediately,Log resolution actions",
            "Develop automated spam/solicitation detection|Scan member-to-member messages algorithmically for crypto-scams, unsolicited pitching, or mass-messaging.|Integrate basic NLP filters,Implement message rate-limiting,Flag suspicious outlier accounts,Auto-suspend severe violations",
            "Build the Moderation Queue UI|Create an isolated admin dashboard specifically for reviewing flagged content, providing quick buttons to ban, warn, or dismiss.|Implement complex filtering,Render context of reported message natively,Bind quick-action mutations,Ensure audit logging",
            "Implement algorithmic event no-show penalties|Automatically issue a strike and fine the member's underlying Stripe card if they RSVP but fail to check-in via QR.|Calculate attendance discrepancy,Execute Stripe fine,Update strike tally,Send automated warning email",
            "Develop progressive account restriction mechanisms|If a user hits '2 strikes', restrict their ability to direct message other members for 30 days without fully banning them.|Write restriction middleware,Map active restrictions to JWT tokens,Filter disabled actions on UI,Implement automated expiry",
            "Build external vetting data-refresh cron|Periodically re-verify members against public databases (e.g. criminal records, sanctions lists) to ensure ongoing compliance.|Integrate third-party KYB/KYC API,Run quarterly batch verifications,Flag changed statuses,Suspend immediately on critical match",
            "Implement automated warning generation|When admins hit 'Warn' on a minor infraction, use an LLM to generate a polite but firm custom warning email based on the context.|Draft moderation prompt context,Pass API payload to LLM,Review drafted email in UI before sending,Dispatch via SendGrid",
            "Develop membership revocation workflows|Create a one-click 'Nuke' capability that handles banning the user, canceling active Stripe subs, refunding pending tickets, and deleting profile data.|Write destructive transaction query,Execute external API cancelations,Perform GDPR soft-delete,Log revocation reason",
            "Build the Appeals mechanism API|Allow restricted members a one-time 500-character submission box to explain circumstances or appeal decisions.|Create Appeal schema,Link to specific Strike ID,Render in Moderation Queue,Finalize irreversible outcome"
        ]
    }
];

const generateTasks = () => {
    let allTasks = [];
    objectivesRaw.forEach(obj => {
        if(!obj.tasks) return;
        obj.tasks.forEach((taskString) => {
            const parts = taskString.split('|');
            const title = parts[0];
            const description = parts[1];
            const checklistRaw = parts[2];
            
            const task = {
                id: gId("task"),
                title: title,
                description: description,
                status: "todo",
                start_date: today.toISOString().split('T')[0],
                due_date: obj.target_date,
                checklist: checklistRaw ? checklistRaw.split(',') : [],
                members: ["Roy"],
                project_id: obj.project_id,
                objective_id: obj.id,
                comments: []
            };
            allTasks.push(task);
        });
        delete obj.tasks; // Strip out tasks array
    });
    return allTasks;
};

const finalData = {
    projects: projects,
    objectives: objectivesRaw,
    tasks: generateTasks()
};

fs.writeFileSync('/Users/jarvis/.openclaw/workspace/projects/jarvis-ai/execution_system_seed.json', JSON.stringify(finalData, null, 2));
console.log("Successfully generated execution_system_seed.json");
