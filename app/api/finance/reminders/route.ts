import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { createReminder, listReminders } from "@/lib/finance/service";

export async function GET(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const reminders = await listReminders(user.id, user.timezone);
  return NextResponse.json({ reminders });
}

const createReminderSchema = z.object({
  financialAccountId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  amount: z.string().trim().max(20).optional(),
  dueDay: z.number().int().min(1).max(31),
  autopay: z.boolean().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function POST(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const body = await request.json().catch(() => null);
  const parsed = createReminderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const reminder = await createReminder(user.id, user.timezone, parsed.data);
  return NextResponse.json({ reminder }, { status: 201 });
}
