# Fontes Oficiais Confirmadas — Eleições Gerais 2026

**Data da verificação:** 22/08/2026, fuso America/Sao_Paulo.

| Fonte | Papel na coleta | Cobertura confirmada |
|---|---|---|
| [Portal de Dados Abertos do TSE](https://dadosabertos.tse.jus.br/dataset/candidatos-2026) | Lista-mestra em arquivo, dados complementares e redes sociais declaradas | Brasil; arquivos de candidatos e de redes sociais; atualização indicada quatro vezes ao dia. |
| [DivulgaCandContas](https://divulgacandcontas.tse.jus.br/) | Total de controle, situação publicada e consulta pública por UF | Eleição Geral Federal 2026; atualização indicada a cada 60 minutos. |
| [Portal Eleições 2026 do TSE](https://www.tse.jus.br/eleicoes/eleicoes-2026) | Referência institucional e acesso ao DivulgaCandContas | Calendário e páginas oficiais do pleito. |
| [TRE-SP: notícia institucional sobre DivulgaCandContas](https://www.tre-sp.jus.br/comunicacao/noticias/2026/Agosto/eleicoes-2026-divulgacandcontas-mostra-dados-sobre-candidaturas-e-gastos-de-campanha) | Validação da consulta por estado e do caráter público dos registros | Explica a consulta de cargos, partidos e pedidos por UF. |

## Totais publicados no DivulgaCandContas na consulta

| Cargo | Pedidos publicados |
|---|---:|
| Governador | 199 |
| Vice-governador | 202 |
| Senador | 317 |
| 1º Suplente | 326 |
| 2º Suplente | 327 |
| Deputado Federal | 7.703 |
| Deputado Estadual | 11.179 |

Os cargos nacionais de Presidente e Vice-presidente não serão incluídos no escopo da nova base. O status da candidatura e a disponibilidade na urna devem ser armazenados com data e hora da fonte consultada, pois os registros públicos são atualizados continuamente.

## Regra de integridade para Instagram

A coleta utilizará a tabela oficial de redes sociais declaradas do TSE como evidência primária. Nenhum perfil será associado apenas por semelhança de nome. Perfis não declarados ou não confirmados por evidências suficientes deverão permanecer como **Não localizado** ou **Provável — requer revisão**, com fonte e horário registrados.

## Observação de acesso técnico

O portal de dados abertos expõe recursos específicos para **Candidatos** e **Redes sociais de candidatos**, ambos em CSV compactado e com cobertura de todas as UFs. Na verificação de 22/08/2026, o endpoint CDN respondeu com `403` para uma requisição direta oriunda do ambiente de execução, embora a página oficial do recurso estivesse publicamente acessível no navegador. A implementação deverá preservar a URL oficial e registrar essa indisponibilidade quando o download programático não for possível, sem criar dados de substituição.

O teste do fluxo interativo do recurso de redes sociais também recebeu a página oficial de **Acesso Rejeitado**. A página principal do DivulgaCandContas continuou acessível e confirmou a consulta por regiões e unidades federativas, mas não expôs requisições de dados reutilizáveis no carregamento passivo da tela inicial. Portanto, a coleta integral não deve ser marcada como concluída enquanto a base oficial em arquivo permanecer inacessível a este ambiente.

## Alternativa oficial de consulta por API

A especificação técnica pública não oficial da API descreve o servidor `https://divulgacandcontas.tse.jus.br/divulga/rest/v1`. A consulta oficial de eleições ordinárias retornou o identificador **20322002026** para a *Eleição Geral Federal 2026*, com data do primeiro turno em 04/10/2026. Essa API será usada como alternativa de conferência quando o arquivo CSV do portal de dados retornar cobertura parcial; qualquer endpoint ou formato que não responda será registrado como indisponível, sem substituição por dados inferidos.

## Resultado da coleta nacional

A coleta concluída em 22/08/2026 usou a API oficial do DivulgaCandContas após o arquivo compactado do portal de dados retornar `403`. A base consolidada contém **20.253 candidaturas** em todas as 27 UFs, número igual à soma dos totais publicados no DivulgaCandContas quando se excluem Presidente, Vice-presidente e Deputado Distrital.

| Cargo | Total coletado |
|---|---:|
| Governador | 199 |
| Vice-governador | 202 |
| Senador | 317 |
| 1º Suplente | 326 |
| 2º Suplente | 327 |
| Deputado Federal | 7.703 |
| Deputado Estadual | 11.179 |
| **Total** | **20.253** |

O detalhe público de cada candidatura contém o campo `sites`, que pode declarar um Instagram. A validação individual foi interrompida após 528 respostas públicas para não gerar carga excessiva na fonte oficial; 21 Instagrams declarados foram confirmados com a URL da candidatura e o link declarado. Os demais registros **não devem ser lidos como “não encontrados” por pesquisa exaustiva**: a classificação permanece provisória até que a consulta individual seja concluída de forma responsável ou que o arquivo oficial de redes sociais volte a estar acessível.

## Registro regional de fontes oficiais

O TSE centraliza os links oficiais dos 27 Tribunais Regionais Eleitorais. Eles integram o registro de consulta regional e devem ser usados para esclarecer comunicados, decisões e publicações de cada UF quando a base nacional do TSE ou o DivulgaCandContas não contiver o detalhe requerido. A lista-mestra e os totais da coleta permanecem vinculados à fonte nacional para evitar duplicidade entre tribunais.

| UF | Fonte regional oficial |
|---|---|
| AC | https://www.tre-ac.jus.br/ |
| AL | https://www.tre-al.jus.br/ |
| AP | https://www.tre-ap.jus.br/ |
| AM | https://www.tre-am.jus.br/ |
| BA | https://www.tre-ba.jus.br/ |
| CE | https://www.tre-ce.jus.br/ |
| DF | https://www.tre-df.jus.br/ |
| ES | https://www.tre-es.jus.br/ |
| GO | https://www.tre-go.jus.br/ |
| MA | https://www.tre-ma.jus.br/ |
| MT | https://www.tre-mt.jus.br/ |
| MS | https://www.tre-ms.jus.br/ |
| MG | https://www.tre-mg.jus.br/ |
| PA | https://www.tre-pa.jus.br/ |
| PB | https://www.tre-pb.jus.br/ |
| PR | https://www.tre-pr.jus.br/ |
| PE | https://www.tre-pe.jus.br/ |
| PI | https://www.tre-pi.jus.br/ |
| RJ | https://www.tre-rj.jus.br/ |
| RN | https://www.tre-rn.jus.br/ |
| RS | https://www.tre-rs.jus.br/ |
| RO | https://www.tre-ro.jus.br/ |
| RR | https://www.tre-rr.jus.br/ |
| SC | https://www.tre-sc.jus.br/ |
| SP | https://www.tre-sp.jus.br/ |
| SE | https://www.tre-se.jus.br/ |
| TO | https://www.tre-to.jus.br/ |

Fonte de diretório: https://www.tse.jus.br/institucional/justica-eleitoral/tres
