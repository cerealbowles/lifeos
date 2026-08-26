import type { GrowStage, TrichomeStatus } from "@/lib/db/schema";

export type GrowPlantDTO = {
  id: string;
  strain: string;
  stage: GrowStage;
  datePlanted: string;
  trichomeStatus: TrichomeStatus | null;
  lastCheckedAt: string | null;
  notes: string | null;
  active: boolean;
  immichAlbumId: string | null;
};

export type GrowPlantPhotoDTO = {
  id: string;
  caption: string | null;
  takenAt: string;
  imageUrl: string;
};

export type GrowPlantCheckInDTO = {
  id: string;
  stage: GrowStage | null;
  trichomeStatus: TrichomeStatus | null;
  notes: string | null;
  checkedAt: string;
};
