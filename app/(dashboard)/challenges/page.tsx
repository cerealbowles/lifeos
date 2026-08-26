import { requireUser } from "@/lib/auth/guards";
import { NewChallengeForm } from "@/components/challenges/new-challenge-form";
import { ChallengeList } from "@/components/challenges/challenge-list";

export default async function ChallengesPage() {
  await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Challenges</h1>
      <NewChallengeForm />
      <ChallengeList />
    </div>
  );
}
