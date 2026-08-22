# Validação da Interface

| Área verificada | Resultado observado |
|---|---|
| Tela de acesso — desktop | Identidade visual renderizada com painel de marca, contraste alto, CTA de acesso e mensagem de segurança. |
| Tela de acesso — celular | Composição empilhada, CTA em largura confortável e conteúdo sem corte horizontal. |
| Importação — desktop | Assistente em três etapas, área de envio, indicação de formatos e rastreabilidade explicada. |
| Importação — celular | Navegação compacta, área de envio legível e controles sem sobreposição. |
| Leads — desktop | Busca, filtros, ações de criação/importação, tabela e estado vazio renderizados corretamente. |
| Histórico — desktop | Layout de duas colunas, estado vazio e área de detalhes da importação renderizados corretamente. |

As verificações automatizadas executadas em 22/08/2026 incluem seis testes unitários e de proteção de acesso, além de verificação de tipos e build de produção sem erro.

## Coleta eleitoral

Na validação do painel de coleta, a sessão do navegador não estava autenticada e o aplicativo redirecionou corretamente para a tela de acesso. Por esse motivo, nenhuma execução de coleta foi iniciada no banco por esta sessão de validação. A fonte oficial em arquivo também retornou acesso rejeitado no ambiente; esta restrição está registrada em `research_sources_2026.md` e será exibida no histórico da coleta quando uma tentativa autenticada for executada.

## Atualização eleitoral

| Área verificada | Resultado observado |
|---|---|
| Filtros em Leads | Os filtros de Cargo, Partido/Federação, Estado e Cidade estão visíveis e integrados à busca da base de leads. |
| Coleta nacional | O painel mostra 20.253 candidaturas estaduais, a cobertura das 27 UFs e a distribuição por cargo. |
| Auditoria de Instagram | O painel separa com evidência: 21 perfis verificados, 507 não localizados após consulta e 19.725 pendentes, evitando tratar pendência como ausência de perfil. |
| Base eleitoral — desktop | A tabela consulta os 20.253 registros, apresenta status, disponibilidade na urna e filtros por UF, cargo e Instagram. |
| Base eleitoral — celular | A listagem muda para cartões empilhados, preservando filtros, classificação de Instagram e paginação sem corte horizontal. |
| Revisão manual — interface | A rota protegida `/revisar-perfis` apresenta filtros, evidências, ações de aprovação/rejeição e estado vazio honesto quando não há perfis prováveis. |
| Contatos públicos | Ações de Instagram e WhatsApp são exibidas somente para URLs HTTPS com hosts permitidos; links demais permanecem ocultos. |
| Decisão auditável | Teste automatizado confirma a persistência simulada de status, observação, responsável, data e sinal de revisão, sem alterar a base oficial. |
| Guarda da fila pendente | O procedimento de revisão rejeita decisões para candidaturas que não estejam simultaneamente classificadas como “Provável — requer revisão” e pendentes. |
| Condição atual dos dados | A coleta corrente não possui perfis prováveis; por isso, a rota apresenta o estado vazio e nenhuma candidatura oficial foi alterada somente para demonstrar o fluxo. |
| Canais alternativos | A coleta incremental passou a extrair WhatsApp, e-mail e telefone apenas de campos públicos declarados no detalhe oficial; os links são normalizados e validados antes de serem exibidos. |
| Prioridade de contato | A interface mostra WhatsApp, e-mail e telefone como canais acionáveis quando disponíveis, sem depender de um Instagram para liberar o contato. |
| Reprocessamento controlado | Um lote de 64 candidaturas existentes foi reconsultado com sucesso para a nova extração; a rotina publicada continua o enriquecimento em lotes, sem pausar antes de esgotar contatos pendentes. |
| Marcadores comerciais | A listagem de leads apresenta filtros rápidos para sem contato, conversa, retorno, negociação, follow-up, proposta, projeto fechado e perda; a prioridade é derivada de status, último contato e próxima ação. |
| Ação rápida de conversa | O detalhe do lead permite registrar uma conversa realizada, gravando o horário e promovendo automaticamente o status “Novo” para “Abordado”. |
| Contrato de filtros | A suíte automatizada confirma que o marcador comercial é encaminhado pela rota protegida e que o registro de conversa persiste status e horário no escopo do usuário. |
| Favoritos eleitorais | A Base eleitoral oferece ação de favoritar e filtro de favoritos, todos isolados pela conta autenticada e sem alteração dos registros oficiais de candidatura. |
| Acompanhamento de favoritos | Candidaturas favoritada recebem marcador comercial e seletor de status próprios, permitindo acompanhar a prospecção sem criar dados fictícios no cadastro oficial. |
| Conversa e follow-up | Favoritos permitem registrar a conversa com horário e agendar o próximo follow-up; a remoção de um favorito que já possui acompanhamento pede confirmação, pois elimina somente os dados privados desse usuário. |
| Situações oficiais | A Base eleitoral voltou a apresentar badges de alto contraste: verde para deferidas, âmbar para pendentes ou aguardando julgamento, vermelho para renúncias e indeferimentos, e cinza para situações sem classificação publicada. |
| Evidência visual — desktop | A captura de `/base-eleitoral` em 1280×720 exibiu simultaneamente “Renúncia” em vermelho e “Aguardando julgamento” em âmbar, ambos legíveis na coluna Situação. |
| Evidência visual — celular | A captura de `/base-eleitoral` em 375×812 confirmou os mesmos badges abaixo de cargo e partido nos cartões, sem corte horizontal e com contraste legível. |
| Artefato para Vercel | O build local confirmou `dist/public/index.html` como saída da interface; `vercel.json` aponta explicitamente para essa pasta e aplica o fallback da SPA apenas depois da resolução de arquivos e funções. |
| Runtime da Vercel | A entrada `api/[...path].ts` reutiliza a aplicação Express para manter OAuth, tRPC, armazenamento e endpoints programados fora do diretório estático. |
| Acesso pessoal direto | Sem cookie ou sessão, o contexto do servidor resolve o registro do proprietário configurado; uma chamada anônima a `auth.me` retornou HTTP 200 e as rotas `/` e `/acesso` renderizaram diretamente o painel. |
| Implicação de privacidade | O CRM passa a ser um espaço pessoal único sem barreira de login. Quem possuir o endereço publicado poderá ler e alterar o conteúdo; mantenha a URL fora de divulgação e reative autenticação se houver qualquer compartilhamento. |
| Correção da Vercel | A configuração da Vercel serve apenas `dist/public`, encaminha `/api/*` para a API publicada do CRM (HTTP 200 validado) e preserva o fallback de SPA. A função serverless local foi removida para evitar a indisponibilidade que deixava a interface em tela azul. |

A validação de tipos, 32 testes automatizados — incluindo a configuração de proxy da Vercel — e o build de produção foram executados com êxito após esta atualização.
