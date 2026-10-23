"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { produtosSelecionados } from "@/lib/domain/listas-produtos";
import {
  ListasProdutosEditor,
  useListasProdutos,
} from "@/components/ListasProdutosEditor";

export function DeclaracaoApp() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const listas = useListasProdutos();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!file) {
      setError("Selecione o XLSX do lote (exportado na coleta).");
      return;
    }

    const selecionada = produtosSelecionados(listas.state);
    if (!selecionada.ok) {
      setError(selecionada.error);
      return;
    }

    setLoading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("produtos", JSON.stringify(selecionada.produtos));
      const res = await fetch("/api/declaracoes", {
        method: "POST",
        body,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error || `Falha HTTP ${res.status}`);
      }

      const count = res.headers.get("X-Declaracoes-Count");
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "declaracao.xlsx";
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setMessage(
        filename.toLowerCase().endsWith(".zip")
          ? `Pronto: ${count ?? "várias"} declarações no ZIP.`
          : `Pronto: declaração baixada (${filename}).`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na geração.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8">
      <header className="space-y-2">
        <p className="text-sm text-zinc-500">
          <Link href="/" className="underline-offset-2 hover:underline">
            ← Voltar à coleta
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Gerar declarações de conteúdo
        </h1>
        <p className="text-sm text-zinc-600">
          Contingência: envie um XLSX do lote já exportado (útil se o lote não
          estiver mais no navegador). Uma pessoa baixa a declaração em .xlsx;
          várias, um ZIP. O destinatário vem do arquivo. Os produtos vêm da
          lista marcada abaixo.
        </p>
      </header>

      {(error || message) && (
        <div className="space-y-2 text-sm">
          {error && (
            <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-red-800">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900">
              {message}
            </p>
          )}
        </div>
      )}

      <ListasProdutosEditor
        state={listas.state}
        onChange={listas.setState}
        warning={listas.warning}
      />

      <form onSubmit={onSubmit} className="space-y-4 rounded border border-zinc-200 bg-white p-4">
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-zinc-800">Arquivo do lote (.xlsx)</span>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="block w-full text-sm text-zinc-700 file:mr-3 file:rounded file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:text-white"
            onChange={(ev) => {
              setFile(ev.target.files?.[0] ?? null);
              setError(null);
              setMessage(null);
            }}
          />
        </label>

        <button
          type="submit"
          disabled={loading || !file || !listas.hydrated}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Gerando declaração…" : "Gerar declaração"}
        </button>
      </form>
    </div>
  );
}
