import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { primaryNav, askNav, settingsNav } from "@/lib/nav";

const ALL_LINKS = [...primaryNav, askNav, settingsNav];

/** Full module list — the "browse everything" tier, since the sidebar is hidden on mobile. */
export function EverythingShortcuts() {
  return (
    <Card>
      <CardContent className="p-2">
        <ul className="flex flex-col">
          {ALL_LINKS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg p-2.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                >
                  <Icon className="h-4 w-4 shrink-0 text-neutral-400" />
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300 dark:text-neutral-600" />
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
