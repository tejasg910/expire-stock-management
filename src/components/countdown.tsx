"use client";

import { useState, useEffect } from "react";

interface Props {
  target: string | Date;
  className?: string;
}

export function Countdown({ target, className }: Props) {
  const [text, setText] = useState("");

  useEffect(() => {
    function update() {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) { setText("Expired"); return; }
      const mins = Math.floor(diff / 60_000);
      const secs = Math.floor((diff % 60_000) / 1000);
      setText(mins > 0 ? `${mins}m ${secs}s` : `${secs}s`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [target]);

  return <span className={className}>{text}</span>;
}
