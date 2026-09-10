# Relatório Final — Radar Vacinal ACS V2

**Branch:** `feat/radar-ampliado-v2` · **Baseline:** `c13f1a5` · **Data:** 2026-09-09/10

## 1. Baseline (estado inicial)
App single-file (`index.html`, 1227 linhas): login hardcoded (`radar`/`acs2026`), marca
"Premium", promo do SuperKit apontando para o **checkout Hotmart**, base vacinal misturada
ao HTML, sem PWA/offline/backup, dependente de CDNs, `localStorage` sem `schemaVersion`.

## 2. Auditorias realizadas
- **Clínica** (`docs/auditoria-vacinal-2026.md`) — confronto regra-a-regra com IN 2026/PNI.
- **UI** (`docs/auditoria-ui-atual.md`) — classificação tela a tela.
- **Motor** (`docs/comportamento-motor-atual.md`) — congelamento do comportamento.

## 3. Mudanças executadas
### Clínicas (ALTA confiança, com fonte)
Pneumo VPC20/VPC10; VIP 2º reforço 4a; HPV janela única; Dengue D2 relativa; MenACWY 11–14
janela única; VSR gestante; resgates como `history_check`. Ver CHANGELOG.

### Correções da revisão externa (4)
1. Migração **preserva** dados sem equivalente em `legacyApplied` (nunca descarta).
2. Removida conversão `dt_12 → dt_14` (não equivalentes); `dt_12` vira legado.
3. Doses relativas: sem data da dose anterior, estado conservador `relative_pending`
   ("confirme a data na caderneta") — não afirma elegibilidade.
4. Rotavírus D2 respeita dependência da D1 além da janela etária.

### Produto / plataforma
Remoção de login/Premium; linguagem delimitada; "Sobre e dados"; backup/restauração/limpeza;
aviso clínico + data de revisão; PWA + offline + atualização segura; assets locais; GA4 sem
PII; compartilhamento; Open Graph; SuperKit (home + pós-valor, frequency cap, UTMs);
acessibilidade; performance.

## 4. Mudanças NÃO executadas (e motivo)
- **Itens clínicos ambíguos** (dengue trabalhador, varicela trabalhador, influenza 2 doses
  <9a, periodicidade Covid): sem fonte de rotina inequívoca → **REVISÃO HUMANA**, congelados.
- **NT 52/2026 e Guia VPC20**: transições dose-a-dose de estratégias especiais fora de escopo
  da rotina do app; não detalhadas.
- **Precisão de datas de doses relativas**: o app não guarda a data de aplicação → mantido
  conservador em vez de inventar.

## 5. Testes
- **Clínicos/motor:** `node --test tests/engine.test.js` → **20/20 passam** (inclui os 4
  casos da revisão externa e a migração).
- **Funcionais (navegador):** primeira abertura, usuário antigo migrado sem perda, cadastro,
  edição, exclusão, busca, filtros, alteração de dose (persistência), métricas, Próximas,
  Calendário, Impressão, Busca Ativa, Sobre, backup (payload), validação de restauração,
  toast/pós-valor, superkit, share — **sem erros de console** (exceto registro do SW no
  sandbox de preview).

## 6. Lighthouse (mobile, throttled, local)
| Métrica | Antes | Depois |
|---|---|---|
| Performance | 45 | **75** |
| Accessibility | 94 | 94 |
| Best Practices | 96 | 96 |
| SEO | 92 | 92 |
| FCP | 11,0 s | **2,9 s** |
| LCP | 18,1 s | **5,2 s** |
| TBT | 420 ms | **0 ms** |
| CLS | 0 | 0,015 |

Ganhos: Tailwind runtime → CSS estático (451KB→26KB); html2pdf on-demand (−906KB do caminho
crítico); logo 1,2MB→78KB; fontes assíncronas; scripts fora do head.

## 7. Problemas encontrados
- **NT 45/2026 é de estratégias especiais (RIE), não rotina** — confronto evitou erro clínico.
- Suspeita inicial sobre a janela do rotavírus era **falsa** (o app já estava correto por IN 2026).
- Bug pré-existente: editar paciente zerava `applied` (documentado; a migração/edição foi
  revista para não perder dados válidos).
- Referências `window.app`/`window.VACCINE_META` (escopo) — corrigidas.

## 8. Risco residual
- **Baixo–médio:** itens em REVISÃO HUMANA precisam de validação da equipe clínica antes de
  qualquer afirmação sobre eles.
- **Ambiente:** SW/instalação/offline não puderam ser exercitados no navegador de preview
  (bloqueio de service worker no sandbox) — precisam de validação no host HTTPS real.
- **Perf:** LCP ~5s sob throttling forte (preloader + rede). Aceitável em campo; follow-up
  possível: encurtar/loading do preloader e `preload` da logo.
- **A11y menor:** 2 avisos (contraste em alguns rótulos; ordem de headings) — não corrigidos
  para não arriscar regressão visual; documentados como follow-up.

## 9. Próximos passos (humanos)
1. Validar com a equipe clínica os itens de REVISÃO HUMANA.
2. Publicar em HTTPS e validar PWA/offline/atualização no dispositivo real.
3. (Opcional) Definir `GA4_MEASUREMENT_ID`.
4. (Opcional) Ajustes finos de perf/a11y.
5. (Opcional) Domínio `radar.rotinaacs.com.br` (DNS — decisão do dono).

## 10. Commits (branch `feat/radar-ampliado-v2`)
docs (auditorias) → base+motor+migração → correções da revisão → remoção login/Premium →
PWA assets → Sobre/backup/analytics/OG/PWA → a11y → perf → docs finais.
Todos reversíveis; `main` intocada.
