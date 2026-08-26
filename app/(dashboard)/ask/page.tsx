import { requireUser } from "@/lib/auth/guards";
import { Chat } from "@/components/agent/chat";

export default async function AskPage() {
  await requireUser();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Ask LifeOS</h1>
      <Chat />
    </div>
  );
}
