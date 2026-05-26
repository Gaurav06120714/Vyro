/**
 * Browser tool definitions in Ollama/OpenAI-compatible format.
 * These are passed to ollama.chat() as the `tools` parameter.
 * Ollama supports the same JSON schema as OpenAI tool-calling.
 */

export interface OllamaToolParameter {
  type: string;
  description: string;
  enum?: string[];
  default?: unknown;
}

export interface OllamaTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, OllamaToolParameter>;
      required: string[];
    };
  };
}

export const browserTools: OllamaTool[] = [
  {
    type: 'function',
    function: {
      name: 'navigate',
      description:
        'Navigate the browser to a specific URL. Use this to load web pages, follow links, or go to known URLs. Always include the full URL with protocol (https://).',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description:
              'The full URL to navigate to, including protocol (e.g., https://example.com)',
          },
          waitUntil: {
            type: 'string',
            enum: ['load', 'domcontentloaded', 'networkidle'],
            description:
              'When to consider navigation complete. Use "networkidle" for SPAs, "domcontentloaded" for faster navigation.',
            default: 'domcontentloaded',
          },
        },
        required: ['url'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'click',
      description:
        'Click on an element identified by a CSS or ARIA selector. Use for buttons, links, checkboxes, radio buttons, and any clickable element.',
      parameters: {
        type: 'object',
        properties: {
          selector: {
            type: 'string',
            description:
              'CSS or ARIA selector for the element to click. Prefer aria-label, role, data-testid, or semantic attributes over generic classes.',
          },
          description: {
            type: 'string',
            description: 'Human-readable description of what is being clicked (for logging)',
          },
          timeout: {
            type: 'number',
            description: 'Maximum time in ms to wait for the element to be clickable. Default 10000.',
          },
          force: {
            type: 'string',
            description:
              'Set to "true" to force click even if element is not visible. Use with caution.',
            default: 'false',
          },
        },
        required: ['selector', 'description'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'type',
      description:
        'Type text into an input field, textarea, or contenteditable element. Clears the field first before typing. Use for search boxes, forms, and text editors.',
      parameters: {
        type: 'object',
        properties: {
          selector: {
            type: 'string',
            description: 'CSS or ARIA selector for the input element',
          },
          text: {
            type: 'string',
            description: 'The text to type into the element',
          },
          description: {
            type: 'string',
            description: 'Human-readable description of what is being typed (for logging)',
          },
          clearFirst: {
            type: 'string',
            description: 'Set to "false" to append instead of replacing. Default "true".',
            default: 'true',
          },
          pressEnterAfter: {
            type: 'string',
            description:
              'Set to "true" to press Enter key after typing (useful for search fields). Default "false".',
            default: 'false',
          },
        },
        required: ['selector', 'text', 'description'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'select',
      description: 'Select an option from a <select> dropdown element by value or label.',
      parameters: {
        type: 'object',
        properties: {
          selector: {
            type: 'string',
            description: 'CSS selector for the <select> element',
          },
          value: {
            type: 'string',
            description: 'The option value attribute to select',
          },
          label: {
            type: 'string',
            description: 'The visible option text to select (used if value not provided)',
          },
          description: {
            type: 'string',
            description: 'Human-readable description of the selection',
          },
        },
        required: ['selector', 'description'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'hover',
      description:
        'Hover the mouse over an element to reveal tooltips, dropdown menus, or trigger hover states.',
      parameters: {
        type: 'object',
        properties: {
          selector: {
            type: 'string',
            description: 'CSS or ARIA selector for the element to hover over',
          },
          description: {
            type: 'string',
            description: 'Human-readable description of why hovering',
          },
        },
        required: ['selector', 'description'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'scroll',
      description:
        'Scroll the page or a specific scrollable container. Use to reveal more content, reach elements below the fold, or navigate infinite scroll pages.',
      parameters: {
        type: 'object',
        properties: {
          direction: {
            type: 'string',
            enum: ['up', 'down', 'left', 'right'],
            description: 'Direction to scroll',
          },
          amount: {
            type: 'number',
            description: 'Number of pixels to scroll. Default 500.',
            default: 500,
          },
          selector: {
            type: 'string',
            description:
              'Optional CSS selector for a specific scrollable container. If omitted, scrolls the main page.',
          },
        },
        required: ['direction'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'key_press',
      description:
        'Press a keyboard key or key combination. Useful for pressing Enter, Escape, Tab, arrow keys, or shortcuts like Ctrl+A.',
      parameters: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description:
              'Key or key combination to press. Examples: "Enter", "Escape", "Tab", "ArrowDown", "Control+A", "Meta+K"',
          },
          selector: {
            type: 'string',
            description:
              'Optional CSS selector for element to focus before pressing key. If omitted, sends keypress to the active element.',
          },
          description: {
            type: 'string',
            description: 'Human-readable description of why this key is being pressed',
          },
        },
        required: ['key', 'description'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'take_screenshot',
      description:
        'Capture a screenshot of the current browser viewport. Always take a screenshot after navigating to a new page or when uncertain about the current state.',
      parameters: {
        type: 'object',
        properties: {
          fullPage: {
            type: 'string',
            description:
              'Set to "true" to capture the full scrollable page height. Default "false" (viewport only).',
            default: 'false',
          },
          description: {
            type: 'string',
            description: 'Reason for taking the screenshot',
          },
        },
        required: ['description'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'extract_data',
      description:
        'Extract structured data from the current page. Use for scraping product listings, article content, search results, tables, contact information, and any structured information.',
      parameters: {
        type: 'object',
        properties: {
          schema: {
            type: 'string',
            description:
              'JSON string describing the structure of data to extract. Each key is a field name with description of what to extract.',
          },
          context: {
            type: 'string',
            description: 'Additional context about what data you are looking for',
          },
          selector: {
            type: 'string',
            description:
              'Optional CSS selector to scope extraction to a specific page region (e.g., a table, list, or article)',
          },
        },
        required: ['schema', 'context'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'wait_for_element',
      description:
        'Wait for a CSS selector to appear in the DOM. Use after triggering an action that causes dynamic content to load.',
      parameters: {
        type: 'object',
        properties: {
          selector: {
            type: 'string',
            description: 'CSS selector to wait for',
          },
          state: {
            type: 'string',
            enum: ['attached', 'detached', 'visible', 'hidden'],
            description:
              'The state to wait for. "visible" (default) is most common — element exists and is not hidden.',
            default: 'visible',
          },
          timeout: {
            type: 'number',
            description: 'Maximum milliseconds to wait. Default 15000.',
            default: 15000,
          },
          description: {
            type: 'string',
            description: 'What you are waiting for (for logging)',
          },
        },
        required: ['selector', 'description'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'get_page_state',
      description:
        'Get the current page state: URL, title, all interactive elements (buttons, inputs, links), visible text, forms, and any detected modals or CAPTCHAs. Call this whenever you need to understand what is currently on the screen.',
      parameters: {
        type: 'object',
        properties: {
          includeText: {
            type: 'string',
            description:
              'Set to "false" to skip the full visible text content. Default "true".',
            default: 'true',
          },
          selector: {
            type: 'string',
            description:
              'Optional CSS selector to limit state capture to a specific section of the page',
          },
        },
        required: [],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'open_tab',
      description: 'Open a new browser tab, optionally navigating to a URL.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'Optional URL to open in the new tab',
          },
          description: {
            type: 'string',
            description: 'Reason for opening a new tab',
          },
        },
        required: ['description'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'close_tab',
      description: 'Close the current browser tab and return to the previous tab.',
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'Reason for closing this tab',
          },
        },
        required: ['description'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'drag_drop',
      description:
        'Drag an element from one position and drop it onto another element. Useful for reordering lists, drag-and-drop file uploads, and UI manipulation.',
      parameters: {
        type: 'object',
        properties: {
          sourceSelector: {
            type: 'string',
            description: 'CSS selector for the element to drag',
          },
          targetSelector: {
            type: 'string',
            description: 'CSS selector for the drop target element',
          },
          description: {
            type: 'string',
            description: 'What is being dragged and where',
          },
        },
        required: ['sourceSelector', 'targetSelector', 'description'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'request_human_approval',
      description:
        'REQUIRED for sensitive or irreversible actions. Pause execution and ask the human to review and approve an action before it is taken. Always call this before: sending messages/emails, making purchases, modifying accounts, deleting data, or any other potentially harmful or irreversible action.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'Clear description of the action about to be taken',
          },
          reason: {
            type: 'string',
            description: 'Why this action requires human approval (what makes it sensitive/risky)',
          },
          impact: {
            type: 'string',
            description: 'What will happen if approved. What will NOT happen if rejected.',
          },
          urgency: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: 'Urgency level. Use "high" only when a timeout could cause task failure.',
            default: 'medium',
          },
        },
        required: ['action', 'reason', 'impact'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'done',
      description:
        'Signal that the task is complete. Call this when you have finished all required steps and collected all requested information. Provide a comprehensive summary of what was accomplished.',
      parameters: {
        type: 'object',
        properties: {
          summary: {
            type: 'string',
            description: 'Comprehensive summary of what was accomplished',
          },
          success: {
            type: 'string',
            description: 'Set to "true" if the task succeeded, "false" if it partially failed.',
            default: 'true',
          },
          extractedData: {
            type: 'string',
            description: 'JSON string of any structured data extracted during the task',
          },
        },
        required: ['summary'],
      },
    },
  },
];

export type BrowserToolName = (typeof browserTools)[number]['function']['name'];
