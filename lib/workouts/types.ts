export type WorkoutDTO = {
  id: string;
  date: string;
  time: string | null;
  type: string;
  durationMinutes: number;
  outdoor: boolean;
  note: string | null;
  source: string;
};
