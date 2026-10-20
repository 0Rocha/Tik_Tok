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

console.log("username:", username);
console.log("password_len:", password?.length ?? 0);
console.log("password_has_dollar:", password?.includes("$") ?? false);
console.log("password_has_underscore:", password?.includes("_") ?? false);
console.log("using_base64:", Boolean(passwordB64));

if (!username || !password) {
  console.error("missing credentials");
  process.exit(1);
}

const auth = Buffer.from(`${username}:${password}`, "utf8").toString("base64");
const url = `${base}/restApi/users/getUser?tipo=DISTRIBUIDOR&id=1`;

const res = await fetch(url, {
  headers: {
    Accept: "application/json",
    Authorization: `Basic ${auth}`,
  },
});

const text = await res.text();
console.log("http_status:", res.status);
console.log("body_preview:", text.slice(0, 200).replace(/\s+/g, " "));
