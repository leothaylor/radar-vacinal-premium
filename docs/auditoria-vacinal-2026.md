# Auditoria Clínica da Base Vacinal — Radar Vacinal (2026)

**Data da auditoria:** 2026-09-09
**Autoridade de referência:** Ministério da Saúde / PNI (Programa Nacional de Imunizações)
**Escopo:** vacinação de **ROTINA** (população geral da microárea). Regras de estratégias especiais / RIE / CRIE estão fora do escopo desta ferramenta e **não** devem ser transformadas em "atraso".

## Fontes oficiais consultadas
| # | Documento | URL | Data | Papel |
|---|---|---|---|---|
| F1 | Instrução Normativa do Calendário Nacional de Vacinação 2026 (PDF) | https://www.gov.br/saude/pt-br/vacinacao/publicacoes/instrucao-normativa-que-instrui-o-calendario-nacional-de-vacinacao-2026.pdf | 2026 | **Fonte primária de rotina** |
| F2 | Calendário de Vacinação (página oficial) | https://www.gov.br/saude/pt-br/vacinacao/calendario | 2026 | Resumo oficial por faixa etária |
| F3 | Nota Técnica nº 45/2026-CGICI/DPNI/SVSA/MS (VPC20 em **RIE**) | .../notas-tecnicas/2026/nota-tecnica-no-45-2026-cgici-dpni-svsa-ms.pdf | 14/05/2026 | **Especial/RIE — NÃO rotina** |
| F4 | Nota Técnica nº 52/2026-CGICI/DPNI/SVSA/MS (VPC20) | Referenciada em F1 (linha "Nota Técnica Nº 52/2026") | 2026 | Uso clínico especial VPC20 — **buscar texto completo** |
| F5 | Guia Técnico para Introdução da VPC20 (conjugada), 2026 | Referenciado em F1 | 2026 | Detalhes de transição VPC20 — **buscar texto completo** |

> ⚠️ **Regra de confronto de fontes:** F1 é a fonte de rotina. F3 (NT 45) trata **exclusivamente de estratégias especiais (RIE)** e afirma textualmente: *"A VACINAÇÃO DE ROTINA SERÁ REGULAMENTADA ATRAVÉS DE INFORME TÉCNICO ESPECÍFICO."* Portanto **não** se pode aplicar os esquemas da NT 45 à rotina do app. Isso foi verificado e evitou um erro clínico grave.

---

## Conceitos de tipo de regra (para nova modelagem — ver seção 3 do handoff)
- **`scheduled`** — dose com data-alvo calculada a partir do nascimento (ex.: Penta 2m).
- **`eligibility_window`** — vacina válida dentro de uma janela etária; fora da janela **não** é "atraso", é "oportunidade perdida" ou "não elegível" (ex.: HPV 9–14a, Dengue 10–14a, Rotavírus).
- **`relative_to_previous_dose`** — dose calculada a partir da dose anterior, não do nascimento (ex.: Dengue D2 = D1 + 3 meses; Rotavírus D2 = D1 + 60 dias).
- **`history_check`** — recomendação "conforme histórico/caderneta"; **nunca** vira "atraso" automático por idade (ex.: resgates de SCR, Hep B, dT, gestante Hep B).

---

## A. CRIANÇA / ADOLESCENTE

Legenda de confiança: **ALTA** (fonte oficial inequívoca) · **MÉDIA** (fonte oficial, mas detalhe operacional a confirmar) · **REVISÃO HUMANA** (ambíguo/insuficiente — NÃO alterar por conta própria).

| Vacina | Regra ATUAL no app | Tipo | Regra OFICIAL encontrada (fonte) | Divergência | Mudança proposta | Confiança |
|---|---|---|---|---|---|---|
| **BCG** | Ao nascer, dose única | scheduled | Ao nascer, dose única (F1/F2) | — | Manter | ALTA |
| **Hepatite B (ao nascer)** | 1 dose até 30 dias | scheduled | Ao nascer, preferencialmente nas primeiras 12–24h; 1ª dose (F1/F2) | Microcopy ("até 30 dias") | Manter dose; ajustar microcopy p/ "ao nascer" | ALTA |
| **Penta** | 2/4/6m, 3 doses (C2) | scheduled | 2/4/6m (F1/F2) | — | Manter | ALTA |
| **VIP (polio)** | 2/4/6m + **1 reforço aos 15m** | scheduled | 2/4/6m + **1º reforço 15m** + **2º reforço 4 anos** (F1/F2) | **App não tem o 2º reforço de VIP aos 4 anos** | **ADICIONAR** VIP 2º reforço aos 48m | ALTA |
| **Pneumocócica** | **VPC10** em 2/4/12m | scheduled | **Transição:** VPC20 **2m**, VPC10 **4m**, VPC20 **reforço 12m** (F1 linhas 983–984 + F2) | App usa VPC10 nos três pontos; nomenclatura e produto errados | **Trocar** para VPC20(2m)/VPC10(4m)/VPC20(12m); atualizar nomes e dicionário | ALTA |
| **Rotavírus (VRH)** | D1 janela até 364d; D2 até 729d | eligibility_window | **D1: 1m15d–11m29d; D2: 3m15d–23m29d; intervalo 60d (mín. 30d)** (F1 Quadro 1) | **Nenhuma divergência real** — a janela do app corresponde à oficial (≈11m29d/≈23m29d) | Manter lógica; refinar limites p/ dias exatos (1m15d/11m29d/3m15d/23m29d) e D2 relativo a D1 | ALTA |
| **Meningocócica C** | 3m e 5m | scheduled | 3m e 5m (F1/F2) | — | Manter | ALTA |
| **Meningocócica ACWY** | reforço 12m + dose 11–14a | scheduled + eligibility_window | 12m (1 dose) + 11 anos, resgate até 14a11m29d (F1/F2) | App tem itens duplicados (11a, 14a "verificar") | 12m `scheduled`; 11–14a como **1** `eligibility_window` (não repetir por idade) | ALTA |
| **Influenza** | 6m, 1ª dose (trivalente) | scheduled/anual | 6m a 6 anos: anual; **primovacinação <9 anos = 2 doses** na 1ª vez (F1/F2) | App trata como dose única e não modela sazonalidade/2 doses | Modelar como **anual** (history-based); marcar "conforme campanha"; **REVISÃO** da regra de 2 doses de primovacinação | MÉDIA |
| **Covid-19 infantil** | 6m/7m/9m (3 doses) | scheduled | Esquema primário 6/7/9m (F2) | — (bate) | Manter; marcar "conforme campanha/atualização" | MÉDIA |
| **Febre Amarela** | 9m + reforço 4a | scheduled | 9m + reforço 4 anos (F1/F2) | — | Manter | ALTA |
| **Tríplice Viral (SCR)** | D1 12m, D2 15m (tetraviral) | scheduled | D1 12m; D2 15m (tetra p/ 15m–4a) (F1/F2) | — | Manter | ALTA |
| **Varicela** | 15m (1ª) e 4a (2ª) | scheduled | 15m (monovalente/tetra) + 4 anos (F1/F2) | — | Manter | ALTA |
| **Hepatite A** | 15m dose única | scheduled | 15 meses, dose única (F1/F2) | — | Manter | ALTA |
| **DTP (reforços)** | 15m (1º) e 4a (2º) | scheduled | 15m + 4 anos (F1/F2) | — | Manter | ALTA |
| **HPV4** | Itens repetidos aos 9,12,13,14,15–19 ("dose única" várias vezes) | eligibility_window | **Dose única, janela 9–14a11m29d**; resgate **15–19a11m29d** dose única (F1 linhas 2220–2234) | **App duplica a obrigação por idade** (problema confirmado) | **1** `eligibility_window` 9–14a (dose única) + **1** janela resgate 15–19a; remover duplicações | ALTA |
| **Dengue (DNG4)** | D1 10a; **D2 fixa aos 11a** | eligibility_window + relative_to_previous | **10–14a11m29d; 2 doses aos 10 anos, intervalo 3 meses** (F1 linhas 2390–2401) | **D2 deve ser D1+3 meses, não idade fixa 11a**; é janela, não obrigação por aniversário | D1 `eligibility_window` 10–14a; **D2 `relative_to_previous_dose` (D1+90d)** | ALTA |
| **dT (adolescente)** | dt aos 12a + resgate | history_check/scheduled | 14a (3º reforço) e 24a (4º reforço); a cada 10 anos (F2) | App coloca aos 12a | Ajustar p/ 14a; tratar reforços como `history_check` a cada 10a | MÉDIA |
| **Resgates 5a/13a/15–19a** (SCR/HepB/FA/Covid "verificar") | Itens "verificar" que **não** devem virar atraso | history_check | Resgates conforme situação vacinal (F1/F2) | App já os marca como `future`/informativos (bom), mas mistura na timeline | Reclassificar explicitamente como `history_check` (sem status "atraso") | ALTA |

### Pontos suspeitos listados no handoff — veredito após confronto oficial
- **Transição VPC10→VPC20:** confirmada. Rotina = VPC20(2m)/VPC10(4m)/VPC20(12m). ✅
- **Rotavírus janelas / dependência D1↔D2:** janela do app **está correta** (11m29d/23m29d); D2 deve ser relativa a D1 (60d). ✅ (suspeita inicial de "janela errada" era falsa — validado por F1.)
- **Influenza infantil / primovacinação (2 doses):** **REVISÃO HUMANA** (regra de 2 doses na 1ª vacinação <9 anos precisa do texto operacional). ⚠️
- **Covid infantil:** esquema 6/7/9m confirmado por F2; tratar como "conforme campanha". MÉDIA.
- **HPV janela única:** confirmado que o app erra ao duplicar. ✅
- **MenACWY 11–14 como janela:** confirmado (não repetir por idade). ✅
- **Dengue D2 dependente de D1:** confirmado (D1+3 meses, não aniversário). ✅
- **Resgates SCR/HepB/dT:** confirmado que são `history_check`, nunca atraso automático. ✅

---

## B. GESTANTE

| Vacina | Regra ATUAL | Tipo | Regra OFICIAL (fonte) | Divergência | Mudança proposta | Confiança |
|---|---|---|---|---|---|---|
| **dTpa** | 1 dose por gestação | scheduled/gestação | 1 dose **a partir da 20ª semana**, cada gestação (F1 linhas 71–94) | Falta o marco "≥20 semanas" | Manter; microcopy "a partir da 20ª semana" | ALTA |
| **Hepatite B** | verificar esquema | history_check | 3 doses conforme situação vacinal (F1/F2) | — | Manter como `history_check` | ALTA |
| **Influenza** | 1 dose anual | scheduled/anual | 1 dose por gestação/sazonal (F2) | — | Manter | ALTA |
| **Covid-19** | reforço conforme campanha | history_check | 1 dose por gestação (F2) | — | Manter; "conforme campanha" | MÉDIA |
| **VSR / VVSR** | **AUSENTE** | scheduled/gestação | **1 dose única a partir da 28ª semana**, cada gestação, sem restrição de idade materna (F1 linhas 206–211) | **App não tem VSR** | **ADICIONAR** VSR (≥28 semanas) | ALTA |
| **Febre Amarela (excepcional)** | ausente | history_check | Excepcional, área de risco, avaliação médica (F1/F2) | — | Opcional: item informativo `history_check` | MÉDIA |
| **dT** | ausente | history_check | 3 doses conforme situação (F2) | — | Opcional `history_check` | MÉDIA |

---

## C. TRABALHADOR DE SAÚDE

> ⚠️ O documento de **rotina** (F1/F2) não organiza "trabalhador de saúde" como um calendário fechado próprio; traz recomendações dispersas ("atualizar situação vacinal"). Vários itens do app aqui precisam de **fonte específica**.

| Vacina | Regra ATUAL | Regra OFICIAL encontrada | Veredito | Confiança |
|---|---|---|---|---|
| **dTpa** | 1 dose mesmo tendo tomado dT | F1: profissionais de saúde recebem 1 dose de dTpa; reforço a cada 10 anos (substituir dT por dTpa) | Manter; ajustar microcopy (reforço 10/10a) | ALTA |
| **Influenza** | 1 dose anual | Grupo prioritário anual (F1/F2) | Manter | ALTA |
| **Hepatite B** | verificar esquema completo | Grupo de risco, 3 doses conforme situação | Manter `history_check` | ALTA |
| **SCR** | verificar 2 doses | Profissional de saúde: 2 doses conforme idade (F1/F2) | Manter `history_check` | ALTA |
| **Varicela** | ausente no trabalhador (só criança) | F2 cita varicela p/ trabalhadores de saúde suscetíveis | **REVISÃO HUMANA** — avaliar adicionar como `history_check` | REVISÃO |
| **Covid-19** | "reforço semestral" | F2: adultos/idosos 1 dose a cada 6 meses (grupos); periodicidade p/ trabalhador **conforme campanha** | Trocar "semestral" fixo por "conforme campanha vigente" | MÉDIA |
| **Dengue** | "2 doses (APS até 59 anos)" | **NÃO encontrado no documento de rotina** (F1 restringe dengue a 10–14 anos) | **REVISÃO HUMANA** — não asseverar como obrigação; rebaixar para "conforme informe específico" ou remover | REVISÃO |

---

## D. REGRAS ESPECIAIS / MOTOR
| Tema | Situação atual | Proposta |
|---|---|---|
| "Conforme histórico" virando "atraso" | Resgates entram como `future`; grupos especiais (999/998) sempre `future` (bom) | Formalizar `history_check` — nunca `delayed` |
| Janela de elegibilidade duplicada | HPV e MenACWY duplicados por idade | Uma única `eligibility_window` por vacina |
| Dose relativa à anterior | Não existe (datas só a partir do nascimento) | Implementar `relative_to_previous_dose` (Dengue D2, Rotavírus D2) |
| Data fictícia sem dados | Doses sem info recebem data por nascimento | Quando faltar dado, exibir "confirmar conforme histórico/caderneta/equipe" em vez de inventar |

---

## RESUMO — mudanças por nível de confiança

### Implementáveis (ALTA — fonte oficial inequívoca)
1. Pneumo: VPC20(2m) / VPC10(4m) / VPC20 reforço(12m) + nomes/dicionário.
2. Adicionar **VIP 2º reforço aos 4 anos**.
3. HPV: uma única janela 9–14a (dose única) + resgate 15–19a; remover duplicações.
4. Dengue: D1 janela 10–14a; **D2 = D1 + 3 meses** (relativa).
5. MenACWY 11–14a: uma única janela.
6. Adicionar **VSR gestante (≥28 semanas)**; microcopy dTpa "≥20 semanas".
7. Formalizar `history_check` para resgates (sem "atraso" automático).
8. Rotavírus: manter janela (validada); tornar D2 relativa a D1.

### Bloqueadas — REVISÃO HUMANA NECESSÁRIA (não alterar sem fonte)
- **Dengue para trabalhador de saúde/APS** — não sustentada pelo documento de rotina.
- **Varicela para trabalhador de saúde** — avaliar inclusão.
- **Influenza infantil: 2 doses de primovacinação (<9 anos)** — confirmar texto operacional.
- **Covid: periodicidade** (infantil e trabalhador) — depende de campanha vigente; usar linguagem "conforme campanha".
- **NT 52/2026 e Guia Técnico VPC20 (F4/F5)** — buscar texto completo antes de detalhar transições individuais de VPC.

> **Nenhuma regra clínica foi inventada.** Onde a fonte oficial não foi inequívoca, o item foi marcado como REVISÃO HUMANA e a regra atual **não** deve ser silenciosamente alterada.
