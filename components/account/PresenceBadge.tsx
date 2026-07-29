"use client";

import { useEffect, useState } from "react";
import { FriendPresence } from "@/lib/account-types";
import { cn } from "@/lib/utils";

function relativeLastSeen(lastSeen: number | null, now: number) {
  if (!lastSeen) return "Đang offline";
  const elapsedMinutes = Math.max(0, Math.floor((now - lastSeen) / 60_000));
  if (elapsedMinutes < 1) return "Hoạt động vừa xong";
  if (elapsedMinutes < 60) return `Hoạt động ${elapsedMinutes} phút trước`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `Hoạt động ${elapsedHours} giờ trước`;
  return `Hoạt động ${new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(lastSeen)}`;
}

export function PresenceBadge({
  presence,
  className,
}: {
  presence?: FriendPresence;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (presence?.state !== "offline" || !presence.lastSeen) return;
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, [presence?.lastSeen, presence?.state]);

  if (!presence || presence.state === "loading")
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-fg-muted",
          className,
        )}
      >
        <span className="h-2 w-2 animate-pulse rounded-full bg-fg-muted" />
        Đang kiểm tra…
      </span>
    );
  if (presence.state === "unavailable")
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-fg-muted",
          className,
        )}
      >
        <span className="h-2 w-2 rounded-full bg-fg-muted" />
        Không xác định
      </span>
    );
  if (presence.state === "online")
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs text-ok",
          className,
        )}
      >
        <span className="h-2 w-2 rounded-full bg-ok shadow-[0_0_8px_currentColor]" />
        Đang online
      </span>
    );
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-fg-muted",
        className,
      )}
    >
      <span className="h-2 w-2 rounded-full bg-fg-muted" />
      {relativeLastSeen(presence.lastSeen, now)}
    </span>
  );
}
