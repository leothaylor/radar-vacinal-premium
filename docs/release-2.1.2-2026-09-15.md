# Radar Vacinal ACS — Release 2.1.2 — 15/09/2026

## Motivo
Foi confirmado em teste real no iPhone que o PWA instalado permanecia na versão 2.0.0 enquanto a versão web já estava em produção e enviando eventos ao GA4.

## Correção
- `CACHE_VERSION` atualizado para `radar-acs-v2.1.2-2026.09.15`.
- Novo service worker passa a chamar `skipWaiting()` automaticamente somente depois de concluir com sucesso o precache dos assets críticos.
- `clients.claim()` permanece no `activate` para assumir os clientes abertos após a ativação.
- A camada de release passa a solicitar explicitamente `registration.update()` na abertura, no `load`, no `pageshow` e ao voltar para a janela.
- Compatibilidade mantida com o fluxo manual antigo de `SKIP_WAITING`.
- `releaseVersion` passa a `2.1.2`.

## Escopo preservado
- Base vacinal continua `2026.09.10`.
- Schema continua `3`.
- Nenhuma regra clínica foi alterada nesta release.
- GA4 permanece `G-1R4X13FDVY` com sanitização de parâmetros.

## Evidência que motivou o hotfix
- navegador móvel: GA4 recebeu `page_view`, `patient_added` e `dose_updated`;
- PWA instalado no mesmo iPhone: tela Sobre mostrou versão `2.0.0` e ações não apareceram no GA4;
- conclusão: falha localizada no fluxo de atualização/cache do PWA instalado, não no GA4.
