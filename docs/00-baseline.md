# Baseline — Radar Vacinal (estado inicial antes da V2)

> Documento de congelamento do ponto de partida. Serve para auditoria e reversão.

## Git
- **Repositório:** `leothaylor/radar-vacinal-premium` (público)
- **Branch default:** `main`
- **Commit SHA inicial (baseline):** `c13f1a53d258dfbec0fafa2086cf7822f0ffde48`
- **Branch de trabalho:** `feat/radar-ampliado-v2`
- **Data do baseline:** 2026-09-09

## Estrutura de arquivos (baseline)
```
index.html            (1227 linhas — app inteiro num único arquivo)
logo-radar-acs1.png   (logo ~1.2 MB)
assets/.gitkeep       (pasta vazia)
```
Todo o app (HTML, CSS via Tailwind CDN, JS, base vacinal e dicionário) está embutido em `index.html`.

## Dependências externas (CDN) — relevantes para offline/PWA
| Dependência | Origem | Uso | Risco offline |
|---|---|---|---|
| Tailwind CSS | `cdn.tailwindcss.com` | Todo o layout/estilo | **Alto** — sem ele o app fica sem estilo |
| Lucide Icons | `unpkg.com/lucide@latest` | Ícones | Médio — `@latest` é não-versionado (instável) |
| html2pdf.js 0.10.1 | `cdnjs.cloudflare.com` | Exportação de PDF (ficha e busca ativa) | Médio — só afeta PDF |
| Inter (Google Fonts) | `fonts.googleapis.com` | Tipografia | Baixo — cai para fallback |

> Observação: `unpkg.com` **não** está na allowlist de CSP de Artifacts e é um host não versionado; ao localizar assets para o PWA, trocar Lucide por versão pinada (cdnjs/jsdelivr) ou por SVGs inline.

## Armazenamento local (localStorage) — CHAVES A PRESERVAR
| Chave | Conteúdo | Formato |
|---|---|---|
| `radarPremiumV1` | Array de pacientes | `[{ id, name, birthDate, profileType, applied: [doseId...] }]` |
| `radarPremiumProfile` | Dados do ACS p/ impressão | `{ name, equipe, microarea }` |

- `id` do paciente: `c_<timestamp>` (novos) — há também `id` histórico possível.
- `profileType`: `'crianca' | 'gestante' | 'trabsaude'` (pacientes antigos podem **não** ter esse campo → tratados como `'crianca'`).
- `applied`: array de `dose.id` marcados como aplicados.
- **Não há `schemaVersion` hoje.** A migração V2 precisa preservar essas chaves e ler os dados antigos sem perda (ver `docs/comportamento-motor-atual.md`).

## Segredos / configs embutidos
| Item | Valor atual | Ação V2 |
|---|---|---|
| `LOGIN_USER` | `"radar"` | Remover login (seção 8 do handoff) |
| `LOGIN_PASS` | `"acs2026"` | Remover |
| `KIT_ACS_URL` | `https://pay.hotmart.com/D106253909R?utm_source=radar_vacinal_premium&utm_medium=ferramenta&utm_campaign=superkit_acs` | Apontar para landing `https://superkit.rotinaacs.com.br/` com UTMs por placement (seção 17) |

## Versões (a definir na V2)
Hoje não há versionamento. Proposta (seção 24 do handoff):
- `APP_VERSION` — ex. `2.0.0`
- `DATA_SCHEMA_VERSION` — ex. `2`
- `VACCINE_DATA_VERSION` — ex. `2026.09.09` (data real da conclusão da auditoria)

## Deploy atual
- Repositório público; provável GitHub Pages a partir de `main`.
- A publicação (merge → `main` / deploy) permanece decisão humana. O trabalho V2 fica na branch `feat/radar-ampliado-v2`.
