# Radar Vacinal ACS — V2 (documentação técnica)

Ferramenta gratuita, **local-first**, instalável (PWA), de apoio ao acompanhamento do Calendário Nacional de Vacinação para Agentes Comunitários de Saúde. Sem backend, sem contas e sem envio de dados de pacientes.

## Arquitetura
Single-page app estático (GitHub Pages), com a base clínica separada da UI:

```text
index.html                      App (UI + orquestração)
data/vaccine-calendar-2026.js   Base vacinal VERSIONADA (dados clínicos + metadados)
js/engine.js                    Motor clínico puro (navegador + Node) — status, migração
tests/engine.test.js            Testes (node --test) — 25 casos
service-worker.js               Offline / cache / atualização segura
manifest.webmanifest            PWA (standalone, ícones, tema)
icons/                          icon-192, icon-512, icon-maskable-512
vendor/                         Assets locais p/ offline: Tailwind CSS, Lucide, html2pdf
tailwind.config.js              Config para recompilar o CSS estático
tailwind-input.css              Entrada do Tailwind
logo-radar-acs1.png             Logo otimizada
docs/                           Auditorias, revisão clínica, relatório e changelog
```

Sem framework e sem build obrigatório para rodar. O build do Tailwind só é necessário quando classes CSS mudarem.

## Como rodar localmente
Qualquer servidor estático na raiz do projeto. Exemplo:

```bash
python -m http.server 8791
# abrir http://127.0.0.1:8791/index.html
```

> Service worker e instalação exigem HTTPS ou localhost. Em `file://` o app funciona sem SW/instalação.

## Como testar

```bash
node --test tests/engine.test.js
```

A suíte atual possui **25 testes** e cobre:
- regras `scheduled`, `eligibility_window`, `relative_to_previous_dose` e `history_check`;
- rotavírus e dependência da D2;
- HPV em janela única;
- dengue D2 relativa;
- influenza infantil por histórico/temporada;
- Covid infantil sem 3ª dose universal automática;
- gestante e trabalhador de saúde em estado conservador de revisão;
- dT/dTpa, varicela e dengue APS em trabalhador de saúde;
- migração de dados e preservação de `legacyApplied`;
- metadados e fontes da revisão 2026-09-10.

## Regra clínica central
O Radar é ferramenta de apoio, não sistema autônomo de decisão clínica.

Quando faltam dados necessários para uma inferência segura — histórico, fabricante, data da dose anterior, idade gestacional, atuação profissional ou condição especial — o motor usa `history_check` ou `relative_pending` e pede confirmação na caderneta/equipe.

Perfis `gestante` e `trabsaude` **não podem cair automaticamente em `ok/Em Dia` por ausência de informação**. O motor retorna `alert` + `requiresReview=true` nesses perfis enquanto a situação depender de conferência.

## Como atualizar a base vacinal
1. Conferir exclusivamente fontes oficiais do Ministério da Saúde/PNI.
2. Editar `data/vaccine-calendar-2026.js`.
3. Atualizar `meta.vaccineDataVersion` e `meta.revisionDate`.
4. Se consolidar/renomear IDs, adicionar mapeamento em `MIGRATION_MAP` (`js/engine.js`) **somente quando semanticamente equivalente**. Sem equivalente seguro, o ID antigo deve permanecer em `legacyApplied`.
5. Adicionar/atualizar testes para cada regra alterada e executar a suíte.
6. Registrar mudança e fonte em `docs/CHANGELOG.md` e na auditoria/revisão clínica.
7. Atualizar `CACHE_VERSION` em `service-worker.js` para impedir uso silencioso de base antiga em cache.

Revisão clínica mais recente: `docs/revisao-final-clinica-2026-09-10.md`.

## Como recompilar o CSS
Quando classes Tailwind forem alteradas:

```bash
npx tailwindcss@3 -c tailwind.config.js -i tailwind-input.css -o vendor/tailwind.build.css --minify
```

Depois, atualizar também `CACHE_VERSION` no service worker.

## Configurações centrais
No `index.html`:

| Constante | Função |
|---|---|
| `APP_VERSION` | versão do app |
| `GA4_MEASUREMENT_ID` | ID GA4; vazio = analytics desligado |
| `KIT_ACS_URL` / `SUPERKIT_BASE` | destino do SuperKit + UTMs |
| `RADAR_PUBLIC_URL` | URL de compartilhamento |

A versão/data da base vêm de `data/vaccine-calendar-2026.js`.

## Analytics (GA4)
- Integração pronta, mas **desligada enquanto `GA4_MEASUREMENT_ID` estiver vazio**.
- Eventos previstos: `patient_added`, `dose_updated`, `busca_ativa_generated`, `pdf_exported`, `superkit_click`, `share_click`, `install_prompt`, `app_installed`, `update_applied`, `backup_exported`.
- Não enviar nome, apelido, nascimento, microárea, equipe, vacina individual ligada a pessoa ou qualquer PII/dado clínico identificável.
- Para contar uso desde o lançamento público, inserir um Measurement ID próprio do Radar antes da divulgação.

## SuperKit
- Placement 1: card discreto na home (`utm_content=home`).
- Placement 2: pós-valor (após exportar PDF), com frequency cap de 1x/24h (`utm_content=after_pdf`).
- Destino: landing do SuperKit, não checkout direto.

## PWA / offline / atualização
- `manifest.webmanifest`: modo standalone, tema e ícones 192/512/maskable.
- `service-worker.js`:
  - pré-cacheia app shell e assets críticos;
  - navegação `network-first`, para buscar versão nova quando houver internet;
  - assets locais com cache para uso offline;
  - atualização aguarda confirmação do usuário antes de `SKIP_WAITING`;
  - falha de precache crítico **não é silenciosa**: registra erro e aborta instalação incompleta do SW.
- Estados previstos: offline e nova versão disponível.
- Instalação disponível em “Sobre e dados”; iOS recebe orientação manual quando necessário.

`CACHE_VERSION` atual: `radar-acs-v2.0.1-2026.09.10`.

## Armazenamento local
`localStorage`:
- `radarPremiumV1` — pacientes `[{id,name,birthDate,profileType,applied,legacyApplied}]`;
- `radarPremiumProfile` — dados do ACS `{name,equipe,microarea}`;
- `radarSchemaVersion`, `radarSkPosValorTs` — controles internos.

As chaves `radarPremium*` foram preservadas propositalmente para compatibilidade com usuários antigos.

## Backup / restauração / privacidade
Em “Sobre e dados”:
- Exportar backup JSON local;
- Restaurar backup validado/migrado;
- Apagar todos os dados com confirmação.

Nada é enviado a servidor. Se o usuário perder/apagar o aparelho sem backup, o proprietário do Radar não consegue recuperar os dados.

## Fontes clínicas
Consultar:
- `docs/auditoria-vacinal-2026.md`;
- `docs/revisao-final-clinica-2026-09-10.md`;
- `docs/CHANGELOG.md`.

A revisão de 10/09/2026 inclui Calendário Nacional de Vacinação/IN 2026, calendários atualizados de criança e gestante, NT nº 11/2026 sobre dengue em trabalhadores da APS e orientações oficiais de Covid-19.

## Como publicar
1. Executar `node --test tests/engine.test.js`.
2. Recompilar Tailwind apenas se classes mudaram.
3. Confirmar versões de app/base/cache.
4. Inserir `GA4_MEASUREMENT_ID` se a contagem desde o lançamento for requisito.
5. Merge `feat/radar-ampliado-v2` → `main`.
6. Validar no site HTTPS real: registro do SW, instalação, standalone, offline, retorno online e atualização.
7. Só então divulgar publicamente.

## Domínio
O app continua preparado para eventual `radar.rotinaacs.com.br`, mas nenhum DNS foi alterado.

## Limitações conhecidas / pendências reais
- O app guarda quais doses foram marcadas, não a data individual de aplicação. Doses relativas usam `relative_pending` quando a data anterior é necessária.
- Idade gestacional não é armazenada; recomendações gestacionais ficam em conferência, sem cálculo fictício.
- O perfil “Trabalhador de Saúde” é genérico; indicações dependentes de atuação (ex.: dTpa com recém-nascidos e dengue para APS) são apresentadas de forma condicional.
- O PWA ainda precisa de smoke test em HTTPS/dispositivo real antes da divulgação.
- GA4 permanece desligado até um Measurement ID próprio ser definido.
- Última medição Lighthouse registrada antes da revisão clínica final: Performance 75, Accessibility 94, Best Practices 96, SEO 92.
