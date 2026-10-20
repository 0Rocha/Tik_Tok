import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  formatCep,
  formatCpf,
  formatDataExtenso,
  mapLoteRowDeterministic,
  type DeclaracaoDestinatario,
} from "./fallback-map";
import type { LoteParseRow } from "./parse-lote";

const SYSTEM = `Você organiza dados de um lote de envio para preencher uma Declaração de Conteúdo dos Correios.
Retorne APENAS um JSON válido (sem markdown) com as chaves:
nome, cpf, fone, endereco, bairro, cidade, uf, cep, dataExtenso.

Regras:
- Não invente produtos, remetente nem telefone. Se não houver telefone, use "".
- Separe o endereço composto (padrão: logradouro - bairro - cidade/UF - cep).
- CPF no formato 000.000.000-00; CEP 00000-000; UF com 2 letras.
- dataExtenso no formato: CAMBORIÚ, DD DE MÊS DE AAAA,
- Use Data do lote; se vazia, use Envio; se ambas vazias, use a data de hoje em Camboriú.
- Preserve acentos e maiúsculas razoáveis nos nomes.`;

function getModelName(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
}

function normalizeMapped(
  raw: Partial<DeclaracaoDestinatario>,
  fallback: DeclaracaoDestinatario,
): DeclaracaoDestinatario {
  return {
    nome: (raw.nome ?? fallback.nome).trim() || fallback.nome,
    cpf: formatCpf((raw.cpf ?? fallback.cpf).trim() || fallback.cpf),
    fone: "",
    endereco: (raw.endereco ?? fallback.endereco).trim() || fallback.endereco,
    bairro: (raw.bairro ?? fallback.bairro).trim(),
    cidade: (raw.cidade ?? fallback.cidade).trim(),
    uf: ((raw.uf ?? fallback.uf).trim() || fallback.uf).toUpperCase().slice(0, 2),
    cep: formatCep((raw.cep ?? fallback.cep).trim() || fallback.cep),
    dataExtenso:
      (raw.dataExtenso ?? "").trim() ||
      fallback.dataExtenso ||
      formatDataExtenso(""),
  };
}

function parseJsonResponse(text: string): Partial<DeclaracaoDestinatario> {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new Error("Resposta Gemini sem JSON.");
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as Partial<DeclaracaoDestinatario>;
}

export async function mapLoteRowWithGemini(
  row: LoteParseRow,
  options?: { apiKey?: string; now?: Date },
): Promise<DeclaracaoDestinatario> {
  const fallback = mapLoteRowDeterministic(row, options?.now);
  const apiKey = options?.apiKey ?? process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada no servidor.");
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: getModelName(),
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    const prompt = `${SYSTEM}

Linha do lote:
${JSON.stringify(
  {
    nome: row.nome,
    cpf: row.cpf,
    endereco: row.endereco,
    data: row.data,
    envio: row.envio,
    usuario: row.usuario,
  },
  null,
  2,
)}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = parseJsonResponse(text);
    return normalizeMapped(parsed, fallback);
  } catch (err) {
    // Fallback determinístico se a API falhar nesta linha
    if (err instanceof Error && /GEMINI_API_KEY/.test(err.message)) {
      throw err;
    }
    console.warn(
      "[declaracao] Gemini falhou; usando fallback determinístico:",
      err instanceof Error ? err.message : err,
    );
    return fallback;
  }
}

export async function mapLoteRowsWithGemini(
  rows: LoteParseRow[],
  options?: {
    apiKey?: string;
    now?: Date;
    onProgress?: (done: number, total: number) => void;
  },
): Promise<DeclaracaoDestinatario[]> {
  const out: DeclaracaoDestinatario[] = [];
  for (let i = 0; i < rows.length; i++) {
    out.push(await mapLoteRowWithGemini(rows[i]!, options));
    options?.onProgress?.(i + 1, rows.length);
  }
  return out;
}
