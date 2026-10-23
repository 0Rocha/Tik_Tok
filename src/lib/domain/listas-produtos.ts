export type ProdutoItem = {
  quantidade: number;
  nome: string;
  valor: number;
};

export type ListaProdutos = {
  id: string;
  nome: string;
  itens: ProdutoItem[];
};

export type ListasProdutosState = {
  listas: ListaProdutos[];
  selecionadaId: string | null;
};

export const LISTAS_STORAGE_KEY = "tiktok-envio:listas-produtos:v1";
export const LISTAS_SCHEMA_VERSION = 1;
export const MAX_PRODUTOS_POR_LISTA = 12;

export const PRODUTOS_PADRAO: readonly ProdutoItem[] = [
  { quantidade: 1, nome: "Luva de Silicone", valor: 14.5 },
  { quantidade: 1, nome: "Vitae Black White", valor: 19 },
  { quantidade: 1, nome: "Dermo Skin", valor: 22.5 },
  { quantidade: 1, nome: "Escova Dental Infantil", valor: 29.9 },
  { quantidade: 1, nome: "Sweet Hot", valor: 33 },
  { quantidade: 1, nome: "VelvetKiss (Maçã Verde + Moranguinho)", valor: 66 },
  { quantidade: 1, nome: "Fine Fragrance (M52 + F39)", valor: 49 },
  { quantidade: 1, nome: "Amostra 6ml Soleil Noir", valor: 9.9 },
  { quantidade: 1, nome: "Amostra 6ml F49", valor: 9.9 },
  { quantidade: 1, nome: "Amostra 6ml F57", valor: 9.9 },
  { quantidade: 1, nome: "Amostra 6ml M84", valor: 9.9 },
  { quantidade: 1, nome: "Amostra 6ml Sweet Like Girl", valor: 9.9 },
];

type StoredPayload = {
  version: number;
  listas: ListaProdutos[];
  selecionadaId: string | null;
};

export type HydrateListasResult =
  | { ok: true; state: ListasProdutosState }
  | { ok: false; reason: string };

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function somaValores(itens: readonly { valor: number }[]): number {
  const cents = itens.reduce(
    (acc, item) => acc + Math.round(item.valor * 100),
    0,
  );
  return cents / 100;
}

/** Valor impresso na coluna VALOR e no total: `R$ 14,50`. */
export function formatValorDeclaracao(valor: number): string {
  return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

export function createListaAtual(): ListaProdutos {
  return {
    id: "lista-atual",
    nome: "Lista atual",
    itens: PRODUTOS_PADRAO.map((item) => ({ ...item })),
  };
}

export function createDefaultListasState(): ListasProdutosState {
  const lista = createListaAtual();
  return { listas: [lista], selecionadaId: lista.id };
}

export function createLista(nome = "Nova lista"): ListaProdutos {
  return {
    id: newId(),
    nome,
    itens: [{ quantidade: 1, nome: "", valor: 0 }],
  };
}

function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isValor(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * Lista que vai para a declaração. Nome em branco é permitido no rascunho
 * salvo no navegador, e recusado aqui na hora de enviar.
 */
export function parseProdutos(value: unknown): ProdutoItem[] {
  if (!Array.isArray(value)) {
    throw new Error("produtos deve ser uma lista.");
  }
  if (value.length < 1 || value.length > MAX_PRODUTOS_POR_LISTA) {
    throw new Error("Informe de 1 a 12 produtos.");
  }

  return value.map((entry, index) => {
    const n = index + 1;
    if (!isRecord(entry)) {
      throw new Error(`Produto ${n}: dados inválidos.`);
    }
    if (typeof entry.nome !== "string" || !entry.nome.trim()) {
      throw new Error(`Produto ${n}: nome é obrigatório.`);
    }
    if (!isPositiveInt(entry.quantidade)) {
      throw new Error(
        `Produto ${n}: quantidade deve ser um inteiro maior que zero.`,
      );
    }
    if (!isValor(entry.valor)) {
      throw new Error(
        `Produto ${n}: valor deve ser um número maior ou igual a zero.`,
      );
    }
    return {
      quantidade: entry.quantidade,
      nome: entry.nome.trim(),
      valor: entry.valor,
    };
  });
}

export function produtosSelecionados(
  state: ListasProdutosState,
): { ok: true; produtos: ProdutoItem[] } | { ok: false; error: string } {
  if (!state.selecionadaId) {
    return {
      ok: false,
      error: "Marque a lista de produtos que será enviada.",
    };
  }
  const lista = state.listas.find((item) => item.id === state.selecionadaId);
  if (!lista) {
    return {
      ok: false,
      error: "Marque a lista de produtos que será enviada.",
    };
  }
  try {
    return { ok: true, produtos: parseProdutos(lista.itens) };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Lista de produtos inválida.";
    return { ok: false, error: message };
  }
}

function isDraftItem(value: unknown): value is ProdutoItem {
  if (!isRecord(value)) return false;
  return (
    isPositiveInt(value.quantidade) &&
    typeof value.nome === "string" &&
    isValor(value.valor)
  );
}

function isListaShape(value: unknown): value is ListaProdutos {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || !value.id.trim()) return false;
  if (typeof value.nome !== "string") return false;
  if (!Array.isArray(value.itens) || value.itens.length > MAX_PRODUTOS_POR_LISTA) {
    return false;
  }
  return value.itens.every(isDraftItem);
}

export function serializeListas(state: ListasProdutosState): string {
  const payload: StoredPayload = {
    version: LISTAS_SCHEMA_VERSION,
    listas: state.listas,
    selecionadaId: state.selecionadaId,
  };
  return JSON.stringify(payload);
}

export function hydrateListas(
  raw: string | null | undefined,
): HydrateListasResult {
  if (raw == null || raw.trim() === "") {
    return { ok: false, reason: "Sem listas salvas." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "JSON inválido; listas descartadas." };
  }
  if (!isRecord(parsed) || parsed.version !== LISTAS_SCHEMA_VERSION) {
    return { ok: false, reason: "Schema inválido; listas descartadas." };
  }
  if (!Array.isArray(parsed.listas) || !parsed.listas.every(isListaShape)) {
    return { ok: false, reason: "Schema inválido; listas descartadas." };
  }
  if (parsed.selecionadaId !== null && typeof parsed.selecionadaId !== "string") {
    return { ok: false, reason: "Schema inválido; listas descartadas." };
  }

  const listas = parsed.listas;
  const selecionadaId =
    typeof parsed.selecionadaId === "string" &&
    listas.some((lista) => lista.id === parsed.selecionadaId)
      ? parsed.selecionadaId
      : null;

  return { ok: true, state: { listas, selecionadaId } };
}
