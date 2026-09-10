/*
 * Base vacinal do Radar Vacinal ACS — SEPARADA da UI.
 * Fonte clínica: Ministério da Saúde / PNI — Calendário Nacional de Vacinação 2026.
 * Ver docs/auditoria-vacinal-2026.md para o confronto regra-a-regra com as fontes oficiais.
 *
 * Tipos de regra (dose.rule.type):
 *   'scheduled'                  -> data-alvo = nascimento + group.ageMonths
 *   'eligibility_window'         -> válida numa janela etária (minMonths..maxMonths).
 *                                   Antes: não elegível. Dentro: pendente/atenção. Depois: janela encerrada.
 *   'relative_to_previous_dose'  -> depende da dose anterior (afterDoseId). Sem data fictícia a partir do nascimento.
 *   'history_check'              -> "conforme histórico/caderneta". NUNCA vira atraso automático.
 *
 * IMPORTANTE (migração): os IDs de dose abaixo são estáveis em relação à versão antiga
 * sempre que possível, para não perder o array `applied` dos usuários. Consolidações
 * (HPV, MenACWY adolescente, resgates) têm mapa em MIGRATION_MAP (js/engine.js).
 */
(function (root, factory) {
  var data = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else root.VACCINE_CALENDAR = data;
})(typeof self !== 'undefined' ? self : this, function () {
  var YR = 12; // meses por ano

  var meta = {
    calendarVersion: 'CNV 2026',
    vaccineDataVersion: '2026.09.09',
    revisionDate: '2026-09-09',
    sourceAuthority: 'Ministério da Saúde / PNI',
    schemaVersion: 2,
    sourceDocuments: [
      { id: 'IN2026', title: 'Instrução Normativa — Calendário Nacional de Vacinação 2026', url: 'https://www.gov.br/saude/pt-br/vacinacao/publicacoes/instrucao-normativa-que-instrui-o-calendario-nacional-de-vacinacao-2026.pdf' },
      { id: 'CAL2026', title: 'Calendário de Vacinação (página oficial)', url: 'https://www.gov.br/saude/pt-br/vacinacao/calendario' },
      { id: 'NT45', title: 'Nota Técnica 45/2026 (VPC20 em estratégias especiais/RIE)', url: 'https://www.gov.br/saude/pt-br/composicao/svsa/pni/notas-tecnicas/2026' }
    ]
  };

  // Helpers de janela (dias)
  function months(n) { return n; }
  function years(n) { return n * YR; }

  var groups = [
    { idGroup: 'g0', ageMonths: 0, ageLabel: 'Ao nascer', profileTypes: ['crianca'], doses: [
      { id: 'hepb_0', name: 'Hepatite B', doseLabel: '1ª dose (ao nascer)', rule: { type: 'scheduled' } },
      { id: 'bcg_u', name: 'BCG', doseLabel: 'dose única', rule: { type: 'scheduled' } }
    ]},
    { idGroup: 'g2', ageMonths: 2, ageLabel: '2 meses', profileTypes: ['crianca'], doses: [
      { id: 'penta_1', name: 'Penta', doseLabel: '1ª dose', indicator: 'C2', rule: { type: 'scheduled' } },
      { id: 'vip_1', name: 'VIP (poliomielite inativada)', doseLabel: '1ª dose', indicator: 'C2', rule: { type: 'scheduled' } },
      { id: 'pneumo_1', name: 'Pneumocócica 20-valente (VPC20)', doseLabel: '1ª dose', indicator: 'C2', rule: { type: 'scheduled' } },
      // Rotavírus: janela validada contra IN 2026 (D1: 1m15d a 11m29d). Alvo prático 2m.
      { id: 'rota_1', name: 'Rotavírus humano (VRH)', doseLabel: '1ª dose', rule: { type: 'eligibility_window', minDays: 45, maxDays: 364, targetMonths: 2 } }
    ]},
    { idGroup: 'g3', ageMonths: 3, ageLabel: '3 meses', profileTypes: ['crianca'], doses: [
      { id: 'menin_1', name: 'Meningocócica C', doseLabel: '1ª dose', rule: { type: 'scheduled' } }
    ]},
    { idGroup: 'g4', ageMonths: 4, ageLabel: '4 meses', profileTypes: ['crianca'], doses: [
      { id: 'penta_2', name: 'Penta', doseLabel: '2ª dose', indicator: 'C2', rule: { type: 'scheduled' } },
      { id: 'vip_2', name: 'VIP (poliomielite inativada)', doseLabel: '2ª dose', indicator: 'C2', rule: { type: 'scheduled' } },
      // Transição VPC: a 2ª dose de rotina é com VPC10 (IN 2026, nota de rodapé da transição).
      { id: 'pneumo_2', name: 'Pneumocócica 10-valente (VPC10)', doseLabel: '2ª dose', indicator: 'C2', rule: { type: 'scheduled' } },
      // Rotavírus D2: intervalo mín. 60 dias após a 1ª; janela até 23m29d. Alvo prático 4m.
      { id: 'rota_2', name: 'Rotavírus humano (VRH)', doseLabel: '2ª dose (mín. 60 dias após a 1ª)', rule: { type: 'eligibility_window', minDays: 105, maxDays: 729, targetMonths: 4, afterDoseId: 'rota_1', minIntervalDays: 60 } }
    ]},
    { idGroup: 'g5', ageMonths: 5, ageLabel: '5 meses', profileTypes: ['crianca'], doses: [
      { id: 'menin_2', name: 'Meningocócica C', doseLabel: '2ª dose', rule: { type: 'scheduled' } }
    ]},
    { idGroup: 'g6', ageMonths: 6, ageLabel: '6 meses', profileTypes: ['crianca'], doses: [
      { id: 'penta_3', name: 'Penta', doseLabel: '3ª dose', indicator: 'C2', rule: { type: 'scheduled' } },
      { id: 'vip_3', name: 'VIP (poliomielite inativada)', doseLabel: '3ª dose', indicator: 'C2', rule: { type: 'scheduled' } },
      { id: 'influ_1', name: 'Influenza', doseLabel: '1ª dose (anual, conforme campanha)', rule: { type: 'scheduled' } }
    ]},
    { idGroup: 'g6covid', ageMonths: 6, ageLabel: '6 meses — Covid-19', profileTypes: ['crianca'], doses: [
      { id: 'covid_1', name: 'Covid-19', doseLabel: '1ª dose (conforme campanha)', rule: { type: 'scheduled' } }
    ]},
    { idGroup: 'g7', ageMonths: 7, ageLabel: '7 meses', profileTypes: ['crianca'], doses: [
      { id: 'covid_2', name: 'Covid-19', doseLabel: '2ª dose (conforme campanha)', rule: { type: 'scheduled' } }
    ]},
    { idGroup: 'g9', ageMonths: 9, ageLabel: '9 meses', profileTypes: ['crianca'], doses: [
      { id: 'fa_1', name: 'Febre Amarela', doseLabel: '1ª dose', rule: { type: 'scheduled' } },
      { id: 'covid_3', name: 'Covid-19', doseLabel: '3ª dose (conforme campanha)', rule: { type: 'scheduled' } }
    ]},
    { idGroup: 'g12', ageMonths: 12, ageLabel: '12 meses', profileTypes: ['crianca'], doses: [
      { id: 'pneumo_ref', name: 'Pneumocócica 20-valente (VPC20)', doseLabel: 'reforço', indicator: 'C2', rule: { type: 'scheduled' } },
      { id: 'menacwy_ref', name: 'Meningocócica ACWY', doseLabel: 'reforço', rule: { type: 'scheduled' } },
      { id: 'scr_1', name: 'Tríplice Viral (SCR)', doseLabel: '1ª dose', indicator: 'C2', rule: { type: 'scheduled' } }
    ]},
    { idGroup: 'g15', ageMonths: 15, ageLabel: '15 meses', profileTypes: ['crianca'], doses: [
      { id: 'dtp_1', name: 'DTP', doseLabel: '1º reforço', rule: { type: 'scheduled' } },
      { id: 'vip_ref', name: 'VIP (poliomielite inativada)', doseLabel: '1º reforço', rule: { type: 'scheduled' } },
      { id: 'scr_2', name: 'Tríplice Viral / Tetraviral', doseLabel: '2ª dose', indicator: 'C2', rule: { type: 'scheduled' } },
      { id: 'vari_1', name: 'Varicela', doseLabel: '1ª dose', rule: { type: 'scheduled' } },
      { id: 'hepa_u', name: 'Hepatite A', doseLabel: 'dose única', rule: { type: 'scheduled' } }
    ]},
    { idGroup: 'g48', ageMonths: 48, ageLabel: '4 anos', profileTypes: ['crianca'], doses: [
      { id: 'dtp_2', name: 'DTP', doseLabel: '2º reforço', rule: { type: 'scheduled' } },
      // ADICIONADO (auditoria): VIP 2º reforço aos 4 anos — ausente na versão antiga.
      { id: 'vip_ref2', name: 'VIP (poliomielite inativada)', doseLabel: '2º reforço', rule: { type: 'scheduled' } },
      { id: 'fa_ref', name: 'Febre Amarela', doseLabel: 'reforço', rule: { type: 'scheduled' } },
      { id: 'vari_2', name: 'Varicela', doseLabel: '2ª dose', rule: { type: 'scheduled' } }
    ]},
    // HPV: UMA janela de elegibilidade (dose única), 9 a 14a11m29d. (Antes: duplicado por idade.)
    { idGroup: 'g_hpv', ageMonths: 108, ageLabel: 'HPV (9 a 14 anos)', profileTypes: ['crianca'], doses: [
      { id: 'hpv_dose', name: 'HPV4', doseLabel: 'dose única (9 a 14 anos)', indicator: 'C7', rule: { type: 'eligibility_window', minMonths: years(9), maxMonths: 14 * YR + 11, targetMonths: years(9) } }
    ]},
    // Dengue: D1 janela 10–14a; D2 relativa à D1 (3 meses depois). (Antes: D2 fixa aos 11a.)
    { idGroup: 'g_dengue', ageMonths: 120, ageLabel: 'Dengue (10 a 14 anos)', profileTypes: ['crianca'], doses: [
      { id: 'dengue_1', name: 'Dengue (DNG4)', doseLabel: '1ª dose (10 a 14 anos)', rule: { type: 'eligibility_window', minMonths: years(10), maxMonths: 14 * YR + 11, targetMonths: years(10) } },
      { id: 'dengue_2', name: 'Dengue (DNG4)', doseLabel: '2ª dose (3 meses após a 1ª)', rule: { type: 'relative_to_previous_dose', afterDoseId: 'dengue_1', offsetDays: 90, maxMonths: 14 * YR + 11 } }
    ]},
    // MenACWY adolescente: UMA janela 11–14a. (Antes: itens duplicados 11a/14a.)
    { idGroup: 'g_menacwy_ado', ageMonths: 132, ageLabel: 'Meningo ACWY (11 a 14 anos)', profileTypes: ['crianca'], doses: [
      { id: 'menacwy_ado', name: 'Meningocócica ACWY', doseLabel: 'dose (11 a 14 anos)', rule: { type: 'eligibility_window', minMonths: years(11), maxMonths: 14 * YR + 11, targetMonths: years(11) } }
    ]},
    { idGroup: 'g_dt_ado', ageMonths: 168, ageLabel: '14 anos', profileTypes: ['crianca'], doses: [
      { id: 'dt_14', name: 'dT (dupla adulto)', doseLabel: 'reforço (a cada 10 anos)', rule: { type: 'scheduled' } }
    ]},
    // Resgate: SEMPRE history_check — nunca vira "atraso" por idade.
    { idGroup: 'g_resgate', ageMonths: 900, ageLabel: 'Resgate (conforme histórico)', profileTypes: ['crianca'], doses: [
      { id: 'hpv_resgate', name: 'HPV4', doseLabel: 'resgate 15–19 anos (dose única)', indicator: 'C7', rule: { type: 'history_check' } },
      { id: 'scr_res', name: 'Tríplice Viral (SCR)', doseLabel: 'verificar 2 doses conforme histórico', rule: { type: 'history_check' } },
      { id: 'hepb_res', name: 'Hepatite B', doseLabel: 'verificar 3 doses conforme histórico', rule: { type: 'history_check' } },
      { id: 'fa_res', name: 'Febre Amarela', doseLabel: 'avaliar histórico', rule: { type: 'history_check' } },
      { id: 'dt_res', name: 'dT (dupla adulto)', doseLabel: 'reforço a cada 10 anos conforme histórico', rule: { type: 'history_check' } }
    ]},

    // GESTANTE
    { idGroup: 'gestante', ageMonths: 999, ageLabel: 'Gestante', profileTypes: ['gestante'], doses: [
      { id: 'dtpa_gest', name: 'dTpa', doseLabel: '1 dose a partir da 20ª semana (cada gestação)', rule: { type: 'scheduled' } },
      // ADICIONADO (auditoria): VSR/VVSR a partir da 28ª semana.
      { id: 'vsr_gest', name: 'VSR (VVSR)', doseLabel: 'dose única a partir da 28ª semana (cada gestação)', rule: { type: 'scheduled' } },
      { id: 'influ_gest', name: 'Influenza', doseLabel: '1 dose (conforme campanha)', rule: { type: 'scheduled' } },
      { id: 'hepb_gest', name: 'Hepatite B', doseLabel: 'verificar esquema conforme histórico', rule: { type: 'history_check' } },
      { id: 'covid_gest', name: 'Covid-19', doseLabel: '1 dose por gestação (conforme campanha)', rule: { type: 'scheduled' } }
    ]},

    // TRABALHADOR DE SAÚDE
    { idGroup: 'trabsaude', ageMonths: 998, ageLabel: 'Trabalhador de Saúde', profileTypes: ['trabsaude'], doses: [
      { id: 'dtpa_trab', name: 'dTpa', doseLabel: '1 dose; reforço a cada 10 anos', rule: { type: 'scheduled' } },
      { id: 'influ_trab', name: 'Influenza', doseLabel: '1 dose (conforme campanha)', rule: { type: 'scheduled' } },
      { id: 'covid_trab', name: 'Covid-19', doseLabel: 'conforme campanha vigente', rule: { type: 'scheduled' } },
      { id: 'scr_trab', name: 'Tríplice Viral (SCR)', doseLabel: 'verificar 2 doses conforme histórico', rule: { type: 'history_check' } },
      { id: 'hepb_trab', name: 'Hepatite B', doseLabel: 'verificar esquema conforme histórico', rule: { type: 'history_check' } }
      // NOTA: "Dengue APS" e "Varicela trabalhador" ficaram em REVISÃO HUMANA (sem fonte de rotina) — ver auditoria.
    ]}
  ];

  return { meta: meta, groups: groups };
});
