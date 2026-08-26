"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AccountDTO } from "@/lib/finance/types";

const ACCOUNT_TYPES = ["credit_card", "checking", "savings", "loan", "other"] as const;

export function NewAccountForm() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState<(typeof ACCOUNT_TYPES)[number]>("credit_card");
  const [lastFour, setLastFour] = useState("");
  const [statementCloseDay, setStatementCloseDay] = useState("");

  const mutation = useMutation<{ account: AccountDTO }, ApiError>({
    mutationFn: () =>
      apiFetch<{ account: AccountDTO }>("/api/finance/accounts", {
        method: "POST",
        body: JSON.stringify({
          name,
          accountType,
          lastFour: lastFour || undefined,
          statementCloseDay: statementCloseDay ? Number(statementCloseDay) : undefined,
        }),
      }),
    onSuccess: () => {
      setName("");
      setLastFour("");
      setStatementCloseDay("");
      queryClient.invalidateQueries({ queryKey: ["finance-accounts"] });
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
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Account name" className="max-w-[180px]" />
      <select
        value={accountType}
        onChange={(e) => setAccountType(e.target.value as (typeof ACCOUNT_TYPES)[number])}
        className="h-9 rounded-md border border-neutral-200 bg-transparent px-2 text-sm dark:border-neutral-800"
      >
        {ACCOUNT_TYPES.map((type) => (
          <option key={type} value={type}>
            {type.replace("_", " ")}
          </option>
        ))}
      </select>
      <Input
        value={lastFour}
        onChange={(e) => setLastFour(e.target.value)}
        placeholder="Last 4"
        maxLength={4}
        className="w-20"
      />
      <div className="flex flex-col gap-1">
        <label className="text-xs text-neutral-500 dark:text-neutral-400">Statement closes (day)</label>
        <Input
          type="number"
          min={1}
          max={31}
          value={statementCloseDay}
          onChange={(e) => setStatementCloseDay(e.target.value)}
          placeholder="e.g. 25"
          className="w-24"
        />
      </div>
      <Button type="submit" size="sm" disabled={mutation.isPending || !name.trim()}>
        <Plus className="h-4 w-4" />
        Add account
      </Button>
      {mutation.isError && <p className="w-full text-xs text-red-600">{mutation.error.message}</p>}
    </form>
  );
}
