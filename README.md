# CRM Eleitoral 2026

Aplicação full-stack para organizar a prospecção comercial de candidatos, partidos, contatos e oportunidades para as eleições de 2026. O projeto concentra a operação em uma interface escura, responsiva e orientada à execução: leitura de planilhas, base de leads, dados de contato, anotações, follow-ups e histórico de importações.

> **Princípio de dados:** todos os registros de negócio são associados ao identificador interno do usuário autenticado. Nenhuma rota de negócio aceita `userId` do navegador; o valor é determinado exclusivamente no servidor a partir da sessão autenticada.

## Arquitetura

| Camada | Implementação | Responsabilidade |
|---|---|---|
| Interface | React 19, TypeScript, Tailwind CSS e componentes acessíveis | Dashboard, leads, detalhes, importação e uso responsivo. |
| API | Express e tRPC | Contratos tipados e procedimentos protegidos para toda operação de negócio. |
| Autenticação | OAuth da plataforma | Sessão protegida, acesso e encerramento de sessão. |
| Banco de dados | MySQL/TiDB com Drizzle ORM | Leads, contatos, notas, atividades, importações e campos dinâmicos. |
| Arquivos | Armazenamento privado integrado | Mantém o arquivo original associado à importação, por usuário. |
| Planilhas | `xlsx` | Leitura de XLSX, XLS e CSV; abas, cabeçalhos, prévia e valores calculados. |

O ambiente disponibilizado para este projeto usa **OAuth e MySQL/TiDB gerenciados**, e não Supabase. Por isso, o isolamento equivalente a RLS é implementado de forma mandatória nas consultas e mutações do servidor: todo `SELECT`, `UPDATE` e `DELETE` é filtrado por `userId` extraído da sessão. As chaves de armazenamento também usam o prefixo `crm-eleitoral/{userId}/`.

## Modelo dinâmico de dados

| Entidade | Finalidade |
|---|---|
| `leads` | Campos operacionais do CRM e `customFields` em JSON para cada coluna importada. |
| `fieldDefinitions` | Catálogo de campos encontrados por usuário, com nome original, chave normalizada, tipo inferido, ordem e visibilidade. |
| `contacts` | Vários meios de contato por lead, manuais ou detectados durante a importação. |
| `notes` e `activities` | Anotações e trilha de eventos do relacionamento comercial. |
| `imports` e `importSheets` | Arquivo de origem, abas, colunas, prévias, estratégia e resumo de execução. |

Cabeçalhos são normalizados somente para comparação interna; o título original continua sendo exibido. Uma coluna inédita cria automaticamente uma definição de campo, enquanto registros antigos preservam seus dados em `customFields`.

## Importar uma planilha

1. Acesse **Importar** no menu lateral e envie um arquivo `.xlsx`, `.xls` ou `.csv` de até 50 MB.
2. O sistema armazena o arquivo de origem em área privada, identifica todas as abas e pré-seleciona `Candidatos` quando ela existir. Na ausência dela, seleciona a aba com mais registros.
3. Revise a seleção de abas, a linha de cabeçalho, os nomes das colunas e a estratégia de duplicidade.
4. Confirme a importação. Os registros são processados em lotes de até 250, e os campos dinâmicos são criados antes dos leads.
5. Consulte o resumo e o histórico para rastrear abas, registros criados, atualizados, ignorados e eventuais erros.

As regras de deduplicação priorizam `SQ_CANDIDATO + Cargo`; na ausência desses valores, são considerados e-mail, telefone/WhatsApp, Instagram e combinação de nome com localidade. A opção **Atualizar sem apagar dados** preserva valores existentes quando um campo recebido estiver vazio.

## Links e ações de contato

O CRM reconhece WhatsApp, Instagram, Facebook, e-mail, telefone, sites e URLs HTTP(S) em campos importados. A interface abre links externos em nova aba com `noopener noreferrer`. Protocolos não seguros, como `javascript:`, nunca são transformados em links clicáveis.

## Desenvolvimento local

Instale as dependências e inicie o ambiente de desenvolvimento.

```bash
pnpm install
pnpm dev
```

Para sincronizar o banco em uma infraestrutura compatível, gere a migração e aplique o SQL correspondente. A migração inicial do CRM está em `drizzle/0001_flowery_nicolaos.sql`.

```bash
pnpm drizzle-kit generate
pnpm check
pnpm test
pnpm build
```

## Testes incluídos

| Cenário | Cobertura atual |
|---|---|
| Encerramento da sessão | Verifica a limpeza segura do cookie de sessão. |
| Normalização de cabeçalhos | Confirma o tratamento de variações previsíveis. |
| Deduplicação eleitoral | Confirma a prioridade de `SQ_CANDIDATO + Cargo`. |
| Segurança de links | Confirma a rejeição de protocolos inseguros e a criação de ações válidas. |

Os testes são executados com `pnpm test`. Para validação operacional, importe uma planilha real e confira as colunas, abas, contatos detectados, campos novos, ações de link e o isolamento entre contas distintas.

## Limitações conhecidas

O login é o fluxo OAuth disponibilizado pelo ambiente gerenciado; por isso, as telas de cadastro, recuperação de senha e a configuração de confirmação de e-mail específicas do Supabase não fazem parte desta infraestrutura. O produto mantém login, logout e proteção de rotas, mas essa diferença deve ser considerada se houver migração futura para Supabase Auth.

O processamento é síncrono na requisição de confirmação e deve ser usado para arquivos dentro do limite da interface. Para cargas extraordinariamente grandes, recomenda-se evoluir a etapa para filas de trabalho antes de uso em produção de alta escala.
