# Coleta, exportação XLSX e declarações

Aplicação Next.js (App Router) para consultar um distribuidor na API LuciLuci, completar campos manuais, montar um lote, exportar um `.xlsx` com as 10 colunas oficiais e gerar automaticamente o ZIP de declarações de conteúdo.

## Requisitos

- Node.js 20+
- Credenciais LuciLuci (`API_USERNAME` / `API_PASSWORD_BASE64`)
- `GEMINI_API_KEY` (para gerar declarações na exportação ou em `/declaracao`)

## Configuração

```bash
cp .env.example .env.local
```

Preencha no `.env` ou `.env.local` (nunca use `NEXT_PUBLIC_*` para senha).

Se a senha tiver `$`, **não** use `API_PASSWORD=` direto — o Next expande variáveis e corrompe o valor. Use Base64:

```bash
# 1) crie .env.password com a senha em uma linha
# 2) gere o .env:
node scripts/setup-password-b64.mjs
```

Ou manualmente:

```env
API_USERNAME=seu_usuario
API_PASSWORD_BASE64=...base64_da_senha...
# opcional
LUCI_BASE_URL=https://escritorio.luciluci.com.br
```

Reinicie o `npm run dev` depois de alterar o `.env`.

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

Contingência (XLSX já salvo, sem lote no navegador): [http://localhost:3000/declaracao](http://localhost:3000/declaracao).

## Uso

1. Informe o ID e clique em **Consultar**.
2. Confira os obrigatórios: usuário, nome, CPF (`cnpj` da API) e endereço.
3. Campos manuais são **opcionais** (solicitante, data, valor, envio, rastreio, correio).
4. Adicione ao lote (duplicidade de `usuario` só avisa).
5. Revise, edite ou remova itens.
6. **Exportar XLSX + declarações** — confirma, baixa o XLSX do lote e em seguida a declaração no formato do modelo: **1 registro → `.xlsx`**; **vários → ZIP** com um `.xlsx` por pessoa. Endereço no padrão Luci (`logradouro - bairro - cidade/UF - cep`) não usa Gemini; os demais precisam de `GEMINI_API_KEY`. Só depois pergunta se quer limpar o lote.

## Persistência

O lote fica em `localStorage` na chave `tiktok-envio:lote:v1` (payload `version: 2`).

- Sobrevive a F5 e ao fechar/reabrir o navegador no mesmo perfil.
- Contém dados pessoais (nome, CPF, endereço): use em máquina/perfil controlado.
- Schema antigo (v1) ou inválido é descartado com aviso.

## Colunas do XLSX

1. Solicitante  
2. Data  
3. Usuário  
4. Nome  
5. CPF  
6. Endereço  
7. Valor  
8. Envio  
9. Cód. Rastreio  
10. Correio  

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` / `npm start` | Produção |
| `npm test` | Vitest (validators, lote, persist, export, normalizer) |
| `npm run typecheck` | `tsc --noEmit` |

## Mapeamento LuciLuci (`getUser`)

| Campo interno | Origem na API |
|---------------|---------------|
| `usuario` | `usuario` |
| `nome` | `nome` |
| `cpf` | `cpf` (prioridade) ou fallback `cnpj` (texto, sem validar dígitos) |
| `endereco` | objeto `endereco` → `endereco, numero, complemento - bairro - cidade/estado - cep` |
