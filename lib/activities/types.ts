export type ActivitySessionDTO = {
  id: string;
  activityType: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
};
