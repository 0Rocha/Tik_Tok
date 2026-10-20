import type { ApiFields } from "./types";

export type NormalizeResult =
  | { ok: true; value: ApiFields; incomplete: boolean }
  | { ok: false; error: string };

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Monta endereço único a partir do objeto da LuciLuci.
 * Ex.: "Rua X, 123, Apto 4 - Centro - Cidade/SP - 12345-678"
 */
export function composeEndereco(endereco: unknown): string {
  if (typeof endereco === "string") {
    return endereco.trim();
  }
  if (typeof endereco !== "object" || endereco === null || Array.isArray(endereco)) {
    return "";
  }
  const e = endereco as Record<string, unknown>;
  const logradouro = asTrimmedString(e.endereco);
  const numero = asTrimmedString(e.numero);
  const complemento = asTrimmedString(e.complemento);
  const bairro = asTrimmedString(e.bairro);
  const cidade = asTrimmedString(e.cidade);
  const estado = asTrimmedString(e.estado);
  const cep = asTrimmedString(e.cep);

  const linha1 = [logradouro, numero, complemento].filter(Boolean).join(", ");
  const cidadeUf =
    cidade && estado ? `${cidade}/${estado}` : cidade || estado || "";
  const parts = [linha1, bairro, cidadeUf, cep].filter(Boolean);
  return parts.join(" - ");
}

/**
 * Mapeia a resposta real do getUser:
 * - usuario, nome
 * - cpf ← `cpf` (PF) ou fallback `cnpj` (PJ / alguns DISTRIBUIDOR)
 * - endereco ← objeto composto
 */
export function normalizeGetUser(payload: unknown): NormalizeResult {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { ok: false, error: "Resposta inválida da API." };
  }
  const record = payload as Record<string, unknown>;
  const usuario = asTrimmedString(record.usuario);
  if (!usuario) {
    return { ok: false, error: "Resposta incompleta: campo usuario ausente." };
  }

  const nome = asTrimmedString(record.nome);
  const cpf =
    asTrimmedString(record.cpf) || asTrimmedString(record.cnpj);
  const endereco = composeEndereco(record.endereco);
  const incomplete = !nome || !endereco || !cpf;

  return {
    ok: true,
    value: { usuario, nome, cpf, endereco },
    incomplete,
  };
}
