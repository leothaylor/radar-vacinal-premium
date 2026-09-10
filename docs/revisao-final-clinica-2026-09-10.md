# Revisão clínica final — 10/09/2026

Esta revisão complementa `auditoria-vacinal-2026.md` e registra a rodada final antes de publicação da V2.

## Regra de segurança

O Radar é ferramenta de apoio à organização. Quando o aplicativo não possui informação suficiente para inferir situação vacinal com segurança (histórico, fabricante, data de dose anterior, idade gestacional, atuação profissional ou condição especial), a regra foi modelada como `history_check` ou `relative_pending`, sem gerar atraso automático.

## Fontes oficiais consultadas

1. Ministério da Saúde — Calendário de Vacinação: https://www.gov.br/saude/pt-br/vacinacao/calendario
2. Ministério da Saúde — Instrução Normativa do Calendário Nacional de Vacinação 2026: https://www.gov.br/saude/pt-br/vacinacao/publicacoes/instrucao-normativa-que-instrui-o-calendario-nacional-de-vacinacao-2026.pdf
3. Calendário Nacional de Vacinação — Criança (atualizado em 29/07/2026): https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca/view
4. Calendário Nacional de Vacinação — Gestante (atualizado em 27/08/2026): https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-gestante/view
5. Nota Técnica nº 11/2026-CGICI/DPNI/SVSA/MS — vacinação de trabalhadores da APS com vacina dengue do Instituto Butantan: https://www.gov.br/saude/pt-br/vacinacao/notas-tecnicas/nota-tecnica-no-11-2026-cgici-dpni-svsa-ms
6. Estratégias de vacinação contra a Covid-19: https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/c/covid-19/esquemas-vacinais/esquema-vacinal-covid-19

## Correções desta rodada

### Influenza infantil
- Oficial: crianças de 6 meses a menores de 6 anos devem ser vacinadas anualmente; na primeira vacinação, recebem 2 doses com 30 dias de intervalo.
- Implementação: `influ_1` passou a `history_check` com microcopy explícita. O app não tenta inferir sozinho se é primeira vacinação nem a temporada vigente.

### Covid infantil
- Oficial: o esquema depende do imunizante/histórico; o Ministério descreve esquema de 2 doses com Spikevax/Moderna e de 3 doses com Comirnaty/Pfizer.
- Implementação: as doses de Covid infantil foram tornadas conservadoras (`history_check`), especialmente a 3ª dose, que não pode virar atraso universal sem conhecer fabricante/histórico.

### Gestante
- Incluídos/explicitados: hepatite B, dT, influenza, Covid-19, febre amarela excepcional, dTpa a partir da 20ª semana e VVSR a partir da 28ª semana.
- Como o Radar não registra idade gestacional, essas recomendações ficam em `history_check`; não há cálculo fictício de semana gestacional.

### Trabalhador da saúde
- dT: conforme histórico/reforços.
- dTpa: condicionada a profissionais de saúde, parteiras tradicionais e estagiários que atuam com recém-nascidos; não é indicação universal para todo trabalhador da saúde.
- SCR: 2 doses conforme histórico para trabalhador da saúde.
- Varicela: 2 doses para trabalhador da saúde sem história da doença ou na dúvida, com avaliação do serviço.
- Dengue/APS: Nota Técnica nº 11/2026 sustenta vacina do Instituto Butantan em dose única para trabalhadores da APS de 15 a 59 anos, 11 meses e 29 dias, incluindo ACS e ACE. Como o perfil do Radar é genérico “Trabalhador de Saúde”, a recomendação foi inserida de forma condicional, pedindo confirmação de atuação/critérios/histórico.

### Status geral de perfis especiais
- Problema anterior: gestante/trabalhador sem dose marcada podia terminar em `generalStatus = ok`, exibido pela UI como “Em Dia”.
- Correção: esses perfis agora retornam `generalStatus = alert` e `requiresReview = true` quando não há atraso automático. Isso impede a afirmação “Em Dia” por falta de informação suficiente.

### Progresso
- Para criança, `history_check` continua fora do denominador de progresso.
- Para gestante/trabalhador, os itens de conferência entram no denominador para evitar estados incoerentes como `3/0`.

### Service worker
- O precache de assets críticos não engole mais erro silenciosamente. Uma falha impede a instalação incompleta do service worker e gera erro explícito no console.
- Cache version atualizado para `radar-acs-v2.0.1-2026.09.10`.

## Analytics

A integração GA4 continua propositalmente configurável. `GA4_MEASUREMENT_ID` vazio significa analytics desligado. Não foi inventado/reutilizado um ID de outra propriedade. Para o lançamento com contagem real de usuários, inserir um Measurement ID próprio do Radar antes da divulgação pública.

## Testes

A suíte foi ampliada para 25 testes e validada localmente antes do push desta revisão. Novos casos cobrem:
- influenza infantil;
- Covid infantil condicional;
- gestante nunca “ok/Em Dia” por inferência incompleta;
- dT/febre amarela na gestante;
- dT/dTpa condicional em trabalhador;
- varicela do trabalhador;
- dengue APS em dose única/condicional;
- denominador de progresso em perfis especiais;
- data/versão da base e fonte NT11.

## Situação pós-revisão

A base clínica está mais conservadora onde o Radar não possui dados suficientes para inferência automática. Ainda é obrigatório fazer smoke test em HTTPS para instalação/offline do PWA e inserir GA4 próprio se a contagem de uso fizer parte do lançamento.
