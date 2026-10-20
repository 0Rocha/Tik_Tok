import { hydrateLote, serializeLote } from "@/lib/domain/persist";
import { LOTE_STORAGE_KEY, type LoteItem } from "@/lib/domain/types";

export type LoadLoteResult =
  | { ok: true; lote: LoteItem[]; warning?: string }
  | { ok: false; lote: LoteItem[]; warning: string };

export function loadLoteFromStorage(): LoadLoteResult {
  if (typeof window === "undefined") {
    return { ok: true, lote: [] };
  }
  const raw = window.localStorage.getItem(LOTE_STORAGE_KEY);
  if (raw == null) {
    return { ok: true, lote: [] };
  }
  const result = hydrateLote(raw);
  if (!result.ok) {
    window.localStorage.removeItem(LOTE_STORAGE_KEY);
    return { ok: false, lote: [], warning: result.reason };
  }
  return { ok: true, lote: result.lote };
}

export function saveLoteToStorage(lote: LoteItem[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOTE_STORAGE_KEY, serializeLote(lote));
}

export function clearLoteStorage(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOTE_STORAGE_KEY);
}
