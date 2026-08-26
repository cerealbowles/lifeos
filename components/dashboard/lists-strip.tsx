import Link from "next/link";
import { ListChecks, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ListsStrip({ lists }: { lists: Array<{ id: string; name: string; openItemCount: number }> }) {
  if (lists.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle href="/lists">Lists</CardTitle>
      </CardHeader>
      <CardContent className="p-2 pt-0">
        <ul className="flex flex-col">
          {lists.map((list) => (
            <li key={list.id}>
              <Link
                href={`/lists/${list.id}`}
                className="flex items-center gap-3 rounded-lg p-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <ListChecks className="h-4 w-4" />
                </span>
                <span className="flex-1 truncate font-medium">{list.name}</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">{list.openItemCount} items</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300 dark:text-neutral-600" />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
