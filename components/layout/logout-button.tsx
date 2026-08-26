import { LogOut } from "lucide-react";
import { logout } from "@/app/(auth)/login/actions";

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        Sign out
      </button>
    </form>
  );
}
