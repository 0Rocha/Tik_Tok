"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  addItem,
  createEmptyLote,
  findDuplicateUsuarios,
  removeItem,
  updateItem,
} from "@/lib/domain/lote";
import type { ApiFields, LoteItem } from "@/lib/domain/types";
import {
  formatDateBr,
  validateLoteItem,
  validateManualFields,
} from "@/lib/domain/validators";
import { downloadLoteXlsx } from "@/lib/export/xlsx";
import {
  clearLoteStorage,
  loadLoteFromStorage,
  saveLoteToStorage,
} from "@/lib/storage/lote-storage";

type ManualForm = {
  solicitante: string;
  data: string;
  valor: string;
  envio: string;
  codigoRastreio: string;
  correio: string;
};

const emptyManual = (): ManualForm => ({
  solicitante: "",
  data: "",
  valor: "",
  envio: "",
  codigoRastreio: "",
  correio: "",
});

const emptyApi = (): ApiFields => ({
  usuario: "",
  nome: "",
  cpf: "",
  endereco: "",
});

function formatMoneyBr(value: number | null): string {
  if (value == null) return "";
  return value.toFixed(2).replace(".", ",");
}

export function ColetaApp() {
  const [lote, setLote] = useState<LoteItem[]>(createEmptyLote());
  const [hydrated, setHydrated] = useState(false);
  const [userId, setUserId] = useState("");
  const [apiFields, setApiFields] = useState<ApiFields>(emptyApi());
  const [apiIncomplete, setApiIncomplete] = useState(false);
  const [consulted, setConsulted] = useState(false);
  const [manual, setManual] = useState<ManualForm>(emptyManual());
  const [lookupLoading, setLookupLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const loaded = loadLoteFromStorage();
    setLote(loaded.lote);
    if (loaded.warning) {
      setMessage(loaded.warning);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveLoteToStorage(lote);
  }, [lote, hydrated]);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setDuplicateWarning(null);
    const id = userId.trim();
    if (!id) {
      setError("Informe um ID.");
      return;
    }
    setLookupLoading(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(id)}`);
      const body = (await res.json()) as {
        usuario?: string;
        nome?: string;
        cpf?: string;
        endereco?: string;
        incomplete?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setError(body.error ?? "Falha ao consultar o ID.");
        return;
      }
      setApiFields({
        usuario: body.usuario ?? "",
        nome: body.nome ?? "",
        cpf: body.cpf ?? "",
        endereco: body.endereco ?? "",
      });
      setConsulted(true);
      setApiIncomplete(Boolean(body.incomplete));
      if (body.incomplete) {
        setMessage(
          "Alguns dados obrigatórios vieram vazios da API. Preencha nome, CPF e/ou endereço antes de adicionar.",
        );
      }
      const dups = findDuplicateUsuarios(lote, body.usuario ?? "");
      if (dups.length > 0) {
        setDuplicateWarning(
          `Atenção: o usuário "${body.usuario}" já está no lote.`,
        );
      }
    } catch {
      setError("Falha de comunicação com o servidor.");
    } finally {
      setLookupLoading(false);
    }
  }

  function resetForm() {
    setUserId("");
    setApiFields(emptyApi());
    setApiIncomplete(false);
    setConsulted(false);
    setManual(emptyManual());
    setEditingId(null);
    setDuplicateWarning(null);
  }

  function handleAddOrUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!editingId && !consulted) {
      setError("Consulte um ID antes de adicionar ao lote.");
      return;
    }

    const manualResult = validateManualFields(manual);
    if (!manualResult.ok) {
      setError(manualResult.errors.join(" "));
      return;
    }

    const draft = {
      ...apiFields,
      usuario: apiFields.usuario.trim(),
      nome: apiFields.nome.trim(),
      cpf: apiFields.cpf.trim(),
      endereco: apiFields.endereco.trim(),
      ...manualResult.value,
    };

    const candidate: LoteItem = {
      id: editingId ?? "temp",
      ...draft,
    };
    const check = validateLoteItem(candidate);
    if (!check.ok) {
      setError(check.errors.join(" "));
      return;
    }

    if (editingId) {
      setLote((prev) =>
        updateItem(prev, editingId, { ...candidate, id: editingId }),
      );
      setMessage("Registro atualizado.");
    } else {
      const dups = findDuplicateUsuarios(lote, draft.usuario);
      if (dups.length > 0) {
        setDuplicateWarning(
          `Atenção: o usuário "${draft.usuario}" já está no lote (incluído mesmo assim).`,
        );
      }
      setLote((prev) => addItem(prev, draft).lote);
      setMessage("Registro adicionado ao lote.");
    }
    resetForm();
  }

  function startEdit(item: LoteItem) {
    setEditingId(item.id);
    setUserId("");
    setApiFields({
      usuario: item.usuario,
      nome: item.nome,
      cpf: item.cpf,
      endereco: item.endereco,
    });
    setConsulted(true);
    setApiIncomplete(false);
    setManual({
      solicitante: item.solicitante,
      data: formatDateBr(item.data),
      valor: formatMoneyBr(item.valor),
      envio: formatDateBr(item.envio),
      codigoRastreio: item.codigoRastreio,
      correio: formatMoneyBr(item.correio),
    });
    setError(null);
    setMessage(null);
  }

  function handleRemove(id: string) {
    if (!window.confirm("Remover este registro do lote?")) return;
    setLote((prev) => removeItem(prev, id));
    if (editingId === id) resetForm();
  }

  function handleClearLote() {
    if (!window.confirm("Limpar todo o lote? Esta ação não pode ser desfeita.")) {
      return;
    }
    setLote(createEmptyLote());
    clearLoteStorage();
    resetForm();
    setMessage("Lote limpo.");
  }

  async function handleExport() {
    setError(null);
    setExporting(true);
    try {
      await downloadLoteXlsx(lote);
      const clearAfter = window.confirm(
        "Exportação concluída. Deseja limpar o lote agora?\n\nOK = limpar | Cancelar = manter (padrão recomendado).",
      );
      if (clearAfter) {
        setLote(createEmptyLote());
        clearLoteStorage();
        resetForm();
        setMessage("Exportação concluída e lote limpo.");
      } else {
        setMessage(
          "Exportação concluída. O lote foi mantido no navegador até você limpar manualmente.",
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha na geração do arquivo.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Coleta e exportação XLSX
        </h1>
        <p className="text-sm text-zinc-600">
          Obrigatórios: usuário, nome, CPF e endereço. Demais campos são
          opcionais. O lote fica neste navegador (`localStorage`).
        </p>
        <p className="text-sm text-zinc-500">
          <Link
            href="/declaracao"
            className="underline-offset-2 hover:underline"
          >
            Gerar declarações de conteúdo a partir do XLSX →
          </Link>
        </p>
      </header>

      {(error || message || duplicateWarning) && (
        <div className="space-y-2 text-sm">
          {error && (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-red-800">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
              {message}
            </p>
          )}
          {duplicateWarning && (
            <p className="rounded border border-orange-200 bg-orange-50 px-3 py-2 text-orange-900">
              {duplicateWarning}
            </p>
          )}
        </div>
      )}

      <section className="space-y-4 rounded border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-medium text-zinc-900">1. Consultar ID</h2>
        <form onSubmit={handleLookup} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            ID do distribuidor
            <input
              className="rounded border border-zinc-300 px-3 py-2"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              inputMode="numeric"
              disabled={lookupLoading || Boolean(editingId)}
            />
          </label>
          <button
            type="submit"
            disabled={lookupLoading || Boolean(editingId)}
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {lookupLoading ? "Consultando…" : "Consultar"}
          </button>
        </form>
      </section>

      <section className="space-y-4 rounded border border-zinc-200 bg-white p-4">
        <h2 className="text-lg font-medium text-zinc-900">
          2. Dados do registro {editingId ? "(editando)" : ""}
        </h2>
        <form onSubmit={handleAddOrUpdate} className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Usuário *"
            value={apiFields.usuario}
            onChange={(v) => setApiFields((p) => ({ ...p, usuario: v }))}
            required
            readOnly
          />
          <Field
            label={`Nome *${apiIncomplete || !apiFields.nome ? " (preencher se vazio)" : ""}`}
            value={apiFields.nome}
            onChange={(v) => setApiFields((p) => ({ ...p, nome: v }))}
            required
          />
          <Field
            label={`CPF *${apiIncomplete || !apiFields.cpf ? " (preencher se vazio)" : ""}`}
            value={apiFields.cpf}
            onChange={(v) => setApiFields((p) => ({ ...p, cpf: v }))}
            required
            readOnly={Boolean(apiFields.cpf)}
          />
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            {`Endereço *${apiIncomplete || !apiFields.endereco ? " (preencher se vazio)" : ""}`}
            <textarea
              className="min-h-20 rounded border border-zinc-300 px-3 py-2"
              value={apiFields.endereco}
              onChange={(e) =>
                setApiFields((p) => ({ ...p, endereco: e.target.value }))
              }
              required
            />
          </label>
          <Field
            label="Solicitante (opcional)"
            value={manual.solicitante}
            onChange={(v) => setManual((p) => ({ ...p, solicitante: v }))}
          />
          <Field
            label="Data DD/MM/AAAA (opcional)"
            value={manual.data}
            onChange={(v) => setManual((p) => ({ ...p, data: v }))}
          />
          <Field
            label="Valor ex.: 12,50 (opcional)"
            value={manual.valor}
            onChange={(v) => setManual((p) => ({ ...p, valor: v }))}
          />
          <Field
            label="Envio DD/MM/AAAA (opcional)"
            value={manual.envio}
            onChange={(v) => setManual((p) => ({ ...p, envio: v }))}
          />
          <Field
            label="Cód. Rastreio (opcional)"
            value={manual.codigoRastreio}
            onChange={(v) => setManual((p) => ({ ...p, codigoRastreio: v }))}
          />
          <Field
            label="Correio ex.: 15,90 (opcional)"
            value={manual.correio}
            onChange={(v) => setManual((p) => ({ ...p, correio: v }))}
          />
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="submit"
              className="rounded bg-emerald-700 px-4 py-2 text-sm text-white"
            >
              {editingId ? "Salvar edição" : "Adicionar ao lote"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded border border-zinc-300 px-4 py-2 text-sm"
              >
                Cancelar edição
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="space-y-4 rounded border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-zinc-900">
            3. Lote ({lote.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={lote.length === 0 || exporting}
              className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {exporting ? "Exportando…" : "Exportar XLSX"}
            </button>
            <button
              type="button"
              onClick={handleClearLote}
              disabled={lote.length === 0}
              className="rounded border border-red-300 px-4 py-2 text-sm text-red-700 disabled:opacity-50"
            >
              Limpar lote
            </button>
          </div>
        </div>

        {lote.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum registro no lote.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-600">
                  <th className="px-2 py-2">Solicitante</th>
                  <th className="px-2 py-2">Data</th>
                  <th className="px-2 py-2">Usuário</th>
                  <th className="px-2 py-2">Nome</th>
                  <th className="px-2 py-2">CPF</th>
                  <th className="px-2 py-2">Endereço</th>
                  <th className="px-2 py-2">Valor</th>
                  <th className="px-2 py-2">Envio</th>
                  <th className="px-2 py-2">Rastreio</th>
                  <th className="px-2 py-2">Correio</th>
                  <th className="px-2 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {lote.map((item) => (
                  <tr key={item.id} className="border-b border-zinc-100 align-top">
                    <td className="px-2 py-2">{item.solicitante}</td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {formatDateBr(item.data)}
                    </td>
                    <td className="px-2 py-2">{item.usuario}</td>
                    <td className="px-2 py-2">{item.nome}</td>
                    <td className="px-2 py-2 whitespace-nowrap">{item.cpf}</td>
                    <td className="max-w-48 whitespace-pre-wrap px-2 py-2">
                      {item.endereco}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {formatMoneyBr(item.valor)}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {formatDateBr(item.envio)}
                    </td>
                    <td className="px-2 py-2">{item.codigoRastreio}</td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {formatMoneyBr(item.correio)}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="text-zinc-900 underline"
                          onClick={() => startEdit(item)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="text-red-700 underline"
                          onClick={() => handleRemove(item.id)}
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  readOnly?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        className="rounded border border-zinc-300 px-3 py-2 read-only:bg-zinc-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        readOnly={readOnly}
      />
    </label>
  );
}
