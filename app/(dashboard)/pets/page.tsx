import { requireUser } from "@/lib/auth/guards";
import { NewPetForm } from "@/components/pets/new-pet-form";
import { PetGrid } from "@/components/pets/pet-grid";

export default async function PetsPage() {
  await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Pets</h1>
      <NewPetForm />
      <PetGrid />
    </div>
  );
}
