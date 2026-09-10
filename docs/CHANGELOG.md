# Changelog — Radar Vacinal ACS

## v2.0.0 — 2026-09-09 (base vacinal `2026.09.09`)

### Clínico (com fonte oficial — ver docs/auditoria-vacinal-2026.md)
- **Pneumocócica:** rotina de transição VPC20 (2m) / VPC10 (4m) / VPC20 reforço (12m).
  Fonte: IN 2026 (nota de transição) e página oficial do calendário.
- **VIP:** adicionado **2º reforço aos 4 anos** (ausente na versão anterior). Fonte: IN 2026.
- **HPV:** passa a ser **dose única na janela 9–14a11m29d** (+ resgate 15–19a), removendo a
  duplicação por idade. Fonte: IN 2026.
- **Dengue:** 2ª dose torna-se **relativa à 1ª** (≈3 meses depois), não idade fixa. Fonte: IN 2026.
- **Meningocócica ACWY 11–14a:** janela única. Fonte: IN 2026/calendário.
- **Gestante:** adicionada **VSR/VVSR (≥28 semanas)**; dTpa "a partir da 20ª semana". Fonte: IN 2026.
- **Rotavírus:** janela mantida (validada contra IN 2026: D1 até 11m29d, D2 até 23m29d);
  D2 passa a respeitar a dependência da D1.
- **Resgates** reclassificados como `history_check` — nunca viram "atraso" automático.

### Em REVISÃO HUMANA (não alterado)
Dengue para trabalhador de saúde/APS; varicela para trabalhador de saúde; influenza infantil
2 doses de primovacinação; periodicidade de Covid. Sem fonte de rotina inequívoca → congelados.

### Produto / técnico
- Removidos login e nomenclatura "Premium"; linguagem absoluta revisada.
- Base clínica separada da UI; motor testável (20 testes); migração que **preserva dados**
  (`legacyApplied`), sem descartar IDs antigos e sem converter `dt_12` em `dt_14`.
- "Sobre e dados": versões, fontes, aviso clínico, privacidade, backup/restaurar/limpar.
- PWA instalável + offline (assets locais) + atualização segura.
- GA4 opcional sem PII; compartilhamento; Open Graph; SuperKit (home + pós-valor com cap).
- Acessibilidade (zoom liberado, reduced-motion, foco); performance (Lighthouse 45→75).
