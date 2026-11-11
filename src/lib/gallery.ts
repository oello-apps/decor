import { GALLERY_KEY, type SavedDesign } from "./decor";

export function loadDesigns(): SavedDesign[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GALLERY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SavedDesign[];
  } catch {
    return [];
  }
}

/** Returns false when the design could not be stored (e.g. localStorage full). */
export function saveDesign(design: SavedDesign): boolean {
  if (typeof window === "undefined") return false;
  try {
    const existing = loadDesigns();
    const next = [design, ...existing].slice(0, 24);
    window.localStorage.setItem(GALLERY_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

export function deleteDesign(id: string): SavedDesign[] {
  const next = loadDesigns().filter((d) => d.id !== id);
  try {
    window.localStorage.setItem(GALLERY_KEY, JSON.stringify(next));
  } catch {
    // Keep the in-memory list even if storage fails.
  }
  return next;
}

export function clearDesigns(): void {
  try {
    window.localStorage.removeItem(GALLERY_KEY);
  } catch {
    // Ignore storage errors on clear.
  }
}
