// ─── Task lifecycle ───────────────────────────────────────────────────────────

export type TaskStatus =
  | 'pending'
  | 'planning'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type AgentRole =
  | 'planner'
  | 'browser'
  | 'research'
  | 'extraction'
  | 'validation';

export type ActionType =
  | 'click'
  | 'type'
  | 'navigate'
  | 'scroll'
  | 'screenshot'
  | 'extract'
  | 'select'
  | 'upload'
  | 'wait'
  | 'open_tab'
  | 'close_tab'
  | 'human_approval'
  | 'hover'
  | 'key_press'
  | 'drag_drop';

// ─── Core domain models ───────────────────────────────────────────────────────

export interface Task {
  id: string;
  userId: string;
  instruction: string;
  status: TaskStatus;
  plan: TaskPlan | null;
  steps: ExecutionStep[];
  screenshots: Screenshot[];
  result: TaskResult | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskPlan {
  goal: string;
  subgoals: string[];
  estimatedSteps: number;
  startUrl: string | null;
  reasoning: string;
}

export interface ExecutionStep {
  id: string;
  taskId: string;
  stepNumber: number;
  action: BrowserAction;
  reasoning: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  result: StepResult | null;
  duration: number | null;
  timestamp: Date;
}

export interface BrowserAction {
  type: ActionType;
  selector?: string;
  value?: string;
  url?: string;
  key?: string;
  scrollDirection?: 'up' | 'down' | 'left' | 'right';
  scrollAmount?: number;
  description: string;
  requiresApproval?: boolean;
}

export interface StepResult {
  success: boolean;
  data?: unknown;
  error?: string;
  screenshotId?: string;
  htmlSnippet?: string;
}

export interface Screenshot {
  id: string;
  taskId: string;
  stepId: string | null;
  url: string;
  pageUrl: string;
  base64?: string;
  width: number;
  height: number;
  timestamp: Date;
}

export interface TaskResult {
  success: boolean;
  summary: string;
  extractedData?: Record<string, unknown>;
  error?: string;
  totalSteps: number;
  successfulSteps: number;
}

// ─── Browser state & DOM ─────────────────────────────────────────────────────

export interface BrowserState {
  url: string;
  title: string;
  screenshotBase64?: string;
  domSummary: DomSummary;
  timestamp: Date;
}

export interface DomSummary {
  interactiveElements: InteractiveElement[];
  visibleText: string;
  forms: FormInfo[];
  links: LinkInfo[];
  errors: string[];
  captchaDetected: boolean;
  modalDetected: boolean;
  pageType: 'standard' | 'spa' | 'iframe' | 'pdf' | 'unknown';
}

export interface InteractiveElement {
  selector: string;
  type: string;
  text: string;
  placeholder?: string;
  ariaLabel?: string;
  role?: string;
  href?: string;
  visible: boolean;
  enabled: boolean;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface FormInfo {
  selector: string;
  action?: string;
  method?: string;
  fields: FormField[];
}

export interface FormField {
  name: string;
  type: string;
  required: boolean;
  selector: string;
  label?: string;
  placeholder?: string;
  options?: string[];
}

export interface LinkInfo {
  href: string;
  text: string;
  selector: string;
  isExternal: boolean;
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export interface BrowserSession {
  id: string;
  taskId: string;
  userId: string;
  status: 'active' | 'idle' | 'closed';
  currentUrl: string | null;
  createdAt: Date;
  lastActiveAt: Date;
}

// ─── WebSocket messages ───────────────────────────────────────────────────────

export type WsMessageType =
  | 'task:started'
  | 'task:plan'
  | 'task:step:start'
  | 'task:step:complete'
  | 'task:screenshot'
  | 'task:log'
  | 'task:approval:required'
  | 'task:approval:response'
  | 'task:completed'
  | 'task:failed'
  | 'task:cancelled'
  | 'agent:reasoning'
  | 'browser:state'
  | 'ping'
  | 'pong';

export interface WsMessage<T = unknown> {
  type: WsMessageType;
  taskId: string;
  payload: T;
  timestamp: string;
}

export interface WsTaskStartedPayload {
  taskId: string;
  instruction: string;
}

export interface WsTaskPlanPayload {
  plan: TaskPlan;
}

export interface WsStepStartPayload {
  step: ExecutionStep;
}

export interface WsStepCompletePayload {
  step: ExecutionStep;
  result: StepResult;
}

export interface WsScreenshotPayload {
  screenshot: Screenshot;
}

export interface WsApprovalPayload {
  stepId: string;
  action: BrowserAction;
  reason: string;
  timeoutMs: number;
}

export interface WsApprovalResponsePayload {
  stepId: string;
  approved: boolean;
}

export interface WsTaskCompletedPayload {
  result: TaskResult;
  durationMs: number;
}

export interface WsTaskFailedPayload {
  error: string;
  step?: ExecutionStep;
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export interface AgentLog {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  agent: AgentRole;
  message: string;
  data?: Record<string, unknown>;
  timestamp: Date;
}

// ─── API request/response shapes ─────────────────────────────────────────────

export interface CreateTaskRequest {
  instruction: string;
  startUrl?: string;
  options?: TaskOptions;
}

export interface TaskOptions {
  maxSteps?: number;
  requireApprovalFor?: ActionType[];
  allowedDomains?: string[];
  headless?: boolean;
  recordSession?: boolean;
}

export interface CreateTaskResponse {
  taskId: string;
  status: TaskStatus;
}

export interface ListTasksResponse {
  tasks: Task[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  status?: TaskStatus;
}

// ─── Queue job payloads ───────────────────────────────────────────────────────

export interface AgentJobPayload {
  taskId: string;
  userId: string;
  instruction: string;
  startUrl?: string;
  options?: TaskOptions;
}

// ─── Safety ───────────────────────────────────────────────────────────────────

export interface SafetyCheckResult {
  allowed: boolean;
  reason?: string;
  requiresApproval?: boolean;
}
