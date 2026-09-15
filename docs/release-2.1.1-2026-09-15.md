# Radar Vacinal ACS — Release 2.1.1 — 15/09/2026

## Escopo
Hotfix de release sem alteração da base vacinal `2026.09.10` nem do schema `3`.

## Correções
- Fronteira superior de `maxMonths` tratada como último mês etário inclusivo no wrapper de release. Para HPV, Dengue e MenACWY, a elegibilidade é mantida até 14 anos, 11 meses e 29 dias e encerrada aos 15 anos.
- Motor V2.1 original preservado byte a byte em `js/engine-core.js` para rollback simples.
- `js/engine.js` passa a ser um wrapper fino sobre o motor preservado.
- GA4 dedicado ativado em runtime com Measurement ID `G-1R4X13FDVY`.
- Analytics sanitizado por allowlist: apenas `type` funcional (`ficha`/`busca_ativa`) e placements internos conhecidos podem ser enviados como parâmetros. Nome, nascimento, equipe, microárea, perfil clínico, vacina/dose individual e demais PII são descartados.
- Versão exibida pelo wrapper: `2.1.1`.
- `CACHE_VERSION`: `radar-acs-v2.1.1-2026.09.15`.
- `engine-core.js` adicionado ao precache do PWA.

## Evidência clínica
Ministério da Saúde, Calendário Nacional de Vacinação 2026: HPV, dengue DNG4 e meningocócica ACWY mantêm indicação até 14 anos, 11 meses e 29 dias.

## Testes
Novo arquivo `tests/release-boundary.test.js` cobre a fronteira dos 15 anos para HPV, Dengue D1, Dengue D2 e MenACWY.

## Observação arquitetural
O wrapper é deliberadamente reversível. Em futura refatoração, incorporar a semântica inclusiva de `maxMonths` diretamente ao motor e mover o Measurement ID para a configuração principal; somente então remover `engine-core.js`/wrapper.
