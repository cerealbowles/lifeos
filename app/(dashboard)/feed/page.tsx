import { requireUser } from "@/lib/auth/guards";
import { listFeedSubscriptions } from "@/lib/feed/service";
import { getImmichConnectionStatus } from "@/lib/immich/service";
import { FeedTabs } from "@/components/feed/feed-tabs";

export default async function FeedPage() {
  const user = await requireUser();
  const [subscriptions, immichStatus] = await Promise.all([
    listFeedSubscriptions(user.id),
    getImmichConnectionStatus(user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Feed</h1>
      <FeedTabs hasSubscriptions={subscriptions.length > 0} immichConnected={immichStatus.connected} />
    </div>
  );
}
