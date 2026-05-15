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
          className="rounded-2xl rounded-br-sm bg-primary py-3 max-w-[75%] shadow-sm"
          style={{ paddingLeft: "1.25rem", paddingRight: "1.25rem" }}
        >
          <p className="text-sm text-primary-foreground leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>

        {/* Timestamp */}
        <span className="text-xs text-muted-foreground/50 pr-1">
          {format(new Date(message.timestamp), "HH:mm")}
        </span>
      </div>

      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center ring-2 ring-primary/20 mb-6">
        <span className="text-xs font-semibold text-primary">{initial}</span>
      </div>
    </div>
  );
}
