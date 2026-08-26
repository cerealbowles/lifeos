import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { getPet } from "@/lib/pets/service";
import { PetHeader } from "@/components/pets/pet-header";
import { NewPetEventForm } from "@/components/pets/new-pet-event-form";
import { PetEventsList } from "@/components/pets/pet-events-list";

export default async function PetDetailPage({ params }: PageProps<"/pets/[id]">) {
  const user = await requireUser();
  const { id } = await params;

  const pet = await getPet(user.id, id);
  if (!pet) notFound();

  return (
    <div className="flex flex-col gap-6">
      <PetHeader
        pet={{
          id: pet.id,
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          birthDate: pet.birthDate,
          active: pet.active,
        }}
      />

      {/* Doesn't make sense to schedule future care for a pet that's no longer active. */}
      {pet.active && <NewPetEventForm petId={id} />}
      <PetEventsList petId={id} timezone={user.timezone} />
    </div>
  );
}
