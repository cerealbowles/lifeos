import "server-only";

import { OllamaProvider } from "./ollama";
import type { ModelProvider } from "./interface";

export * from "./interface";

/**
 * Only Ollama is implemented so far. AI_PROVIDER exists as a switch point for adding
 * another adapter later (e.g. an OpenAI-compatible one) without touching callers —
 * see DECISIONS.md ADR-004.
 */
export function getModelProvider(): ModelProvider {
  const provider = process.env.AI_PROVIDER ?? "ollama";

  switch (provider) {
    case "ollama": {
      const baseUrl = process.env.AI_BASE_URL ?? "http://localhost:11434";
      const model = process.env.AI_MODEL ?? "llama3.2:3b";
      return new OllamaProvider(baseUrl, model);
    }
    default:
      throw new Error(`Unknown AI_PROVIDER "${provider}"`);
  }
}
