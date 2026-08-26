"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Send, Sparkles } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ChatTurn, ChatResponse } from "@/lib/agent/types";

const SUGGESTED_PROMPTS = [
  "What's going on today?",
  "What's due in the next two weeks?",
  "When is Milo's next appointment?",
  "What's on my grocery list?",
  "How's the weather looking?",
];

export function Chat() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const mutation = useMutation<ChatResponse, ApiError, string>({
    mutationFn: (message) =>
      apiFetch<ChatResponse>("/api/agent/chat", {
        method: "POST",
        body: JSON.stringify({ message, conversationId }),
      }),
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      setTurns((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: data.reply, toolsUsed: data.toolsUsed },
      ]);
    },
    onError: (err) => {
      setTurns((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: "assistant", content: `Something went wrong: ${err.message}` },
      ]);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, mutation.isPending]);

  function send(message: string) {
    if (!message.trim() || mutation.isPending) return;
    setTurns((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: message }]);
    setInput("");
    mutation.mutate(message);
  }

  return (
    <div className="flex h-[calc(100dvh-8rem)] flex-col md:h-[calc(100dvh-6rem)]">
      <div className="flex-1 overflow-y-auto">
        {turns.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Sparkles className="h-6 w-6" />
            </span>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Ask about your tasks, lists, pets, calendar, weather, or bills.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
                  className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800/60"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pb-4">
            {turns.map((turn) => (
              <div key={turn.id} className={cn("flex", turn.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                    turn.role === "user"
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                      : "bg-neutral-100 dark:bg-neutral-800",
                  )}
                >
                  <p className="whitespace-pre-wrap">{turn.content}</p>
                  {turn.toolsUsed && turn.toolsUsed.length > 0 && (
                    <p className="mt-1.5 text-xs text-neutral-400 dark:text-neutral-500">
                      Used: {[...new Set(turn.toolsUsed)].join(", ")}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {mutation.isPending && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl bg-neutral-100 px-4 py-2 text-sm text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
                  Thinking…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask LifeOS…"
          disabled={mutation.isPending}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={mutation.isPending || !input.trim()} aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
