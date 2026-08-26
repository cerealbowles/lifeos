import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrNull } from "@/lib/auth/guards";
import { addFeedSubscription, listFeedSubscriptions, FeedProviderError } from "@/lib/feed/service";
import { isUniqueViolation } from "@/lib/db/errors";

export async function GET() {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscriptions = await listFeedSubscriptions(user.id);
  return NextResponse.json({ subscriptions });
}

const addSubscriptionSchema = z.object({
  feedUrl: z.string().trim().url().max(2000),
});

export async function POST(request: Request) {
  const user = await requireUserOrNull();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = addSubscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const subscription = await addFeedSubscription(user.id, parsed.data.feedUrl);
    return NextResponse.json({ subscription }, { status: 201 });
  } catch (err) {
    if (err instanceof FeedProviderError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    // Postgres unique_violation — feed already subscribed (feed_subscriptions_user_feed_key).
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: "You're already subscribed to that feed." }, { status: 409 });
    }
    throw err;
  }
}
