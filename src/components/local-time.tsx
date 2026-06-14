"use client";

interface Props {
  date: Date | string;
  className?: string;
}

export function LocalTime({ date, className }: Props) {
  return (
    <span className={className}>
      {new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}
