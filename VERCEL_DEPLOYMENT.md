# Publicação na Vercel

O CRM possui uma interface Vite estática e uma API já publicada na hospedagem integrada. Para evitar a tela vazia causada por uma função serverless sem as credenciais e o runtime completos do CRM, a Vercel publica apenas `dist/public` e encaminha `/api/*` para a origem publicada do CRM. O build da Vercel executa exclusivamente `pnpm exec vite build`, sem empacotar o servidor nem injetar scripts do runtime da hospedagem integrada. O arquivo `vercel.json` mantém `index.html` como fallback apenas das rotas da SPA.

## Configuração no painel da Vercel

Importe o repositório GitHub `ManoGuss/crm-eleitoral-2026` com a raiz do projeto no diretório principal. A Vercel lerá automaticamente `vercel.json`; não substitua o comando de build nem o diretório de saída no painel.

Não é necessário replicar as credenciais de banco, OAuth ou armazenamento no projeto Vercel: elas permanecem exclusivamente na origem da API. Para o build estático, mantenha no painel da Vercel somente as variáveis públicas `VITE_*` que sejam efetivamente referenciadas pelo cliente, se houver alguma personalizada.

> As rotinas periódicas existentes continuam sob o agendador da hospedagem integrada. Esta configuração não cria um cron na Vercel, evitando execuções concorrentes sobre as fontes eleitorais.

## Verificação local

O build gera `dist/public/index.html`, que é a saída estática correta para a Vercel. As rotas internas da SPA caem em `index.html`; as chamadas `/api/*` são reescritas para a origem da API e não são tratadas como arquivos estáticos. Esta separação garante que o painel não fique aguardando uma função indisponível na Vercel. A versão de build da Vercel não contém referências a `/__manus__/` nem ao runtime Manus.
