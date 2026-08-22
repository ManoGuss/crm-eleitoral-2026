# Publicação na Vercel

O CRM possui uma interface Vite estática e rotas protegidas de OAuth, tRPC, banco de dados e armazenamento. Por isso, a Vercel deve publicar `dist/public` como site estático **e** encaminhar `/api/*` para a função serverless em `api/[...path].ts`. O arquivo `vercel.json` já preserva a resolução de funções e usa `index.html` somente como fallback das rotas da SPA.

## Configuração no painel da Vercel

Importe o repositório GitHub `ManoGuss/crm-eleitoral-2026` com a raiz do projeto no diretório principal. A Vercel lerá automaticamente `vercel.json`; não substitua o comando de build nem o diretório de saída no painel.

Defina no projeto Vercel as variáveis utilizadas pelo runtime: `DATABASE_URL`, `JWT_SECRET`, `OAUTH_SERVER_URL`, `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`, `BUILT_IN_FORGE_API_URL`, `BUILT_IN_FORGE_API_KEY`, `VITE_FRONTEND_FORGE_API_URL`, `VITE_FRONTEND_FORGE_API_KEY`, `OWNER_OPEN_ID` e `OWNER_NAME`. Configure a URL pública da Vercel como callback autorizada do OAuth antes do primeiro login.

> As rotinas periódicas existentes continuam sob o agendador da hospedagem integrada. Para executá-las também na Vercel, é necessário criar um cron da Vercel com segredo próprio; esta configuração não foi duplicada para evitar execuções concorrentes sobre as fontes eleitorais.

## Verificação local

O build gera `dist/public/index.html`, que é a saída estática correta para a Vercel. As rotas internas da SPA caem em `index.html`; já as chamadas `/api/*` permanecem encaminhadas para a função serverless e não são tratadas como arquivos estáticos.
