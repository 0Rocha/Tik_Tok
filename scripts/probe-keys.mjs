import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const username = process.env.API_USERNAME?.trim();
const passwordB64 = process.env.API_PASSWORD_BASE64?.trim();
const password = passwordB64
  ? Buffer.from(passwordB64, "base64").toString("utf8")
  : process.env.API_PASSWORD?.trim();
const base = (
  process.env.LUCI_BASE_URL || "https://escritorio.luciluci.com.br"
).replace(/\/$/, "");

const id = process.argv[2] || "1";
const auth = Buffer.from(`${username}:${password}`, "utf8").toString("base64");
const url = `${base}/restApi/users/getUser?tipo=DISTRIBUIDOR&id=${encodeURIComponent(id)}`;

const res = await fetch(url, {
  headers: {
    Accept: "application/json",
    Authorization: `Basic ${auth}`,
  },
});

const data = await res.json();
console.log("http_status", res.status);
console.log("top_level_keys", Object.keys(data).sort());

function shape(value, depth = 0) {
  if (value == null) return null;
  if (Array.isArray(value)) return [`array(${value.length})`, value[0] ? shape(value[0], depth + 1) : null];
  if (typeof value !== "object") return typeof value;
  if (depth > 2) return "object";
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = shape(v, depth + 1);
  }
  return out;
}

// só estrutura + comprimento de strings (sem conteúdo pessoal)
function redact(value, depth = 0) {
  if (value == null) return value;
  if (typeof value === "string") return `<str:${value.length}>`;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 2).map((v) => redact(v, depth + 1));
  if (typeof value === "object" && depth < 3) {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = redact(v, depth + 1);
    return out;
  }
  return typeof value;
}

const interesting = Object.keys(data).filter((k) =>
  /nome|name|razao|enderec|address|rua|lograd|bairro|cidade|city|cep|uf|estado|compl|numero|usuario/i.test(
    k,
  ),
);
console.log("interesting_keys", interesting);
console.log("redacted_interesting", Object.fromEntries(interesting.map((k) => [k, redact(data[k])])));
console.log("full_redacted_shape", redact(data));
