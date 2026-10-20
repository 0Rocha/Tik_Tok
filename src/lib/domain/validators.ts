import type { LoteItem, ManualFields, ValidationResult } from "./types";

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const DATE_BR = /^(\d{2})\/(\d{2})\/(\d{4})$/;

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
}

/** Converte `DD/MM/AAAA` → `YYYY-MM-DD`. */
export function parseDateBr(input: string): ParseResult<string> {
  const trimmed = input.trim();
  const match = DATE_BR.exec(trimmed);
  if (!match) {
    return { ok: false, error: "Data inválida. Use DD/MM/AAAA." };
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (!isValidCalendarDate(year, month, day)) {
    return { ok: false, error: "Data inválida. Use DD/MM/AAAA." };
  }
  const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { ok: true, value: iso };
}

/** Converte `YYYY-MM-DD` → `DD/MM/AAAA`. */
export function formatDateBr(iso: string): string {
  if (!iso.trim()) return "";
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

/** Converte valor monetário BR (`12,50` ou `1.234,56`) em number. */
export function parseMoneyBr(input: string): ParseResult<number> {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: "Valor obrigatório." };
  }
  const normalized = trimmed.replace(/\./g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return { ok: false, error: "Valor inválido. Use formato brasileiro, ex.: 12,50." };
  }
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) {
    return { ok: false, error: "Valor inválido." };
  }
  return { ok: true, value };
}

export type ManualInput = {
  solicitante: string;
  data: string;
  valor: string;
  envio: string;
  codigoRastreio: string;
  correio: string;
};

export type ManualParseResult =
  | { ok: true; value: ManualFields }
  | { ok: false; errors: string[] };

export function validateManualFields(input: ManualInput): ManualParseResult {
  const errors: string[] = [];

  const solicitante = input.solicitante.trim();
  const codigoRastreio = input.codigoRastreio.trim();

  let data = "";
  if (input.data.trim()) {
    const parsed = parseDateBr(input.data);
    if (!parsed.ok) errors.push(parsed.error);
    else data = parsed.value;
  }

  let valor: number | null = null;
  if (input.valor.trim()) {
    const parsed = parseMoneyBr(input.valor);
    if (!parsed.ok) errors.push(`Valor: ${parsed.error}`);
    else valor = parsed.value;
  }

  let envio = "";
  if (input.envio.trim()) {
    const parsed = parseDateBr(input.envio);
    if (!parsed.ok) errors.push(`Envio: ${parsed.error}`);
    else envio = parsed.value;
  }

  let correio: number | null = null;
  if (input.correio.trim()) {
    const parsed = parseMoneyBr(input.correio);
    if (!parsed.ok) errors.push(`Correio: ${parsed.error}`);
    else correio = parsed.value;
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      solicitante,
      data,
      valor,
      envio,
      codigoRastreio,
      correio,
    },
  };
}

function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

export function validateLoteItem(item: LoteItem): ValidationResult {
  const errors: string[] = [];
  if (!isNonEmpty(item.usuario)) errors.push("Usuário é obrigatório.");
  if (!isNonEmpty(item.nome)) errors.push("Nome é obrigatório.");
  if (!isNonEmpty(item.endereco)) errors.push("Endereço é obrigatório.");
  if (!isNonEmpty(item.cpf)) errors.push("CPF é obrigatório.");

  if (item.valor != null && (!Number.isFinite(item.valor) || item.valor < 0)) {
    errors.push("Valor inválido.");
  }
  if (item.correio != null && (!Number.isFinite(item.correio) || item.correio < 0)) {
    errors.push("Correio inválido.");
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true };
}
