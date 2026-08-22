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

A validação de tipos, os nove testes automatizados e o build de produção foram executados com êxito após esta atualização.
