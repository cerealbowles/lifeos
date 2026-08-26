"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AccountDTO } from "@/lib/finance/types";
import type { ReminderDTO } from "@/lib/finance/types";

export function NewReminderForm() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState(1);
  const [autopay, setAutopay] = useState(false);
  const [financialAccountId, setFinancialAccountId] = useState("");

  const { data: accountsData } = useQuery({
    queryKey: ["finance-accounts"],
    queryFn: () => apiFetch<{ accounts: AccountDTO[] }>("/api/finance/accounts"),
  });
  const accounts = accountsData?.accounts ?? [];

  const mutation = useMutation<{ reminder: ReminderDTO }, ApiError>({
    mutationFn: () =>
      apiFetch<{ reminder: ReminderDTO }>("/api/finance/reminders", {
        method: "POST",
        body: JSON.stringify({
          name,
          amount: amount || undefined,
          dueDay,
          autopay,
          financialAccountId: financialAccountId || undefined,
        }),
      }),
    onSuccess: () => {
      setName("");
      setAmount("");
      setAutopay(false);
      queryClient.invalidateQueries({ queryKey: ["finance-reminders"] });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        mutation.mutate();
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Reminder name (e.g. Chase Sapphire)"
        className="max-w-[200px]"
      />
      {accounts.length > 0 && (
        <select
          value={financialAccountId}
          onChange={(e) => setFinancialAccountId(e.target.value)}
          className="h-9 rounded-md border border-neutral-200 bg-transparent px-2 text-sm dark:border-neutral-800"
        >
          <option value="">No linked account</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      )}
      <Input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
        className="w-24"
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs text-neutral-500 dark:text-neutral-400">Due day</label>
        <Input
          type="number"
          min={1}
          max={31}
          value={dueDay}
          onChange={(e) => setDueDay(Number(e.target.value))}
          className="w-20"
        />
      </div>
      <label className="mb-2 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
        <input type="checkbox" checked={autopay} onChange={(e) => setAutopay(e.target.checked)} />
        Autopay
      </label>
      <Button type="submit" size="sm" disabled={mutation.isPending || !name.trim()}>
        <Plus className="h-4 w-4" />
        Add reminder
      </Button>
      {mutation.isError && <p className="w-full text-xs text-red-600">{mutation.error.message}</p>}
    </form>
  );
}
