/** Campos vindos da API LuciLuci (após normalização). CPF interno mapeia `cnpj` da API. */
export type ApiFields = {
  usuario: string;
  nome: string;
  cpf: string;
  endereco: string;
};

/** Campos preenchidos manualmente. Datas em ISO `YYYY-MM-DD`. Valores null = omitidos. */
export type ManualFields = {
  solicitante: string;
  data: string;
  valor: number | null;
  envio: string;
  codigoRastreio: string;
  correio: number | null;
};

/** Item do lote com identidade interna estável. */
export type LoteItem = ApiFields &
  ManualFields & {
    id: string;
  };

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

export const XLSX_HEADERS = [
  "Solicitante",
  "Data",
  "Usuário",
  "Nome",
  "CPF",
  "Endereço",
  "Valor",
  "Envio",
  "Cód. Rastreio",
  "Correio",
] as const;

export type XlsxHeader = (typeof XLSX_HEADERS)[number];

export type XlsxRow = {
  solicitante: string;
  data: string;
  usuario: string;
  nome: string;
  cpf: string;
  endereco: string;
  valor: number | null;
  envio: string;
  codigoRastreio: string;
  correio: number | null;
};

export const LOTE_STORAGE_KEY = "tiktok-envio:lote:v1";
export const LOTE_SCHEMA_VERSION = 2;
