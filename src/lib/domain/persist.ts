import {
  LOTE_SCHEMA_VERSION,
  type LoteItem,
} from "./types";
import { validateLoteItem } from "./validators";

type StoredPayload = {
  version: number;
  items: LoteItem[];
};

export type HydrateResult =
  | { ok: true; lote: LoteItem[] }
  | { ok: false; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isLoteItemShape(value: unknown): value is LoteItem {
  if (!isRecord(value)) return false;
  const requiredStrings = [
    "id",
    "usuario",
    "nome",
    "cpf",
    "endereco",
    "solicitante",
    "data",
    "envio",
    "codigoRastreio",
  ] as const;
  for (const key of requiredStrings) {
    if (typeof value[key] !== "string") return false;
  }
  if (!isNullableNumber(value.valor) || !isNullableNumber(value.correio)) {
    return false;
  }
  return true;
}

export function serializeLote(lote: LoteItem[]): string {
  const payload: StoredPayload = {
    version: LOTE_SCHEMA_VERSION,
    items: lote,
  };
  return JSON.stringify(payload);
}

export function hydrateLote(raw: string | null | undefined): HydrateResult {
  if (raw == null || raw.trim() === "") {
    return { ok: false, reason: "Sem dados salvos." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "JSON inválido; lote descartado." };
  }
  if (!isRecord(parsed) || parsed.version !== LOTE_SCHEMA_VERSION) {
    return { ok: false, reason: "Schema inválido; lote descartado." };
  }
  if (!Array.isArray(parsed.items)) {
    return { ok: false, reason: "Schema inválido; lote descartado." };
  }
  const lote: LoteItem[] = [];
  for (const entry of parsed.items) {
    if (!isLoteItemShape(entry)) {
      return { ok: false, reason: "Item inválido; lote descartado." };
    }
    const check = validateLoteItem(entry);
    if (!check.ok) {
      return { ok: false, reason: "Item inválido; lote descartado." };
    }
    lote.push(entry);
  }
  return { ok: true, lote };
}
