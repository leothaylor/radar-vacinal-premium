# Radar Vacinal ACS — V2 (documentação técnica)

Ferramenta gratuita, **local-first**, instalável (PWA), de apoio ao acompanhamento do Calendário Nacional de Vacinação para Agentes Comunitários de Saúde. Sem backend, sem contas e sem envio de dados de pacientes.

## Arquitetura
Single-page app estático (GitHub Pages), com a base clínica separada da UI:

```text
index.html                      App (UI + orquestração)
data/vaccine-calendar-2026.js   Base vacinal VERSIONADA (dados clínicos + metadados)
js/engine.js                    Motor clínico + aprimoramentos locais V2.1
tests/engine.test.js            Testes Node do motor/migração/histórico
service-worker.js               Offline / cache / atualização segura
manifest.webmanifest            PWA (standalone, ícones, tema)
icons/                          icon-192, icon-512, icon-maskable-512
vendor/                         Assets locais p/ offline: Tailwind CSS, Lucide, html2pdf
tailwind.config.js              Config para recompilar o CSS estático
tailwind-input.css              Entrada do Tailwind
logo-radar-acs1.png             Logo otimizada
docs/                           Auditorias, revisão clínica, relatório e changelog
```

Sem framework e sem build obrigatório para rodar. O build do Tailwind só é necessário quando classes CSS mudarem. O `tailwind.config.js` varre `index.html` e `js/**/*.js` para preservar classes usadas pelos aprimoramentos de runtime.

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

A suíte cobre, entre outros pontos:
- regras `scheduled`, `eligibility_window`, `relative_to_previous_dose`, `history_check` e `history_unknown`;
- rotavírus e dependência da D2;
- HPV em janela única;
- dengue D2 relativa;
- influenza infantil por histórico/temporada;
- Covid infantil sem 3ª dose universal automática;
- gestante e trabalhador de saúde em estado conservador de revisão;
- dT/dTpa, varicela e dengue APS em trabalhador de saúde;
- migração e preservação de `legacyApplied`;
- datas de aplicação (`appliedDates`) e histórico não confirmado (`historyUnknown`);
- cálculo de dose dependente usando a data real da dose anterior quando disponível;
- preservação de datas legadas em `legacyAppliedDates`.

## Regra clínica central
O Radar é ferramenta de apoio, não sistema autônomo de decisão clínica.

Quando faltam dados necessários para uma inferência segura — histórico, fabricante, data da dose anterior, idade gestacional, atuação profissional ou condição especial — o motor usa estados conservadores e pede confirmação na caderneta/equipe.

Perfis `gestante` e `trabsaude` **não podem cair automaticamente em `ok/Em Dia` por ausência de informação**. O motor retorna `alert` + `requiresReview=true` nesses perfis enquanto a situação depender de conferência.

### Registro histórico de dose
A partir da V2.1, doses podem guardar opcionalmente a data de aplicação em `appliedDates`.

Para janelas encerradas, a interface oferece **Registrar dose anterior**. O usuário deve registrar apenas uma dose confirmada por caderneta, registro anterior ou informação validada pela equipe. Quando não há histórico confiável, pode marcar **Histórico não confirmado**; esse estado não vira atraso nem entra na Busca Ativa automaticamente.

Quando uma dose subsequente depende da data da anterior (ex.: D2 de rotavírus ou dengue), o motor:
- usa a data real se ela estiver registrada;
- mantém `relative_pending` e pede conferência se a dose anterior estiver marcada sem data;
- nunca inventa data ou elegibilidade.

## Como atualizar a base vacinal
1. Conferir exclusivamente fontes oficiais do Ministério da Saúde/PNI.
2. Editar `data/vaccine-calendar-2026.js`.
3. Atualizar `meta.vaccineDataVersion` e `meta.revisionDate` quando houver mudança clínica.
4. Se consolidar/renomear IDs, adicionar mapeamento em `MIGRATION_MAP` (`js/engine.js`) **somente quando semanticamente equivalente**. Sem equivalente seguro, o ID antigo deve permanecer em `legacyApplied`/`legacyAppliedDates`.
5. Adicionar/atualizar testes para cada regra alterada e executar a suíte.
6. Registrar mudança e fonte em `docs/CHANGELOG.md` e na auditoria/revisão clínica.
7. Atualizar `CACHE_VERSION` em `service-worker.js` para impedir uso silencioso de versão antiga em cache.

Revisão clínica mais recente: `docs/revisao-final-clinica-2026-09-10.md`.

## Como recompilar o CSS
Quando classes Tailwind forem alteradas:

```bash
npx tailwindcss@3 -c tailwind.config.js -i tailwind-input.css -o vendor/tailwind.build.css --minify
```

Depois, atualizar também `CACHE_VERSION` no service worker.

## Analytics (GA4)
A integração aceita um `GA4_MEASUREMENT_ID` no `index.html`. Vazio = analytics desligado.

Eventos previstos/instrumentados incluem `patient_added`, `dose_updated`, `historical_dose_recorded`, `dose_history_unconfirmed`, `busca_ativa_generated`, `pdf_exported`, `image_exported`, `image_shared`, `superkit_click`, `share_click`, `install_prompt`, `app_installed`, `update_applied` e `backup_exported`.

Nunca enviar nome, apelido, nascimento, microárea, equipe, vacina individual ligada a pessoa ou qualquer PII/dado clínico identificável.

## Exportação
O Radar mantém o **PDF** para impressão e arquivo A4 e adiciona **JPEG** para uso rápido no celular.

- Ficha do paciente: PDF + JPG.
- Busca Ativa: PDF + JPG.
- JPEG é gerado localmente a partir da mesma área de exportação, qualidade aproximada de 0,88.
- Após gerar JPG, o app oferece **Compartilhar**.
- Antes de compartilhar arquivo, há aviso explícito de que a imagem pode conter dados pessoais e deve circular apenas pelos canais adequados da equipe.
- Em navegadores sem compartilhamento de arquivos, a imagem é salva para compartilhamento manual.

## SuperKit
- Placement 1: card discreto na home (`utm_content=home`).
- Placement 2: pós-valor, com frequency cap de 1x/24h.
- Destino: landing do SuperKit, não checkout direto.

## PWA / offline / atualização
- `manifest.webmanifest`: modo standalone, tema e ícones 192/512/maskable.
- `service-worker.js`:
  - pré-cacheia app shell e assets críticos;
  - navegação `network-first`, para buscar versão nova quando houver internet;
  - assets locais com cache para uso offline;
  - atualização aguarda confirmação do usuário antes de `SKIP_WAITING`;
  - falha de precache crítico registra erro e aborta instalação incompleta.
- Instalação disponível em “Sobre e dados”; iOS recebe orientação manual quando necessário.

`CACHE_VERSION` da V2.1: `radar-acs-v2.1.0-2026.09.10`.

## Armazenamento local
`localStorage` mantém compatibilidade com as chaves antigas:

- `radarPremiumV1` — pacientes, agora podendo conter:
  - `id`, `name`, `birthDate`, `profileType`;
  - `applied` — IDs marcados como aplicados;
  - `appliedDates` — datas ISO opcionais por dose;
  - `historyUnknown` — IDs cujo histórico foi explicitamente declarado não confirmado;
  - `legacyApplied` — registros antigos sem equivalente semântico atual;
  - `legacyAppliedDates` — datas ligadas a registros legados.
- `radarPremiumProfile` — dados do ACS `{name,equipe,microarea}`.
- `radarSchemaVersion`, `radarSkPosValorTs` — controles internos.

`schemaVersion` atual: **3**.

As chaves `radarPremium*` foram preservadas propositalmente para compatibilidade com usuários antigos.

## Edição de paciente
Editar nome, data de nascimento ou tipo de perfil **não apaga mais as doses registradas**. A V2.1 preserva `applied`, datas de aplicação, histórico não confirmado e registros legados.

## Backup / restauração / privacidade
Em “Sobre e dados”:
- Exportar backup JSON local;
- Restaurar backup validado/migrado;
- Apagar todos os dados com confirmação.

Como o backup serializa os objetos completos de pacientes, os novos campos de histórico/data também são preservados. Nada é enviado a servidor.

## Fontes clínicas
Consultar:
- `docs/auditoria-vacinal-2026.md`;
- `docs/revisao-final-clinica-2026-09-10.md`;
- `docs/CHANGELOG.md`.

A revisão de 10/09/2026 inclui Calendário Nacional de Vacinação/IN 2026, calendários atualizados de criança e gestante, NT nº 11/2026 sobre dengue em trabalhadores da APS e orientações oficiais de Covid-19.

## Como publicar
1. Executar `node --test tests/engine.test.js`.
2. Recompilar Tailwind apenas se classes novas exigirem CSS ainda não presente no bundle.
3. Confirmar versões de app/base/schema/cache.
4. Inserir `GA4_MEASUREMENT_ID` se a contagem desde o lançamento for requisito.
5. Fazer merge da branch validada para `main`.
6. Validar no HTTPS real: edição sem perda, registro histórico, histórico não confirmado, PDF, JPG, compartilhamento, SW, instalação, standalone, offline e retorno online.
7. Só então divulgar publicamente.

## Limitações conhecidas
- Datas de aplicação são opcionais; registros antigos que só possuem “aplicada” continuam válidos, e doses dependentes permanecem conservadoras quando a data anterior não existe.
- Idade gestacional não é armazenada; recomendações gestacionais ficam em conferência, sem cálculo fictício.
- O perfil “Trabalhador de Saúde” é genérico; indicações dependentes de atuação são apresentadas de forma condicional.
- Compartilhamento direto de JPG depende de suporte do navegador à Web Share API com arquivos; há fallback para download.
- O PWA deve ser smoke-testado no HTTPS/dispositivo real após cada versão relevante.
