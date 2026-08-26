import { requireUser } from "@/lib/auth/guards";
import { PlantDetail } from "@/components/grow/plant-detail";

export default async function PlantDetailPage({ params }: PageProps<"/grow/[id]">) {
  await requireUser();
  const { id } = await params;

  return <PlantDetail plantId={id} />;
}
