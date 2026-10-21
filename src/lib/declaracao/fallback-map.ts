import type { LoteParseRow } from "./parse-lote";

export type DeclaracaoDestinatario = {
  nome: string;
  cpf: string;
  fone: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  dataExtenso: string;
};

const MESES = [
  "JANEIRO",
  "FEVEREIRO",
  "MARÇO",
  "ABRIL",
  "MAIO",
  "JUNHO",
  "JULHO",
  "AGOSTO",
  "SETEMBRO",
  "OUTUBRO",
  "NOVEMBRO",
  "DEZEMBRO",
] as const;

export function formatCpf(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 11) return raw.trim();
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatCep(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 8) return raw.trim();
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/** Formato Luci: `logradouro - bairro - cidade/UF - cep` */
export function parseLuciEndereco(endereco: string): {
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
} {
  const raw = endereco.trim();
  const parts = raw.split(/\s+-\s+/);
  if (parts.length >= 4) {
    const cidadeUf = parts[parts.length - 2] ?? "";
    const cep = formatCep(parts[parts.length - 1] ?? "");
    const bairro = (parts[parts.length - 3] ?? "").trim();
    const logradouro = parts.slice(0, parts.length - 3).join(" - ").trim();
    const m = cidadeUf.match(/^(.+?)\/([A-Za-z]{2})$/);
    if (m) {
      return {
        endereco: logradouro,
        bairro,
        cidade: m[1]!.trim(),
        uf: m[2]!.toUpperCase(),
        cep,
      };
    }
  }
  return { endereco: raw, bairro: "", cidade: "", uf: "", cep: "" };
}

/** Endereço Luci já separado em cidade, UF e CEP — não precisa de Gemini. */
export function enderecoNoPadraoLuci(endereco: string): boolean {
  const parsed = parseLuciEndereco(endereco);
  return Boolean(parsed.cidade && parsed.uf && parsed.cep);
}

export function formatDataExtenso(iso: string, now = new Date()): string {
  let y: number;
  let m: number;
  let d: number;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    y = Number(iso.slice(0, 4));
    m = Number(iso.slice(5, 7));
    d = Number(iso.slice(8, 10));
  } else {
    y = now.getFullYear();
    m = now.getMonth() + 1;
    d = now.getDate();
  }
  const mes = MESES[m - 1] ?? "JANEIRO";
  return `CAMBORIÚ, ${String(d).padStart(2, "0")} DE ${mes} DE ${y},`;
}

export function mapLoteRowDeterministic(
  row: LoteParseRow,
  now = new Date(),
): DeclaracaoDestinatario {
  const parsed = parseLuciEndereco(row.endereco);
  const iso = row.data || row.envio || "";
  return {
    nome: row.nome.trim(),
    cpf: formatCpf(row.cpf),
    fone: "",
    endereco: parsed.endereco,
    bairro: parsed.bairro,
    cidade: parsed.cidade,
    uf: parsed.uf,
    cep: parsed.cep,
    dataExtenso: formatDataExtenso(iso, now),
  };
}
