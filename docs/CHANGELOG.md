# Changelog — Radar Vacinal ACS

## v2.0.1 — 2026-09-10 (base vacinal `2026.09.10`)

### Revisão clínica final
- **Influenza infantil:** passou a conferência por histórico/temporada; microcopy registra vacinação anual de 6 meses a menores de 6 anos e 2 doses com 30 dias na primeira vacinação.
- **Covid infantil:** deixou de transformar automaticamente a 3ª dose em atraso universal; esquema agora é tratado de forma conservadora por depender de fabricante/histórico.
- **Gestante:** adicionados/explicitados dT conforme histórico e febre amarela apenas em situação excepcional; dTpa ≥20 semanas e VVSR ≥28 semanas permanecem, sem cálculo fictício de idade gestacional.
- **Trabalhador da saúde:** dT separada de dTpa; dTpa condicionada a atuação com recém-nascidos; incluídas varicela conforme histórico e dengue Butantan em dose única para trabalhador da APS 15–59a11m29d, de forma condicional.
- **Status geral:** gestante e trabalhador da saúde não podem mais cair em `ok/Em Dia` por falta de informação; ficam em revisão (`alert`) de forma conservadora.
- **Progresso:** perfis especiais incluem itens de conferência no denominador, evitando estados incoerentes como `3/0`.

### PWA / segurança
- `CACHE_VERSION` atualizado para `radar-acs-v2.0.1-2026.09.10`.
- Falha no precache de assets críticos não é mais engolida silenciosamente: instalação incompleta do service worker falha de forma detectável.

### Fontes
- Calendário de Vacinação do Ministério da Saúde.
- Instrução Normativa do Calendário Nacional de Vacinação 2026.
- Calendário Nacional de Vacinação — Criança, atualizado em 29/07/2026.
- Calendário Nacional de Vacinação — Gestante, atualizado em 27/08/2026.
- Nota Técnica nº 11/2026-CGICI/DPNI/SVSA/MS — trabalhadores da APS / dengue Instituto Butantan.
- Estratégias oficiais de vacinação contra a Covid-19.

Ver `docs/revisao-final-clinica-2026-09-10.md`.

## v2.0.0 — 2026-09-09 (base vacinal `2026.09.09`)

### Clínico (com fonte oficial — ver docs/auditoria-vacinal-2026.md)
- **Pneumocócica:** rotina de transição VPC20 (2m) / VPC10 (4m) / VPC20 reforço (12m).
  Fonte: IN 2026 (nota de transição) e página oficial do calendário.
- **VIP:** adicionado **2º reforço aos 4 anos** (ausente na versão anterior). Fonte: IN 2026.
- **HPV:** passa a ser **dose única na janela 9–14a11m29d** (+ resgate 15–19a), removendo a duplicação por idade. Fonte: IN 2026.
- **Dengue:** 2ª dose torna-se **relativa à 1ª** (≈3 meses depois), não idade fixa. Fonte: IN 2026.
- **Meningocócica ACWY 11–14a:** janela única. Fonte: IN 2026/calendário.
- **Gestante:** adicionada **VSR/VVSR (≥28 semanas)**; dTpa "a partir da 20ª semana". Fonte: IN 2026.
- **Rotavírus:** janela mantida (validada contra IN 2026: D1 até 11m29d, D2 até 23m29d); D2 passa a respeitar a dependência da D1.
- **Resgates** reclassificados como `history_check` — nunca viram "atraso" automático.

### Produto / técnico
- Removidos login e nomenclatura "Premium"; linguagem absoluta revisada.
- Base clínica separada da UI; motor testável; migração que **preserva dados** (`legacyApplied`), sem descartar IDs antigos e sem converter `dt_12` em `dt_14`.
- "Sobre e dados": versões, fontes, aviso clínico, privacidade, backup/restaurar/limpar.
- PWA instalável + offline (assets locais) + atualização segura.
- GA4 opcional sem PII; compartilhamento; Open Graph; SuperKit (home + pós-valor com cap).
- Acessibilidade (zoom liberado, reduced-motion, foco); performance saneada.
