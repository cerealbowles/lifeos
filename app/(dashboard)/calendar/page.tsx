import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { getConnectionStatus } from "@/lib/calendar/service";
import { NewEventForm } from "@/components/calendar/new-event-form";
import { CalendarView } from "@/components/calendar/calendar-view";

export default async function CalendarPage() {
  const user = await requireUser();
  const status = await getConnectionStatus(user.id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Calendar</h1>

      {!status.connected && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Not connected to iCloud yet — manually-added events below still work.{" "}
          <Link href="/settings" className="underline">
            Connect in Settings
          </Link>{" "}
          to sync your iPhone&apos;s calendars automatically.
        </p>
      )}

      <NewEventForm />
      <CalendarView />
    </div>
  );
}
