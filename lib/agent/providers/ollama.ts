import "server-only";

import {
  ModelUnavailableError,
  type ChatMessage,
  type ChatResult,
  type ModelProvider,
  type ToolCall,
  type ToolSpec,
} from "./interface";

// CPU-only local inference is slow, and varies a lot by hardware — on an older CPU without
// AVX2, a single cold-start call (model load + no prompt cache) can genuinely take several
// minutes, not just tens of seconds. Bumped from 120s to 300s after a real deployment on
// modest hardware (Intel i5-3570, no AVX2) hit the old timeout while a request was still
// legitimately being processed by Ollama, not actually stuck. See DECISIONS.md.
const REQUEST_TIMEOUT_MS = 300_000;

type OllamaWireMessage = {
  role: string;
  content: string;
  tool_calls?: Array<{ id?: string; function: { name: string; arguments: Record<string, unknown> } }>;
};

type OllamaChatResponse = {
  message: OllamaWireMessage;
  done: boolean;
};

export class OllamaProvider implements ModelProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
  ) {}

  async chat({ messages, tools }: { messages: ChatMessage[]; tools?: ToolSpec[] }): Promise<ChatResult> {
    const body = {
      model: this.model,
      messages: messages.map(toWireMessage),
      tools: tools?.map(toWireTool),
      stream: false,
    };

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err) {
      throw new ModelUnavailableError(err);
    }

    if (!res.ok) {
      throw new ModelUnavailableError(new Error(`Ollama returned ${res.status}: ${await res.text()}`));
    }

    const data = (await res.json()) as OllamaChatResponse;
    return { message: fromWireMessage(data.message) };
  }
}

function toWireMessage(msg: ChatMessage): OllamaWireMessage {
  if (msg.toolCalls?.length) {
    return {
      role: msg.role,
      content: msg.content,
      tool_calls: msg.toolCalls.map((tc) => ({
        id: tc.id,
        function: { name: tc.name, arguments: tc.arguments },
      })),
    };
  }
  return { role: msg.role, content: msg.content };
}

function toWireTool(tool: ToolSpec) {
  return {
    type: "function" as const,
    function: { name: tool.name, description: tool.description, parameters: tool.parameters },
  };
}

function fromWireMessage(message: OllamaWireMessage): ChatMessage {
  const toolCalls: ToolCall[] | undefined = message.tool_calls?.map((tc, i) => ({
    id: tc.id ?? `call_${i}`,
    name: tc.function.name,
    arguments: tc.function.arguments ?? {},
  }));

  return {
    role: "assistant",
    content: message.content ?? "",
    toolCalls,
  };
}
