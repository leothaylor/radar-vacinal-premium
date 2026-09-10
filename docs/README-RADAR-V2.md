# Radar Vacinal ACS — V2 (documentação técnica)

Ferramenta gratuita, **local-first**, instalável (PWA), de apoio ao acompanhamento do
Calendário Nacional de Vacinação para Agentes Comunitários de Saúde. Sem backend, sem
contas, sem envio de dados de pacientes.

## Arquitetura
Single-page app estático (GitHub Pages), agora com a base clínica **separada da UI**:

```
index.html                      App (UI + orquestração)
data/vaccine-calendar-2026.js   Base vacinal VERSIONADA (dados clínicos + metadados)
js/engine.js                    Motor clínico puro (navegador + Node) — status, migração
tests/engine.test.js            Testes (node --test) — 20 casos
service-worker.js               Offline / cache / atualização segura
manifest.webmanifest            PWA (standalone, ícones, tema)
icons/                          icon-192, icon-512, icon-maskable-512
vendor/                         Assets locais p/ offline: tailwind.build.css, lucide, html2pdf
tailwind.config.js              Config para recompilar o CSS estático
tailwind-input.css              Entrada do Tailwind
logo-radar-acs1.png             Logo (256px, otimizada)
docs/                           Auditorias, README, relatório final, changelog
```

Sem framework, sem build obrigatório para rodar. O único passo de build é recompilar o
CSS do Tailwind (abaixo), e só quando as classes usadas mudarem.

## Como rodar (local)
Qualquer servidor estático na raiz do projeto. Ex.:
```bash
python -m http.server 8791
# abrir http://127.0.0.1:8791/index.html
```
> Service worker e "Adicionar à tela inicial" exigem `https://` (ou `localhost`). Em
> `file://` o app funciona, mas sem SW/instalação.

## Como testar
```bash
node --test tests/engine.test.js
```
Cobre: cada tipo de regra (scheduled / eligibility_window / relative_to_previous_dose /
history_check), janelas do rotavírus, HPV janela única, dengue D2 relativa, e **migração
de dados** (preserva legado, não descarta, não converte dt_12 em dt_14).

## Como atualizar a base vacinal
1. Edite `data/vaccine-calendar-2026.js` (grupos/doses/regras).
2. Atualize `meta.vaccineDataVersion` e `meta.revisionDate`.
3. Se consolidar/renomear IDs de dose, adicione o mapeamento em `MIGRATION_MAP`
   (`js/engine.js`) **apenas quando for semanticamente equivalente**; caso contrário o
   ID antigo é preservado automaticamente em `legacyApplied` (nunca descartado).
4. Rode os testes e adicione casos para cada regra alterada.
5. **Registre a mudança clínica com fonte oficial** em `docs/CHANGELOG.md` e na auditoria.
6. Bump do `CACHE_VERSION` no `service-worker.js` (senão o SW serve a base antiga).

## Como recompilar o CSS (após mudar classes Tailwind)
```bash
npx tailwindcss@3 -c tailwind.config.js -i tailwind-input.css -o vendor/tailwind.build.css --minify
```
E bump do `CACHE_VERSION` no SW.

## Configurações centrais (em `index.html`, topo do `<script>` principal)
| Constante | O que é | Onde alterar |
|---|---|---|
| `APP_VERSION` | Versão do app | `const APP_VERSION` |
| `GA4_MEASUREMENT_ID` | ID do GA4 (`G-XXXX`). **Vazio = analytics desligado** | `const GA4_MEASUREMENT_ID` |
| `KIT_ACS_URL` / `SUPERKIT_BASE` | Destino do SuperKit + UTMs | `const KIT_ACS_URL` |
| `RADAR_PUBLIC_URL` | URL usada no compartilhamento | `const RADAR_PUBLIC_URL` |
| `VACCINE_DATA_VERSION` / revisão | Vêm de `data/…meta` | `data/vaccine-calendar-2026.js` |

## Analytics (GA4)
- Desligado por padrão (ID vazio). Defina `GA4_MEASUREMENT_ID = 'G-XXXXXXXXXX'` para ativar.
- Eventos: `patient_added`, `dose_updated`, `busca_ativa_generated`, `pdf_exported`,
  `superkit_click` (com `placement`), `share_click`, `install_prompt`, `app_installed`,
  `update_applied`, `backup_exported`.
- **Nunca** envia PII nem dado clínico individual — só parâmetros funcionais
  (`placement: home | after_pdf`, `type: ficha | busca_ativa`, `profile: crianca | ...`).

## SuperKit (marketing interno)
- Placement 1: card discreto na home (`utm_content=home`).
- Placement 2: pós-valor (após exportar PDF), com **frequency cap de 1x/24h**
  (`utm_content=after_pdf`), persistido em `localStorage['radarSkPosValorTs']`.
- Aponta para a landing (`SUPERKIT_BASE`), não para o checkout.

## PWA / offline / atualização
- `manifest.webmanifest` (standalone, tema `#78C7C7`, ícones 192/512/maskable).
- `service-worker.js`:
  - Pré-cacheia o app shell (index, base, motor, CSS, libs, ícones).
  - **Navegação: network-first** → quando há internet, pega a versão nova (o cache
    NÃO congela a base clínica). Offline: cai para o cache.
  - Demais assets: stale-while-revalidate.
  - Nova versão **não** ativa sozinha: espera o usuário tocar em **"Atualizar"**
    (mensagem `SKIP_WAITING`), evitando trocar de versão no meio de uma ação.
- Estados: toast "Você está offline…" e "Nova versão disponível — Atualizar".
- Instalação: botão em "Sobre e dados"; no iOS mostra instrução manual.

## Armazenamento (local-first)
- `localStorage`:
  - `radarPremiumV1` — pacientes `[{id,name,birthDate,profileType,applied,legacyApplied}]`
  - `radarPremiumProfile` — dados do ACS `{name,equipe,microarea}`
  - `radarSchemaVersion`, `radarSkPosValorTs` — controle
- Chaves mantidas com prefixo `radarPremium*` **de propósito**, para não perder dados de
  usuários antigos. Migração roda na carga (idempotente).

## Backup / restauração / privacidade
- Em "Sobre e dados": **Exportar backup** (JSON local), **Restaurar** (valida `_type` e
  formato, confirma antes de sobrescrever, migra IDs), **Apagar todos os dados** (dupla
  confirmação). Nada é enviado a servidor.
- Dados ficam só no dispositivo. Se o usuário perder o aparelho sem backup, os dados
  **não** são recuperáveis pelo dono do Radar.

## Fontes clínicas
Ver `docs/auditoria-vacinal-2026.md`. Base: **IN Calendário Nacional de Vacinação 2026 /
PNI (gov.br)** e página oficial do calendário.

## Como publicar
1. `npx tailwindcss …` se mudou classes; rode os testes.
2. Bump de `APP_VERSION` e `CACHE_VERSION` (e versão da base, se mudou).
3. Merge `feat/radar-ampliado-v2` → `main`; GitHub Pages publica a raiz.
4. Valide no site HTTPS: SW registra, "Adicionar à tela inicial", offline, atualização.

## Domínio
Preparado para eventual `radar.rotinaacs.com.br` (OG/URLs usam o GitHub Pages atual).
**Nenhum DNS foi alterado.**

## Limitações conhecidas
- O estado guarda **quais** doses foram aplicadas, não **quando**. Por isso doses
  relativas (dengue D2, rotavírus D2) usam estado conservador `relative_pending`
  ("confirme a data na caderneta"), sem inventar elegibilidade.
- Itens clínicos em **REVISÃO HUMANA** (ver auditoria) permanecem congelados.
- Perf mobile ~75 (Lighthouse throttled); LCP limitado pelo preloader — ver relatório.
- SW/instalação não validáveis em `file://`/sandbox; validar no host HTTPS.
