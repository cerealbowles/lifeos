import { requireUser } from "@/lib/auth/guards";
import { NewPlantForm } from "@/components/grow/new-plant-form";
import { PlantGrid } from "@/components/grow/plant-grid";

export default async function GrowPage() {
  await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Grow</h1>
      <NewPlantForm />
      <PlantGrid />
    </div>
  );
}
