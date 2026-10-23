import {
  createDefaultListasState,
  hydrateListas,
  LISTAS_STORAGE_KEY,
  serializeListas,
  type ListasProdutosState,
} from "@/lib/domain/listas-produtos";

export type LoadListasResult = {
  state: ListasProdutosState;
  warning?: string;
};

export function loadListasFromStorage(): LoadListasResult {
  if (typeof window === "undefined") {
    return { state: createDefaultListasState() };
  }
  const raw = window.localStorage.getItem(LISTAS_STORAGE_KEY);
  if (raw == null) {
    return { state: createDefaultListasState() };
  }
  const result = hydrateListas(raw);
  if (!result.ok) {
    window.localStorage.removeItem(LISTAS_STORAGE_KEY);
    return { state: createDefaultListasState(), warning: result.reason };
  }
  return { state: result.state };
}

export function saveListasToStorage(state: ListasProdutosState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LISTAS_STORAGE_KEY, serializeListas(state));
}
