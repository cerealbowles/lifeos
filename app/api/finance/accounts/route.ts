import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrApiToken } from "@/lib/auth/api-token";
import { createAccount, listAccounts } from "@/lib/finance/service";

export async function GET(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const accounts = await listAccounts(user.id, user.timezone);
  return NextResponse.json({ accounts });
}

const createAccountSchema = z.object({
  name: z.string().trim().min(1).max(200),
  accountType: z.string().trim().min(1).max(100),
  institution: z.string().trim().max(200).optional(),
  lastFour: z.string().trim().max(4).optional(),
  statementCloseDay: z.number().int().min(1).max(31).optional(),
});

export async function POST(request: Request) {
  const auth = await requireUserOrApiToken(request);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = auth.user;

  const body = await request.json().catch(() => null);
  const parsed = createAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const account = await createAccount(user.id, user.timezone, parsed.data);
  return NextResponse.json({ account }, { status: 201 });
}
