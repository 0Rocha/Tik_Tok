const DEFAULT_BASE = "https://escritorio.luciluci.com.br";
const TIMEOUT_MS = 30_000;

export type LuciFetchResult =
  | { ok: true; data: unknown }
  | {
      ok: false;
      status: number;
      code: "not_found" | "auth" | "network" | "invalid" | "config";
      message: string;
    };

function getConfig():
  | { ok: true; baseUrl: string; username: string; password: string }
  | { ok: false; message: string } {
  const username = process.env.API_USERNAME?.trim();
  // Preferir BASE64: senhas com $ quebram no dotenv-expand do Next.
  const passwordB64 = process.env.API_PASSWORD_BASE64?.trim();
  const password = passwordB64
    ? Buffer.from(passwordB64, "base64").toString("utf8")
    : process.env.API_PASSWORD?.trim();
  if (!username || !password) {
    return {
      ok: false,
      message: "Credenciais da API não configuradas no servidor.",
    };
  }
  const baseUrl = (process.env.LUCI_BASE_URL?.trim() || DEFAULT_BASE).replace(
    /\/$/,
    "",
  );
  return { ok: true, baseUrl, username, password };
}

export async function fetchDistribuidor(id: string): Promise<LuciFetchResult> {
  const config = getConfig();
  if (!config.ok) {
    return { ok: false, status: 500, code: "config", message: config.message };
  }

  const url = `${config.baseUrl}/restApi/users/getUser?tipo=DISTRIBUIDOR&id=${encodeURIComponent(id)}`;
  const auth = Buffer.from(
    `${config.username}:${config.password}`,
    "utf8",
  ).toString("base64");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${auth}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        status: response.status,
        code: "auth",
        message: "Falha de autenticação com a API.",
      };
    }
    if (response.status === 404) {
      return {
        ok: false,
        status: 404,
        code: "not_found",
        message: "ID não encontrado.",
      };
    }
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        code: "network",
        message: "Falha de comunicação com a API.",
      };
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return {
        ok: false,
        status: 502,
        code: "invalid",
        message: "Resposta inválida da API.",
      };
    }

    if (data == null || (typeof data === "object" && Object.keys(data as object).length === 0)) {
      return {
        ok: false,
        status: 404,
        code: "not_found",
        message: "ID não encontrado.",
      };
    }

    return { ok: true, data };
  } catch {
    return {
      ok: false,
      status: 502,
      code: "network",
      message: "Falha de comunicação com a API.",
    };
  } finally {
    clearTimeout(timer);
  }
}
