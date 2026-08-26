import { requireUser } from "@/lib/auth/guards";
import { NewListForm } from "@/components/lists/new-list-form";
import { ListGrid } from "@/components/lists/list-grid";

export default async function ListsPage() {
  await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Lists</h1>
      <NewListForm />
      <ListGrid />
    </div>
  );
}
