import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { deleteReminder, updateReminder } from "@/lib/finance/service";

const updateReminderSchema = z.object({
  financialAccountId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200).optional(),
  amount: z.string().trim().max(20).optional(),
  dueDay: z.number().int().min(1).max(31).optional(),
  autopay: z.boolean().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function PATCH(request: Request, ctx: RouteContext<"/api/finance/reminders/[id]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = updateReminderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const reminder = await updateReminder(user.id, id, user.timezone, parsed.data);
  if (!reminder) return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
  return NextResponse.json({ reminder });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/finance/reminders/[id]">) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const { id } = await ctx.params;
  await deleteReminder(user.id, id);
  return new NextResponse(null, { status: 204 });
}
