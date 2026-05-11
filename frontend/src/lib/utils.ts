import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getOriginalFilename(pathOrName: string): string {
  if (!pathOrName) return "";
  
  // 1. Get the base name (remove path)
  const baseName = pathOrName.split(/[/\\]/).pop() || pathOrName;
  
  // 2. Strip UUID prefix if it exists
  // UUID format: 8-4-4-4-12 (36 chars) + '_' (1 char) = 37 chars
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i;
  return baseName.replace(uuidRegex, '');
}
