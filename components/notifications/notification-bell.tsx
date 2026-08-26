"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { NotificationDTO } from "@/lib/notifications/types";

/**
 * A small unread dot, not a numeric count badge — DECISIONS.md ADR-043 ruled out
 * unread-count-style chips as the primary attention mechanic; this is the same restraint
 * Life Pulse's dot already established, applied to notifications. Uses the same amber "due"
 * badge color Feed's "New" badge uses, not the accent blue — ADR-090 left Life Pulse's dot as
 * the app's one remaining solid accent fill on purpose.
 */
export function NotificationBell({ className, align = "right" }: { className?: string; align?: "left" | "right" }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<{ notifications: NotificationDTO[]; unreadCount: number }>("/api/notifications"),
    refetchInterval: 60_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/notifications/${id}`, { method: "PATCH" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => apiFetch("/api/notifications/read-all", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  function openNotification(notification: NotificationDTO) {
    if (!notification.readAt) markRead.mutate(notification.id);
    setOpen(false);
    if (notification.url) router.push(notification.url);
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
      >
        <Bell className="h-5 w-5" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} role="presentation" />
          <div
            className={cn(
              "absolute z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900",
              align === "right" ? "right-0" : "left-0",
            )}
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 dark:border-neutral-800">
              <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Notifications
              </span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead.mutate()}
                  className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                >
                  <Check className="h-3 w-3" />
                  Mark all read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-neutral-400">Nothing here.</p>
            ) : (
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openNotification(n)}
                      className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    >
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        {!n.readAt && (
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500 dark:bg-amber-400" />
                        )}
                        {n.title}
                      </span>
                      {n.body && <span className="text-xs text-neutral-500 dark:text-neutral-400">{n.body}</span>}
                      <span className="text-[11px] text-neutral-400">{new Date(n.createdAt).toLocaleString()}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
