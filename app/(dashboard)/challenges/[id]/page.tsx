import { requireUser } from "@/lib/auth/guards";
import { ChallengeDetail } from "@/components/challenges/challenge-detail";

export default async function ChallengeDetailPage({ params }: PageProps<"/challenges/[id]">) {
  await requireUser();
  const { id } = await params;

  return <ChallengeDetail challengeId={id} />;
}
