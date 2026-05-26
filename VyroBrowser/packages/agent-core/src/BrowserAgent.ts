import { Ollama } from 'ollama';
import type { Message, ToolCall } from 'ollama';
import { BROWSER_AGENT_SYSTEM_PROMPT, browserTools } from '@vyro/ai-prompts';
import type { BrowserSession } from '@vyro/browser-engine';
import type {
  AgentLog,
  BrowserAction,
  BrowserState,
  Screenshot,
  StepResult,
  WsMessage,
} from '@vyro/shared-types';
import type { Logger } from 'pino';
import { StateSerializer } from '@vyro/dom-parser';
import type { ShortTermMemory } from './memory/ShortTermMemory.js';
import { SafetyGuard } from './safety/SafetyGuard.js';
import { randomUUID } from 'crypto';

export interface BrowserAgentConfig {
  ollamaBaseUrl?: string;
  model?: string;
  logger: Logger;
  maxIterations?: number;
  safetyGuard: SafetyGuard;
}

export type AgentEventCallback = (message: WsMessage) => void | Promise<void>;
export type ApprovalCallback = (action: BrowserAction, reason: string) => Promise<boolean>;

export interface ExecuteOptions {
  taskId: string;
  instruction: string;
  memory: ShortTermMemory;
  session: BrowserSession;
  onEvent: AgentEventCallback;
  onApprovalRequired: ApprovalCallback;
}

/**
 * BrowserAgent manages the Ollama tool-calling loop that drives browser interactions.
 * It translates Ollama's tool_calls into real Playwright actions via BrowserSession.
 */
export class BrowserAgent {
  private readonly ollama: Ollama;
  private readonly model: string;
  private readonly logger: Logger;
  private readonly maxIterations: number;
  private readonly safetyGuard: SafetyGuard;
  private readonly stateSerializer: StateSerializer;

  constructor(config: BrowserAgentConfig) {
    this.ollama = new Ollama({
      host: config.ollamaBaseUrl ?? process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434',
    });
    this.model = config.model ?? process.env['OLLAMA_MODEL'] ?? 'llama3.1:8b';
    this.logger = config.logger;
    this.maxIterations = config.maxIterations ?? 50;
    this.safetyGuard = config.safetyGuard;
    this.stateSerializer = new StateSerializer();
  }

  async execute(options: ExecuteOptions): Promise<{ success: boolean; summary: string; extractedData?: Record<string, unknown> }> {
    const { taskId, instruction, memory, session, onEvent, onApprovalRequired } = options;

    // Conversation history — Ollama uses {role, content} format same as OpenAI
    const messages: Message[] = [];
    let stepNumber = 0;
    let extractedData: Record<string, unknown> | undefined;
    let taskDone = false;
    let finalSummary = '';

    // Build initial user message
    const memorySummary = memory.getSummary();
    const initialPrompt = [
      `Task: ${instruction}`,
      '',
      memorySummary ? `Context:\n${memorySummary}` : '',
      '',
      'Begin executing the task. Start by calling get_page_state or take_screenshot to understand the current browser state.',
    ]
      .filter((l) => l !== undefined)
      .join('\n')
      .trim();

    messages.push({ role: 'user', content: initialPrompt });

    this.emit(onEvent, taskId, 'task:log', this.makeLog('info', 'browser', 'Agent starting execution'));

    for (let iteration = 0; iteration < this.maxIterations && !taskDone; iteration++) {
      // Loop detection
      if (memory.isInLoop()) {
        const loopedAction = memory.getMostRepeatedAction();
        this.logger.warn({ loopedAction }, 'Loop detected — injecting recovery prompt');
        messages.push({
          role: 'user',
          content: `LOOP DETECTION: You appear to be repeating the same action "${loopedAction}". Try a completely different approach or call the done tool if you are stuck.`,
        });
      }

      let response;
      try {
        response = await this.ollama.chat({
          model: this.model,
          messages: [
            { role: 'system', content: BROWSER_AGENT_SYSTEM_PROMPT },
            ...messages,
          ],
          tools: browserTools,
          stream: false,
        });
      } catch (error) {
        const err = error as Error;
        this.logger.error({ error: err.message }, 'Ollama chat error');
        return {
          success: false,
          summary: `AI model error: ${err.message}. Make sure Ollama is running (ollama serve) and the model is pulled (ollama pull ${this.model}).`,
        };
      }

      const assistantMessage = response.message;
      this.logger.debug(
        { hasToolCalls: !!assistantMessage.tool_calls?.length, contentLength: assistantMessage.content?.length },
        'Ollama response'
      );

      // Add assistant message to history
      messages.push(assistantMessage);

      // Emit reasoning text if present
      if (assistantMessage.content?.trim()) {
        this.emit(onEvent, taskId, 'agent:reasoning', { text: assistantMessage.content });
        this.emit(onEvent, taskId, 'task:log', this.makeLog('info', 'browser', assistantMessage.content.slice(0, 200)));
      }

      // If no tool calls, model is done reasoning without acting — prompt it to act
      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        // Check if the text content indicates completion
        const text = assistantMessage.content ?? '';
        if (
          text.toLowerCase().includes('task complete') ||
          text.toLowerCase().includes('task is complete') ||
          text.toLowerCase().includes('successfully completed') ||
          text.toLowerCase().includes('task has been completed')
        ) {
          return { success: true, summary: text, extractedData };
        }

        // Prompt the model to use a tool
        if (iteration < this.maxIterations - 1) {
          messages.push({
            role: 'user',
            content:
              'You must use a tool to interact with the browser. Call get_page_state to understand the current state, then take appropriate action. When finished, call the done tool.',
          });
          continue;
        }

        return {
          success: false,
          summary: assistantMessage.content ?? 'Maximum iterations reached without completing the task',
          extractedData,
        };
      }

      // Process each tool call
      const toolResults: string[] = [];

      for (const toolCall of assistantMessage.tool_calls) {
        stepNumber++;
        const toolName = toolCall.function.name;
        const rawArgs = toolCall.function.arguments;

        // Ollama may return arguments as string or object
        let input: Record<string, unknown>;
        if (typeof rawArgs === 'string') {
          try {
            input = JSON.parse(rawArgs) as Record<string, unknown>;
          } catch {
            input = {};
          }
        } else {
          input = rawArgs as Record<string, unknown>;
        }

        this.logger.info({ tool: toolName, stepNumber }, 'Executing tool');
        this.emit(onEvent, taskId, 'task:step:start', {
          stepNumber,
          tool: toolName,
          description: input['description'],
        });
        this.emit(onEvent, taskId, 'task:log', this.makeLog(
          'info',
          'browser',
          `Step ${stepNumber}: ${toolName} — ${String(input['description'] ?? '')}`
        ));

        // Handle done tool specially
        if (toolName === 'done') {
          taskDone = true;
          const success = String(input['success'] ?? 'true') !== 'false';
          finalSummary = String(input['summary'] ?? 'Task completed');

          if (input['extractedData']) {
            try {
              const parsed =
                typeof input['extractedData'] === 'string'
                  ? (JSON.parse(input['extractedData']) as Record<string, unknown>)
                  : (input['extractedData'] as Record<string, unknown>);
              extractedData = { ...extractedData, ...parsed };
            } catch {
              // ignore parse errors on extracted data
            }
          }

          toolResults.push(JSON.stringify({ toolName, result: { success: true, data: 'Task marked as done' } }));

          memory.addAction(`done: ${finalSummary.slice(0, 100)}`, 'success', stepNumber);

          this.emit(onEvent, taskId, 'task:step:complete', {
            stepNumber,
            tool: toolName,
            success: true,
          });

          return { success, summary: finalSummary, extractedData };
        }

        const result = await this.executeTool(
          taskId,
          toolName,
          input,
          session,
          stepNumber,
          onEvent,
          onApprovalRequired,
          memory
        );

        // Capture extracted data
        if (toolName === 'extract_data' && result.success && result.data) {
          const resultData = result.data as Record<string, unknown>;
          if (resultData['extracted']) {
            extractedData = { ...extractedData, ...(resultData['extracted'] as Record<string, unknown>) };
          }
        }

        memory.addAction(
          `${toolName}: ${String(input['description'] ?? '')}`,
          result.success ? 'success' : `failed: ${result.error ?? 'unknown'}`,
          stepNumber
        );

        this.emit(onEvent, taskId, 'task:step:complete', {
          stepNumber,
          tool: toolName,
          success: result.success,
          error: result.error,
        });

        toolResults.push(JSON.stringify({ toolName, result }));
      }

      // Feed all tool results back to the model as a single user message
      // Ollama doesn't have a separate tool_result role in all versions — use user role
      messages.push({
        role: 'tool',
        content: toolResults.join('\n---\n'),
      });
    }

    return {
      success: false,
      summary: 'Maximum iterations reached without completing the task',
      extractedData,
    };
  }

  private async executeTool(
    taskId: string,
    toolName: string,
    input: Record<string, unknown>,
    session: BrowserSession,
    stepNumber: number,
    onEvent: AgentEventCallback,
    onApprovalRequired: ApprovalCallback,
    memory: ShortTermMemory
  ): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      switch (toolName) {
        case 'navigate': {
          const url = String(input['url']);
          const safetyCheck = this.safetyGuard.checkUrl(url);
          if (!safetyCheck.allowed) {
            return { success: false, error: `Safety block: ${safetyCheck.reason}` };
          }
          if (safetyCheck.requiresApproval) {
            const approved = await onApprovalRequired(
              { type: 'navigate', url, description: `Navigate to ${url}` },
              safetyCheck.reason ?? 'Requires approval'
            );
            if (!approved) return { success: false, error: 'User rejected navigation' };
          }
          const waitUntil = (input['waitUntil'] as 'load' | 'domcontentloaded' | 'networkidle') ?? 'domcontentloaded';
          const navResult = await session.navigate(url, waitUntil);
          if (navResult.success) {
            const state = await session.getPageState();
            memory.addState(state, stepNumber);
            const screenshot = await session.takeScreenshot();
            this.emitScreenshot(onEvent, taskId, screenshot, stepNumber);
          }
          return navResult;
        }

        case 'click': {
          const result = await session.click(String(input['selector']), {
            force: String(input['force']) === 'true',
            timeout: input['timeout'] as number | undefined,
          });
          if (result.success) {
            await new Promise((r) => setTimeout(r, 500));
            const screenshot = await session.takeScreenshot();
            this.emitScreenshot(onEvent, taskId, screenshot, stepNumber);
          }
          return result;
        }

        case 'type': {
          return session.type(String(input['selector']), String(input['text']), {
            clearFirst: String(input['clearFirst']) !== 'false',
            pressEnterAfter: String(input['pressEnterAfter']) === 'true',
          });
        }

        case 'select': {
          return session.select(String(input['selector']), {
            value: input['value'] as string | undefined,
            label: input['label'] as string | undefined,
          });
        }

        case 'hover': {
          return session.hover(String(input['selector']));
        }

        case 'scroll': {
          return session.scroll(
            input['direction'] as 'up' | 'down' | 'left' | 'right',
            (input['amount'] as number | undefined) ?? 500,
            input['selector'] as string | undefined
          );
        }

        case 'key_press': {
          return session.keyPress(String(input['key']), input['selector'] as string | undefined);
        }

        case 'take_screenshot': {
          const screenshot = await session.takeScreenshot({
            fullPage: String(input['fullPage']) === 'true',
          });
          this.emitScreenshot(onEvent, taskId, screenshot, stepNumber);
          return { success: true, data: { screenshotId: screenshot.id, url: screenshot.pageUrl } };
        }

        case 'extract_data': {
          // schema may come as JSON string or object
          let schema: Record<string, unknown>;
          if (typeof input['schema'] === 'string') {
            try {
              schema = JSON.parse(input['schema']) as Record<string, unknown>;
            } catch {
              schema = { data: { description: 'Extract all relevant data' } };
            }
          } else {
            schema = (input['schema'] as Record<string, unknown>) ?? {};
          }
          return session.extractData(schema, String(input['context']), input['selector'] as string | undefined);
        }

        case 'wait_for_element': {
          return session.waitForElement(String(input['selector']), {
            state: input['state'] as 'attached' | 'detached' | 'visible' | 'hidden' | undefined,
            timeout: input['timeout'] as number | undefined,
          });
        }

        case 'get_page_state': {
          const state = await session.getPageState({
            includeText: String(input['includeText']) !== 'false',
            selector: input['selector'] as string | undefined,
          });
          memory.addState(state, stepNumber);
          return { success: true, data: this.stateSerializer.serialize(state) };
        }

        case 'drag_drop': {
          return session.dragDrop(
            String(input['sourceSelector']),
            String(input['targetSelector'])
          );
        }

        case 'open_tab': {
          return { success: true, data: 'New tab opened' };
        }

        case 'close_tab': {
          return { success: true, data: 'Tab closed' };
        }

        case 'request_human_approval': {
          const action: BrowserAction = {
            type: 'human_approval',
            description: String(input['action']),
            requiresApproval: true,
          };
          const approved = await onApprovalRequired(action, String(input['reason']));
          return {
            success: true,
            data: {
              approved,
              message: approved ? 'User approved the action' : 'User rejected the action',
            },
          };
        }

        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error({ toolName, error: err.message }, 'Tool execution error');
      return { success: false, error: err.message };
    }
  }

  private emit(callback: AgentEventCallback, taskId: string, type: WsMessage['type'], payload: unknown): void {
    void callback({ type, taskId, payload, timestamp: new Date().toISOString() });
  }

  private emitScreenshot(callback: AgentEventCallback, taskId: string, screenshot: Screenshot, stepNumber: number): void {
    this.emit(callback, taskId, 'task:screenshot', {
      screenshot: { ...screenshot, stepId: String(stepNumber) },
    });
  }

  private makeLog(level: AgentLog['level'], agent: AgentLog['agent'], message: string): AgentLog {
    return { id: randomUUID(), level, agent, message, timestamp: new Date() };
  }
}
