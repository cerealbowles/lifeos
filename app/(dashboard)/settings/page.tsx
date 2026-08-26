import Link from "next/link";
import { MonitorSmartphone } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { getWeatherConnectionStatus } from "@/lib/weather/service";
import { getConnectionStatus as getCalendarConnectionStatus } from "@/lib/calendar/service";
import { getImmichConnectionStatus } from "@/lib/immich/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeatherForm } from "@/components/settings/weather-form";
import { CalendarForm } from "@/components/settings/calendar-form";
import { SportsForm } from "@/components/settings/sports-form";
import { FeedForm } from "@/components/settings/feed-form";
import { ImmichForm } from "@/components/settings/immich-form";
import { BottomNavForm } from "@/components/settings/bottom-nav-form";
import { NotificationsForm } from "@/components/settings/notifications-form";
import { InstallPwaButton } from "@/components/pwa/install-button";

export default async function SettingsPage() {
  const user = await requireUser();
  const [weatherStatus, calendarStatus, immichStatus] = await Promise.all([
    getWeatherConnectionStatus(user.id),
    getCalendarConnectionStatus(user.id),
    getImmichConnectionStatus(user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">Name</span>
            <span>{user.displayName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">Email</span>
            <span>{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">Timezone</span>
            <span>{user.timezone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">Units</span>
            <span className="capitalize">{user.unitsSystem}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weather</CardTitle>
        </CardHeader>
        <CardContent>
          <WeatherForm isConnected={weatherStatus.connected} locationName={weatherStatus.locationName} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <CalendarForm isConnected={calendarStatus.connected} displayName={calendarStatus.displayName} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sports</CardTitle>
        </CardHeader>
        <CardContent>
          <SportsForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <FeedForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Immich (Moments)</CardTitle>
        </CardHeader>
        <CardContent>
          <ImmichForm
            isConnected={immichStatus.connected}
            instanceUrl={immichStatus.instanceUrl}
            albumId={immichStatus.albumId}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mobile navigation</CardTitle>
        </CardHeader>
        <CardContent>
          <BottomNavForm initialItems={user.bottomNavItems} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationsForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Install app</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Add LifeOS to your home screen for a standalone, full-screen app experience — this button only
            appears when your browser offers it. On iPhone/iPad, use Safari&apos;s Share menu → &quot;Add to
            Home Screen&quot; instead.
          </p>
          <InstallPwaButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ambient Display</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            A sparse, large-type view for a spare tablet or wall display — the clock, weather, what&apos;s
            coming up, and whether anything actually needs attention. Meant to be left open, not browsed.
          </p>
          <Link
            href="/ambient"
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-2 rounded-md border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-800/60"
          >
            <MonitorSmartphone className="h-4 w-4" />
            Open
          </Link>
        </CardContent>
      </Card>

      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Editable profile fields, AI provider configuration, other integrations, and data export land in later
        milestones.
      </p>
    </div>
  );
}
