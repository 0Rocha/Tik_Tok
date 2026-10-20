import { readFileSync, writeFileSync } from "node:fs";

const password = readFileSync(".env.password", "utf8").replace(/\r?\n$/, "");
const b64 = Buffer.from(password, "utf8").toString("base64");
const roundtrip = Buffer.from(b64, "base64").toString("utf8");

if (roundtrip !== password) {
  console.error("roundtrip mismatch");
  process.exit(1);
}

console.log("password_len", password.length);
console.log("has_dollar", password.includes("$"));
console.log("has_underscore", password.includes("_"));
console.log("b64", b64);

const env = `# Credenciais LuciLuci — NUNCA use NEXT_PUBLIC_* aqui
# API_PASSWORD com $ quebra no dotenv-expand do Next → use BASE64
API_USERNAME=luciluciprd
API_PASSWORD_BASE64=${b64}

# Opcional (default: https://escritorio.luciluci.com.br)
LUCI_BASE_URL=https://escritorio.luciluci.com.br
`;

writeFileSync(".env", env);
console.log("wrote .env");
