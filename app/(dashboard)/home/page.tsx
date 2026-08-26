import { requireUser } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewTaskForm } from "@/components/tasks/new-task-form";
import { TaskList } from "@/components/tasks/task-list";
import { NewRoutineForm } from "@/components/tasks/new-routine-form";
import { RoutineList } from "@/components/tasks/routine-list";

export default async function HomePage() {
  const user = await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Tasks</h1>

      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <NewTaskForm />
          <TaskList timezone={user.timezone} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recurring Routines</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <NewRoutineForm />
          <RoutineList timezone={user.timezone} />
        </CardContent>
      </Card>
    </div>
  );
}
