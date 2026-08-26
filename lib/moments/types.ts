export type LogEntryDTO = {
  id: string;
  caption: string | null;
  location: string | null;
  occurredAt: string;
};

export type MomentDTO = LogEntryDTO & { imageUrl: string };
