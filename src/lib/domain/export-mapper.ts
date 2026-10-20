import type { LoteItem, XlsxRow } from "./types";
import { XLSX_HEADERS } from "./types";

export { XLSX_HEADERS };

/** Ordem das chaves alinhada a `XLSX_HEADERS`. */
export const XLSX_COLUMN_KEYS = [
  "solicitante",
  "data",
  "usuario",
  "nome",
  "cpf",
  "endereco",
  "valor",
  "envio",
  "codigoRastreio",
  "correio",
] as const satisfies ReadonlyArray<keyof XlsxRow>;

export function mapLoteToXlsxRows(lote: LoteItem[]): XlsxRow[] {
  return lote.map((item) => ({
    solicitante: item.solicitante,
    data: item.data,
    usuario: item.usuario,
    nome: item.nome,
    cpf: item.cpf,
    endereco: item.endereco,
    valor: item.valor,
    envio: item.envio,
    codigoRastreio: item.codigoRastreio,
    correio: item.correio,
  }));
}
