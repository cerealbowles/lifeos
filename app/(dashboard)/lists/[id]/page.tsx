import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { getListWithItems } from "@/lib/lists/service";
import { ListHeader } from "@/components/lists/list-header";
import { ListItems } from "@/components/lists/list-items";

export default async function ListDetailPage({ params }: PageProps<"/lists/[id]">) {
  const user = await requireUser();
  const { id } = await params;

  const result = await getListWithItems(user.id, id);
  if (!result) notFound();

  return (
    <div className="flex flex-col gap-6">
      <ListHeader list={{ id: result.list.id, name: result.list.name, listType: result.list.listType }} />
      <ListItems listId={id} />
    </div>
  );
}
