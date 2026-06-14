import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function makePickupCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function clampPickupWindow(requested: number, providerMax: number, globalMax: number): number {
  return Math.min(requested, providerMax, globalMax);
}
