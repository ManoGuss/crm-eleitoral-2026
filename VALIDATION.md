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
| Histórico e filtro de revisor | A tela de revisão tem abas para fila e histórico; o histórico permite filtrar o responsável por decisões já registradas. |
| Interações de contato | O perfil da candidatura apresenta uma linha do tempo com data, canal, resultado e observação de cada tentativa registrada. |
| WhatsApp personalizado | Teste automatizado confirma a substituição segura de marcadores e a abertura apenas de links HTTPS autorizados do WhatsApp. |
| Eventos de interação | Cada alteração de resultado gera um evento novo; o registro inicial e os eventos posteriores permanecem preservados no histórico. |
| Atalhos globais | Os botões de WhatsApp na base e no perfil usam o mesmo procedimento protegido para compor a mensagem e registrar a tentativa. |
| Regressão automatizada | A suíte integrada passou com 25 arquivos e 51 testes, além de verificação de tipos e build de produção. |
| Perfil auditável | Teste de perfil confirma que os eventos retornados são associados à interação correta e preservam a ordem usada na linha do tempo. |
| API de revisão e contato | Testes de procedimento confirmam o filtro por revisor, a aplicação do escopo da sessão, a preferência, a preparação do WhatsApp e o registro de resultado de interação. |
| Fluxo controlado de contato | Testes simulados cobrem a preferência persistida, a URL preenchida do WhatsApp, o registro inicial de interação e a criação de eventos posteriores sem envio de mensagens externas. |

## Consolidação e validação final

| Área verificada | Resultado observado |
|---|---|
| Integração de versões | As mudanças locais de revisão, contatos auditáveis e WhatsApp foram conciliadas com os recursos remotos de contatos públicos e acompanhamento comercial, preservando escopo por usuário. |
| Banco de dados | Foram confirmadas as tabelas de decisões, interações, eventos imutáveis, preferências e favoritos, além das colunas de contatos públicos da candidatura. |
| Filtro por revisor e histórico | Os testes de procedimento cobrem o histórico paginado, o filtro por revisor e a aplicação do `userId` da sessão. |
| Modelo e preparo de contato | Os testes controlados cobrem a preferência persistida, interpolação dos marcadores, URL HTTPS do WhatsApp e criação da interação/evento inicial; não foi enviada nenhuma mensagem. |
| Atualização da linha do tempo | Os testes confirmam que a atualização de resultado acrescenta um evento e o perfil associa cada evento à interação correta, sem reescrever os fatos anteriores. |
| Interface desktop | As rotas `/base-eleitoral`, `/revisar-perfis` e `/candidaturas/1` renderizaram com filtros, abas, estado vazio honesto, perfil auditável e controles de contato. |
| Interface móvel | As rotas `/revisar-perfis` e `/candidaturas/1` mantiveram hierarquia, controles e conteúdo sem corte horizontal em 375 px. |

Em 25/08/2026, foram executados com êxito `pnpm test` (25 arquivos, 51 testes), `pnpm check` e `pnpm build`. A validação visual foi feita sem acionar canais externos; os controles de contato permanecem restritos a URLs públicas HTTPS autorizadas e não realizam disparo automático.

## Favoritos e acompanhamento comercial

O atalho de estrela agora está disponível nos cartões móveis e nas ações da tabela da Base Eleitoral. Ao favoritar, o perfil passa a disponibilizar o painel de acompanhamento comercial com status, último contato, próximo follow-up e observação privada por usuário. A validação visual confirmou a presença e a responsividade desses controles em desktop e 375 px. Um teste de componente confirma que editar os quatro campos produz o payload correto de salvamento, enquanto o teste de router comprova o escopo da sessão e a conversão de status, datas e observação sem escrever dados de usuário. Em 25/08/2026, `pnpm test` passou com 26 arquivos e 52 testes, além de `pnpm check` e `pnpm build`.

Além disso, o teste de fluxo `ElectionCandidateProfile.flow.test.tsx` renderiza o perfil com dados inteiramente controlados, aciona o botão de adicionar aos favoritos, simula o estado favoritado, verifica a aparição do painel comercial e confirma o salvamento de status e observação. Nenhuma escrita foi realizada no banco durante essa prova. Após essa cobertura, `pnpm test` passou com 27 arquivos e 53 testes, seguidos de checagem de tipos e build de produção.

O mesmo fluxo controlado aciona também a estrela de **remover dos favoritos** após o salvamento e confirma a chamada protegida com `favorite: false`. Assim, o ciclo de favoritar, editar e desfavoritar foi exercitado sem criar ou alterar registros persistentes de usuário.

## Recuperação da coleta e verificação de Instagram

| Área verificada | Resultado observado |
|---|---|
| Causa da interrupção | A tarefa anterior de Instagram ficou desativada após respostas `404` e `403`, impedindo novos lotes. |
| Tarefa recuperada | Uma nova tarefa protegida foi vinculada à coleta `60001`, mantendo a tarefa anterior pausada para evitar duplicidade. |
| Primeira execução | A rotina respondeu `200` e processou **64 candidaturas**, com **5 perfis declarados verificados** e **0 falhas** no lote. |
| Estado auditável após o lote | **1.232** candidaturas consultadas, **19.021** pendentes, **77** Instagrams verificados e **1.155** não localizados após consulta. |
| Interface de continuidade | A tela passa a priorizar a última base íntegra de 20.253 candidaturas, alerta sobre uma tentativa vazia interrompida e oferece ações explícitas para processar o próximo lote, ativar ou pausar a rotina. |
| Regressão automatizada | `pnpm test` passou com **28 arquivos e 55 testes**, além de `pnpm check` e `pnpm build`. |

### Coleta oficial controlada

As coletas vazias `150001` e `150002` estavam em `em_processamento` sem registros nem relatório de erro, compatível com interrupção da requisição HTTP antes da etapa de persistência. Uma coleta anterior (`120001`) registrava falha de inserção de um lote grande no banco. A inserção foi reduzida de 250 para **50 candidaturas por lote**, os erros de inserção passaram a ser classificados como falha de processamento auditável e uma nova execução controlada (`180001`) foi concluída em **25/08/2026 02:46 UTC** com **20.264 candidaturas**, estado `processado/concluida`, sem relatório de erro e origem oficial em arquivo. A rotina de Instagram foi transferida para essa nova coleta e sua primeira execução retornou `200`, consultando 64 candidaturas, verificando 8 perfis declarados e sem falhas. A validação final passou com **29 arquivos e 58 testes**, além de `pnpm check` e `pnpm build`.

Para evitar novas coletas vazias sem diagnóstico, a mutação de coleta agora observa o evento HTTP `aborted` **imediatamente após persistir o registro inicial da coleta e antes da primeira inserção de candidaturas**. Esse é o primeiro ponto em que há um identificador durável para registrar a falha. Se a requisição for abortada nesse intervalo, o sistema grava `sourceStatus/processStatus = falhou`, horário de processamento e o evento `requisicao_interrompida`, apenas quando a coleta continua vazia e em processamento. O teste de router comprova a ordem `registro inicial → diagnóstico persistido → inserção de candidaturas`; o teste de banco confirma a atualização protegida. Abortamentos anteriores à criação do registro não têm como ser associados a uma coleta inexistente. As coletas históricas `150001` e `150002` permanecem evidência de uma interrupção sem causa específica registrada. Em 25/08/2026, `pnpm test` passou com **30 arquivos e 61 testes**, além de `pnpm check` e `pnpm build`.
