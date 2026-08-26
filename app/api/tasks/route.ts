import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { createTask, listTasks } from "@/lib/tasks/service";
import { TASK_CATEGORIES } from "@/lib/db/schema";

export async function GET(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const tasks = await listTasks(user.id);
  return NextResponse.json({ tasks });
}

const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  dueAt: z.coerce.date().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  category: z.enum(TASK_CATEGORIES).optional(),
});

export async function POST(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const body = await request.json().catch(() => null);
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const task = await createTask(user.id, parsed.data);
  return NextResponse.json({ task }, { status: 201 });
}
