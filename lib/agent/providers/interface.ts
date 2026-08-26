// LifeOS owns the agent loop, memory, tools, and permissions — the LLM is a replaceable
// dependency behind this interface. See DECISIONS.md ADR-004.

export type ChatRole = "system" | "user" | "assistant" | "tool";

export type ToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type ChatMessage = {
  role: ChatRole;
  content: string;
  /** Present on assistant messages that request tool calls. */
  toolCalls?: ToolCall[];
  /** Present on role: "tool" messages — links the result back to the call that produced it. */
  toolCallId?: string;
  /** Present on role: "tool" messages — which tool this result came from. */
  name?: string;
};

export type ToolParameterSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
};

export type ToolSpec = {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
};

export type ChatResult = {
  message: ChatMessage;
};

export interface ModelProvider {
  chat(params: { messages: ChatMessage[]; tools?: ToolSpec[] }): Promise<ChatResult>;
}

export class ModelProviderError extends Error {}

export class ModelUnavailableError extends ModelProviderError {
  constructor(cause?: unknown) {
    super("The AI model is currently unavailable.");
    if (cause instanceof Error) this.cause = cause;
  }
}
