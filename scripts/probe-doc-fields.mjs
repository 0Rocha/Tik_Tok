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

const docKeys = Object.keys(data).filter((k) =>
  /cpf|cnpj|doc|documento|inscricao/i.test(k),
);

console.log("http_status", res.status);
console.log("doc_related_keys", docKeys);
for (const k of docKeys) {
  const v = data[k];
  console.log(
    k,
    "=",
    v === null
      ? "null"
      : typeof v === "string"
        ? `<str:${v.length} digits:${(v.match(/\d/g) || []).length}>`
        : typeof v,
  );
}

// keys literally named cpf anywhere (shallow + one level)
console.log("has_own_cpf", Object.prototype.hasOwnProperty.call(data, "cpf"));
console.log("cpf_value_type", data.cpf === undefined ? "undefined" : typeof data.cpf);
