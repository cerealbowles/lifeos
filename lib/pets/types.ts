import type { PetEventType, RecurrenceConfig } from "@/lib/db/schema";

export type PetDTO = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  birthDate: string | null;
  /** False once retired (DECISIONS.md) — still shown in /pets, just marked inactive. */
  active: boolean;
};

export type PetEventDTO = {
  id: string;
  petId: string;
  eventType: PetEventType;
  title: string;
  scheduledAt: string | null;
  completedAt: string | null;
  notes: string | null;
  recurrenceRule: RecurrenceConfig | null;
};
