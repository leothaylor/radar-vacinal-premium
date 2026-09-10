# Relatório Final — Radar Vacinal ACS V2

**Branch:** `feat/radar-ampliado-v2` · **Baseline:** `c13f1a5` · **Revisão final:** 2026-09-10

## 1. Baseline (estado inicial)
App single-file (`index.html`): login hardcoded (`radar`/`acs2026`), marca "Premium", promo do SuperKit apontando para checkout Hotmart, base vacinal misturada à UI, sem PWA/offline/backup, dependente de CDNs e `localStorage` sem versionamento explícito.

## 2. Auditorias realizadas
- **Clínica inicial:** `docs/auditoria-vacinal-2026.md`.
- **Revisão clínica final:** `docs/revisao-final-clinica-2026-09-10.md`.
- **UI:** `docs/auditoria-ui-atual.md`.
- **Motor:** `docs/comportamento-motor-atual.md`.

## 3. Mudanças clínicas consolidadas
- Pneumocócica em transição 2026: VPC20 (2m), VPC10 (4m), VPC20 reforço (12m).
- VIP: 2º reforço aos 4 anos incluído.
- HPV: janela única 9–14a11m29d, sem duplicação anual; resgate tratado por histórico.
- Dengue adolescente: D2 relativa à D1, sem data fictícia.
- MenACWY 11–14: janela única.
- Rotavírus: janelas oficiais preservadas; D2 depende da D1 e, sem data da D1, vira `relative_pending`.
- Resgates: `history_check`, nunca atraso automático.
- Influenza infantil: microcopy oficial de vacinação anual (6m a <6a) e 2 doses com 30 dias na primeira vacinação; tratada conservadoramente por histórico/temporada.
- Covid infantil: esquema tratado por histórico/fabricante; 3ª dose não vira atraso universal.
- Gestante: Hepatite B, dT, influenza, Covid-19, febre amarela excepcional, dTpa ≥20 semanas e VVSR ≥28 semanas; sem cálculo fictício de idade gestacional.
- Trabalhador da saúde: dT separada de dTpa; dTpa condicional a atuação com recém-nascidos; SCR, varicela, influenza e Covid por histórico/estratégia; dengue Butantan em dose única para trabalhador da APS 15–59a11m29d, modelada condicionalmente porque o perfil do app é genérico.

## 4. Segurança de inferência
- Perfis `gestante` e `trabsaude` nunca caem em `generalStatus = ok` apenas por ausência de dado: retornam `alert` + `requiresReview = true`.
- A UI existente traduz isso como **Atenção**, evitando o falso “Em Dia”.
- Doses dependentes de data anterior sem data armazenada usam `relative_pending` e pedem confirmação na caderneta.
- `history_check` não entra na Busca Ativa automática.

## 5. Preservação de dados
- Migração preserva IDs sem equivalente em `legacyApplied`.
- `dt_12` não é convertido em `dt_14`.
- IDs semanticamente equivalentes continuam remapeados/deduplicados.
- Chaves antigas `radarPremiumV1` / `radarPremiumProfile` permanecem por compatibilidade.

## 6. Produto / plataforma
- Login e nomenclatura Premium removidos da UI.
- Base vacinal separada da interface e versionada.
- “Sobre e dados”, aviso clínico, privacidade, backup/restauração/limpeza.
- PWA instalável, manifest, ícones, assets locais e service worker.
- SuperKit aponta para landing com UTMs e frequency cap.
- Compartilhamento e Open Graph.
- GA4 preparado sem PII, mas permanece desligado enquanto `GA4_MEASUREMENT_ID` estiver vazio.
- Acessibilidade e performance melhoradas.

## 7. Service worker
- `CACHE_VERSION`: `radar-acs-v2.0.1-2026.09.10`.
- Navegação `network-first` para não congelar a base clínica quando houver internet.
- Assets locais em cache para funcionamento offline.
- Falha de precache crítico agora é explícita e aborta instalação incompleta; não existe mais `.catch(() => {})` silencioso no `install`.
- Atualização continua aguardando confirmação do usuário antes de `SKIP_WAITING`.

## 8. Testes
A suíte foi ampliada de 20 para **25 testes**. A revisão final foi executada localmente com o mesmo conteúdo dos arquivos enviados à branch:

`node --test tests/engine.test.js` → **25/25 passando**.

Cobertura adicional da rodada final:
- influenza infantil;
- Covid infantil condicional;
- gestante nunca `ok/Em Dia` por falta de dados;
- dT e febre amarela excepcional na gestante;
- dT/dTpa em trabalhador;
- varicela em trabalhador;
- dengue APS/Butantan dose única, de forma condicional;
- denominador de progresso em perfis especiais;
- revisão/versionamento `2026.09.10` e NT11.

## 9. Lighthouse / performance
Última medição executada pelo Claude Code antes da revisão clínica final:

| Métrica | Antes | Depois |
|---|---:|---:|
| Performance | 45 | 75 |
| Accessibility | 94 | 94 |
| Best Practices | 96 | 96 |
| SEO | 92 | 92 |
| FCP | 11,0 s | 2,9 s |
| LCP | 18,1 s | 5,2 s |
| TBT | 420 ms | 0 ms |
| CLS | 0 | 0,015 |

A rodada final alterou apenas dados clínicos, motor, testes, documentação e tratamento de erro do service worker; não adicionou peso relevante ao caminho crítico.

## 10. Fontes oficiais da revisão final
- Calendário de Vacinação — Ministério da Saúde.
- Instrução Normativa — Calendário Nacional de Vacinação 2026.
- Calendário Nacional de Vacinação — Criança, atualizado em 29/07/2026.
- Calendário Nacional de Vacinação — Gestante, atualizado em 27/08/2026.
- Nota Técnica nº 11/2026-CGICI/DPNI/SVSA/MS — vacinação dengue de trabalhadores da APS, incluindo ACS/ACE, com vacina do Instituto Butantan em dose única.
- Estratégias oficiais de vacinação contra a Covid-19.

Detalhes e URLs: `docs/revisao-final-clinica-2026-09-10.md`.

## 11. Pendências reais antes do lançamento público
1. **Smoke test em HTTPS/dispositivo real**: instalação, abertura standalone, offline, retorno online e fluxo de atualização do service worker.
2. **GA4**: inserir um Measurement ID próprio do Radar se o objetivo do lançamento inclui contagem real de usuários desde o primeiro dia. Não reutilizar ID de outro produto sem decisão explícita.
3. Revisar visualmente em dispositivo real se “Atenção” é suficiente para perfis especiais ou se, numa futura rodada de UI, deve virar texto explícito “Revisar situação vacinal”. Clinicamente, o falso “Em Dia” já foi eliminado pelo motor.

## 12. Estado de publicação

### PODE PUBLICAR: **NÃO AINDA PARA DIVULGAÇÃO PÚBLICA**

Motivos objetivos:
1. O PWA precisa do smoke test HTTPS que o ambiente de preview do Claude não permitiu executar.
2. O GA4 está preparado, porém desligado sem `GA4_MEASUREMENT_ID`; publicar agora perderia a contagem que motivou parte desta V2.
3. `main` permanece intocada; toda a V2 está na branch `feat/radar-ampliado-v2`.

Após **smoke test HTTPS aprovado + GA4 definido (se a contagem desde o lançamento for requisito)**, a branch pode ser considerada candidata a merge/deploy.
