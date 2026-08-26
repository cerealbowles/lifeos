export type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
};

export type ChatResponse = {
  conversationId: string;
  reply: string;
  toolsUsed: string[];
};
