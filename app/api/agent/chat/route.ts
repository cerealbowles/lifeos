import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrNull } from "@/lib/auth/guards";
import { createConversation, getConversation } from "@/lib/agent/service";
import { runAgentTurn } from "@/lib/agent/agent";

const chatSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  conversationId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  let conversationId = parsed.data.conversationId;
  if (conversationId) {
    const existing = await getConversation(user.id, conversationId);
    if (!existing) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  } else {
    const conversation = await createConversation(user.id, parsed.data.message);
    conversationId = conversation.id;
  }

  const { reply, toolsUsed } = await runAgentTurn(user, conversationId, parsed.data.message);

  return NextResponse.json({ conversationId, reply, toolsUsed });
}
