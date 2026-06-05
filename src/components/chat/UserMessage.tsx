"use client";

import { useUserStore } from "@/store/userStore";
import type { Message } from "@/types";
import { format } from "date-fns";

interface UserMessageProps {
  message: Message;
}

export function UserMessage({ message }: UserMessageProps) {
  const user = useUserStore((s) => s.user);
  const initial = user?.email?.[0]?.toUpperCase() ?? "U";

  return (
    <div className="flex items-end justify-end gap-3 w-full">
      <div className="flex flex-col items-end gap-1.5 w-full">
        <div
          className="max-w-[75%] rounded-2xl rounded-br-sm bg-blue-600 py-3 shadow-lg shadow-blue-600/20 dark:bg-cyan-300"
          style={{ paddingLeft: "1.25rem", paddingRight: "1.25rem" }}
        >
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white dark:text-slate-950">
            {message.content}
          </p>
        </div>

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground/50 pr-1">
          {format(new Date(message.timestamp), "HH:mm")}
        </span>
      </div>

      <div className="mb-6 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white text-slate-950 ring-2 ring-blue-200 shadow-sm dark:bg-white/[0.12] dark:text-cyan-100 dark:ring-cyan-300/[0.2]">
        <span className="text-xs font-semibold">{initial}</span>
      </div>
    </div>
  );
}
