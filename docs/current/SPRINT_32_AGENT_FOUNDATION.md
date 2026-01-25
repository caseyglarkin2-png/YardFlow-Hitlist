# Sprint 32: Agent Orchestration Foundation

**Goal**: Robust, observable, database-backed Agent entities.
**Philosophy**: Move from "script" to "system".

## 📋 Execution Plan (Atomic Tasks)

### 32.1: Agent State Schema (Est: 45 min)
*   **Context**: We need to track the lifecycle of long-running AI tasks.
*   **Changes**:
    *   Create tables `AgentTask`, `AgentRun`, `AgentLog`.
    *   Fields: `id`, `type`, `status` (PENDING, RUNNING, COMPLETED, FAILED), `input` (Json), `output` (Json).     
*   **Validation**: 
    *   Migration runs. `createAgentTask()` helper works.

### 32.2: Abstract Agent System (Est: 90 min)
*   **Context**: Base class to standardize error handling and logging.
*   **Changes**:
    *   Create `abstract class BaseAgent`.
    *   Methods: `run(input)`, `log(msg)`, `handleError(err)`.
    *   Integration with `AgentLog` table.
*   **Validation**: 
    *   Unit test: `MockAgent` logs appear in DB.

### 32.3: Dispatch Queue & Worker (Est: 90 min)
*   **Context**: The "brain" that wakes up agents.
*   **Changes**:
    *   Create `agent-dispatch` queue.
    *   Worker: Dequeues -> Instantiates Agent -> Calls `.run()`.
*   **Validation**: 
    *   End-to-end: Enqueue Task -> DB Status updates to COMPLETED.

### 32.4: Agent Debug Dashboard (Est: 90 min)
*   **Context**: "Glue" task for developer efficiency.
*   **Changes**:
    *   Route `/dashboard/admin/agents`.
    *   Table view of Runs and Logs. "Retry" button.
*   **Validation**: 
    *   Manual usage: Can see logs of previous tasks.

### 32.5: Research Agent Migration (Est: 90 min)
*   **Context**: Porting legacy logic to new system.
*   **Changes**:
    *   Create `ResearchAgent extends BaseAgent`.
    *   Move Gemini Company Dossier logic inside.
*   **Validation**: 
    *   Comparison: Output matches legacy script quality.
