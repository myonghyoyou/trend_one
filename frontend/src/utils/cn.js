import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * clsx로 조건부 클래스를 합치고 tailwind-merge로 Tailwind 충돌 클래스를 정리한다.
 * (예: 호출자가 넘긴 px-4가 기본 px-3.5를 올바르게 덮어씀)
 * @param {...import("clsx").ClassValue} inputs
 * @returns {string}
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
