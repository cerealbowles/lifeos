import { requireUser } from "@/lib/auth/guards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewAccountForm } from "@/components/finance/new-account-form";
import { AccountsList } from "@/components/finance/accounts-list";
import { NewReminderForm } from "@/components/finance/new-reminder-form";
import { RemindersList } from "@/components/finance/reminders-list";

export default async function MoneyPage() {
  const user = await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Money</h1>

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <NewAccountForm />
          <AccountsList timezone={user.timezone} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Reminders</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <NewReminderForm />
          <RemindersList timezone={user.timezone} />
        </CardContent>
      </Card>
    </div>
  );
}
