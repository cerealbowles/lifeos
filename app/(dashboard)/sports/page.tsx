import { requireUser } from "@/lib/auth/guards";
import { GamesList } from "@/components/sports/games-list";

export default async function SportsPage() {
  await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Sports</h1>
      <GamesList />
    </div>
  );
}
