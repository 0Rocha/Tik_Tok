"use client";

import { useEffect, useState } from "react";
import {
  createDefaultListasState,
  createLista,
  formatValorDeclaracao,
  MAX_PRODUTOS_POR_LISTA,
  somaValores,
  type ListaProdutos,
  type ListasProdutosState,
  type ProdutoItem,
} from "@/lib/domain/listas-produtos";
import {
  loadListasFromStorage,
  saveListasToStorage,
} from "@/lib/storage/listas-storage";

export function useListasProdutos(): {
  state: ListasProdutosState;
  setState: (next: ListasProdutosState) => void;
  hydrated: boolean;
  warning: string | null;
} {
  const [state, setState] = useState<ListasProdutosState>(
    createDefaultListasState,
  );
  const [hydrated, setHydrated] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadListasFromStorage();
    setState(loaded.state);
    setWarning(loaded.warning ?? null);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveListasToStorage(state);
  }, [state, hydrated]);

  return { state, setState, hydrated, warning };
}

function updateLista(
  state: ListasProdutosState,
  id: string,
  patch: (lista: ListaProdutos) => ListaProdutos,
): ListasProdutosState {
  return {
    ...state,
    listas: state.listas.map((lista) => (lista.id === id ? patch(lista) : lista)),
  };
}

export function ListasProdutosEditor({
  state,
  onChange,
  warning,
  heading = "Listas de produtos",
}: {
  state: ListasProdutosState;
  onChange: (next: ListasProdutosState) => void;
  warning?: string | null;
  heading?: string;
}) {
  function setItem(listaId: string, index: number, next: ProdutoItem) {
    onChange(
      updateLista(state, listaId, (lista) => ({
        ...lista,
        itens: lista.itens.map((item, i) => (i === index ? next : item)),
      })),
    );
  }

  function removeItem(listaId: string, index: number) {
    onChange(
      updateLista(state, listaId, (lista) => ({
        ...lista,
        itens: lista.itens.filter((_, i) => i !== index),
      })),
    );
  }

  function addItem(listaId: string) {
    onChange(
      updateLista(state, listaId, (lista) => {
        if (lista.itens.length >= MAX_PRODUTOS_POR_LISTA) return lista;
        return {
          ...lista,
          itens: [...lista.itens, { quantidade: 1, nome: "", valor: 0 }],
        };
      }),
    );
  }

  function removeLista(lista: ListaProdutos) {
    const label = lista.nome.trim() || "sem nome";
    if (!window.confirm(`Excluir a lista "${label}"?`)) return;
    onChange({
      listas: state.listas.filter((item) => item.id !== lista.id),
      selecionadaId:
        state.selecionadaId === lista.id ? null : state.selecionadaId,
    });
  }

  return (
    <section className="space-y-4 rounded border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-zinc-900">{heading}</h2>
          <p className="max-w-3xl text-sm text-zinc-600">
            Marque qual lista entra na declaração. A quantidade é impressa e
            não multiplica o valor. O total é a soma dos valores. Cada lista
            tem no máximo {MAX_PRODUTOS_POR_LISTA} itens.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onChange({ ...state, listas: [...state.listas, createLista()] })
          }
          className="rounded border border-zinc-300 px-4 py-2 text-sm"
        >
          Nova lista
        </button>
      </div>

      {warning && (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {warning}
        </p>
      )}

      {state.listas.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Nenhuma lista salva. Crie uma para preencher a declaração.
        </p>
      ) : (
        <div className="space-y-4">
          {state.listas.map((lista) => {
            const marcada = state.selecionadaId === lista.id;
            return (
              <div
                key={lista.id}
                className="space-y-3 rounded border border-zinc-200 p-3"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-zinc-800">
                    <input
                      type="checkbox"
                      checked={marcada}
                      onChange={(e) =>
                        onChange({
                          ...state,
                          selecionadaId: e.target.checked ? lista.id : null,
                        })
                      }
                      aria-label={`Enviar a lista ${lista.nome || "sem nome"}`}
                    />
                    Enviar
                  </label>
                  <input
                    className="min-w-48 flex-1 rounded border border-zinc-300 px-3 py-2 text-sm"
                    value={lista.nome}
                    aria-label="Nome da lista"
                    onChange={(e) =>
                      onChange(
                        updateLista(state, lista.id, (current) => ({
                          ...current,
                          nome: e.target.value,
                        })),
                      )
                    }
                  />
                  <button
                    type="button"
                    onClick={() => removeLista(lista)}
                    className="rounded border border-red-300 px-3 py-2 text-sm text-red-700"
                  >
                    Excluir lista
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-zinc-600">
                        <th className="px-2 py-2">Qtd</th>
                        <th className="px-2 py-2">Discriminação</th>
                        <th className="px-2 py-2">Valor</th>
                        <th className="px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {lista.itens.map((item, index) => (
                        <tr
                          key={`${lista.id}-${index}`}
                          className="border-b border-zinc-100"
                        >
                          <td className="px-2 py-2">
                            <QtyField
                              value={item.quantidade}
                              onCommit={(quantidade) =>
                                setItem(lista.id, index, { ...item, quantidade })
                              }
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              className="w-full min-w-56 rounded border border-zinc-300 px-2 py-1"
                              value={item.nome}
                              aria-label={`Produto ${index + 1}`}
                              onChange={(e) =>
                                setItem(lista.id, index, {
                                  ...item,
                                  nome: e.target.value,
                                })
                              }
                            />
                          </td>
                          <td className="px-2 py-2">
                            <MoneyField
                              value={item.valor}
                              onCommit={(valor) =>
                                setItem(lista.id, index, { ...item, valor })
                              }
                            />
                          </td>
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              onClick={() => removeItem(lista.id, index)}
                              className="text-red-700 underline-offset-2 hover:underline"
                            >
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => addItem(lista.id)}
                    disabled={lista.itens.length >= MAX_PRODUTOS_POR_LISTA}
                    className="rounded border border-zinc-300 px-3 py-1.5 disabled:opacity-50"
                  >
                    Incluir item
                  </button>
                  <p className="text-zinc-700">
                    Total {formatValorDeclaracao(somaValores(lista.itens))}
                    {marcada ? " · esta lista será enviada" : ""}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function QtyField({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (quantidade: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);

  return (
    <input
      inputMode="numeric"
      aria-label="Quantidade"
      className="w-16 rounded border border-zinc-300 px-2 py-1"
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        if (/^[1-9]\d*$/.test(next)) onCommit(Number(next));
      }}
      onBlur={() => {
        setFocused(false);
        if (/^[1-9]\d*$/.test(text)) {
          onCommit(Number(text));
        } else {
          setText(String(value));
        }
      }}
    />
  );
}

function MoneyField({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (valor: number) => void;
}) {
  const [text, setText] = useState(formatInput(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(formatInput(value));
  }, [value, focused]);

  return (
    <input
      inputMode="decimal"
      aria-label="Valor"
      className="w-28 rounded border border-zinc-300 px-2 py-1"
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        const next = e.target.value;
        setText(next);
        const parsed = parseMoney(next);
        if (parsed != null) onCommit(parsed);
      }}
      onBlur={() => {
        setFocused(false);
        const parsed = parseMoney(text);
        if (parsed == null) {
          setText(formatInput(value));
          return;
        }
        onCommit(parsed);
        setText(formatInput(parsed));
      }}
    />
  );
}

function formatInput(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

function parseMoney(raw: string): number | null {
  const text = raw.trim().replace(/\s/g, "").replace(/^R\$/, "");
  if (text === "") return 0;
  if (!/^\d+(,\d{0,2})?$/.test(text)) return null;
  const value = Number(text.replace(",", "."));
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}
