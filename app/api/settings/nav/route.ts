import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrNull } from "@/lib/auth/guards";
import { updateBottomNavItems, validateBottomNavItems } from "@/lib/settings/service";

const bottomNavItemsSchema = z.object({
  bottomNavItems: z.array(z.string().nullable()).length(4),
});

export async function PATCH(request: Request) {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = bottomNavItemsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  if (!validateBottomNavItems(parsed.data.bottomNavItems)) {
    return NextResponse.json(
      { error: "Choose at least one page, no duplicates, from the available list." },
      { status: 400 },
    );
  }

  await updateBottomNavItems(user.id, parsed.data.bottomNavItems);
  return NextResponse.json({ ok: true });
}
