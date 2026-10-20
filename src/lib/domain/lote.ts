import type { LoteItem } from "./types";

export type LoteDraft = Omit<LoteItem, "id">;

export function createEmptyLote(): LoteItem[] {
  return [];
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function addItem(
  lote: LoteItem[],
  draft: LoteDraft,
): { lote: LoteItem[]; item: LoteItem } {
  const item: LoteItem = { ...draft, id: newId() };
  return { lote: [...lote, item], item };
}

export function updateItem(
  lote: LoteItem[],
  id: string,
  next: LoteItem,
): LoteItem[] {
  return lote.map((item) => (item.id === id ? { ...next, id } : item));
}

export function removeItem(lote: LoteItem[], id: string): LoteItem[] {
  return lote.filter((item) => item.id !== id);
}

/** Retorna usuários já presentes no lote (aviso de duplicidade). */
export function findDuplicateUsuarios(
  lote: LoteItem[],
  usuario: string,
  exceptId?: string,
): string[] {
  const target = usuario.trim().toLowerCase();
  if (!target) return [];
  const hits = lote.filter(
    (item) =>
      item.id !== exceptId && item.usuario.trim().toLowerCase() === target,
  );
  return hits.length > 0 ? [usuario.trim()] : [];
}
