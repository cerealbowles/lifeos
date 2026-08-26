import type { RecurrenceConfig, RecurrenceType, TaskStatus } from "@/lib/db/schema";

export type TaskDTO = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: "low" | "medium" | "high" | null;
  category: string | null;
  dueAt: string | null;
};

export type RoutineDTO = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  recurrenceType: RecurrenceType;
  recurrenceConfig: RecurrenceConfig;
  nextDueAt: string | null;
  lastCompletedAt: string | null;
};
