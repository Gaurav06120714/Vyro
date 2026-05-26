import { Ollama } from 'ollama';
import { PLANNER_SYSTEM_PROMPT, PLANNER_TASK_TEMPLATE } from '@vyro/ai-prompts';
import type { TaskPlan } from '@vyro/shared-types';
import type { Logger } from 'pino';

export interface PlannerConfig {
  ollamaBaseUrl?: string;
  model?: string;
  logger: Logger;
}

/**
 * PlannerAgent uses Ollama (llama3.1:8b) to transform a high-level task instruction
 * into a structured execution plan with goals, subgoals, and estimated steps.
 */
export class PlannerAgent {
  private readonly ollama: Ollama;
  private readonly model: string;
  private readonly logger: Logger;

  constructor(config: PlannerConfig) {
    this.ollama = new Ollama({
      host: config.ollamaBaseUrl ?? process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434',
    });
    this.model = config.model ?? process.env['OLLAMA_MODEL'] ?? 'llama3.1:8b';
    this.logger = config.logger;
  }

  async plan(instruction: string, context?: string): Promise<TaskPlan> {
    this.logger.info({ instruction }, 'Planning task');

    let response;
    try {
      response = await this.ollama.chat({
        model: this.model,
        messages: [
          { role: 'system', content: PLANNER_SYSTEM_PROMPT },
          { role: 'user', content: PLANNER_TASK_TEMPLATE(instruction, context) },
        ],
        stream: false,
        options: {
          temperature: 0.1, // Low temperature for consistent JSON output
        },
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error({ error: err.message }, 'Ollama planner error');
      return this.fallbackPlan(instruction);
    }

    let raw = response.message.content.trim();

    // Strip markdown code blocks if present
    if (raw.startsWith('```')) {
      raw = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
    }

    // Extract JSON if there is surrounding text
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      raw = jsonMatch[0];
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch (err) {
      this.logger.error({ raw, err }, 'Failed to parse planner JSON response');
      return this.fallbackPlan(instruction);
    }

    const plan: TaskPlan = {
      goal: String(parsed['goal'] ?? instruction),
      subgoals: Array.isArray(parsed['subgoals'])
        ? (parsed['subgoals'] as string[])
        : ['Execute the task step by step', 'Verify the result'],
      estimatedSteps: Number(parsed['estimatedSteps'] ?? 10),
      startUrl: typeof parsed['startUrl'] === 'string' && parsed['startUrl'] !== 'null'
        ? parsed['startUrl']
        : null,
      reasoning: String(parsed['reasoning'] ?? ''),
    };

    this.logger.info({ plan }, 'Plan created');
    return plan;
  }

  private fallbackPlan(instruction: string): TaskPlan {
    return {
      goal: instruction,
      subgoals: [
        'Navigate to the relevant website',
        'Execute the task step by step',
        'Verify the result',
      ],
      estimatedSteps: 10,
      startUrl: null,
      reasoning: 'Fallback plan — proceeding with best-effort execution',
    };
  }
}
