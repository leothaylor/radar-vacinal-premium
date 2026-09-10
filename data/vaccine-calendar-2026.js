/*
 * Base vacinal do Radar Vacinal ACS — SEPARADA da UI.
 * Fonte clínica: Ministério da Saúde / PNI — Calendário Nacional de Vacinação 2026.
 * Ver docs/auditoria-vacinal-2026.md e docs/revisao-final-clinica-2026-09-10.md.
 *
 * Tipos de regra (dose.rule.type):
 *   'scheduled'                  -> data-alvo = nascimento + group.ageMonths
 *   'eligibility_window'         -> válida numa janela etária
 *   'relative_to_previous_dose'  -> depende de dose anterior; sem data, não inventa elegibilidade
 *   'history_check'              -> depende de histórico/caderneta/condição; NUNCA vira atraso automático
 */
(function (root, factory) {
  var data = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else root.VACCINE_CALENDAR = data;
})(typeof self !== 'undefined' ? self : this, function () {
  var YR = 12;
  function years(n) { return n * YR; }

  var meta = {
    calendarVersion: 'CNV 2026',
    vaccineDataVersion: '2026.09.10',
    revisionDate: '2026-09-10',
    sourceAuthority: 'Ministério da Saúde / PNI',
    schemaVersion: 3,
    sourceDocuments: [
      { id: 'IN2026', title: 'Instrução Normativa — Calendário Nacional de Vacinação 2026', url: 'https://www.gov.br/saude/pt-br/vacinacao/publicacoes/instrucao-normativa-que-instrui-o-calendario-nacional-de-vacinacao-2026.pdf' },
      { id: 'CAL2026', title: 'Calendário de Vacinação (página oficial)', url: 'https://www.gov.br/saude/pt-br/vacinacao/calendario' },
      { id: 'CALCRI2026', title: 'Calendário Nacional de Vacinação — Criança (atualizado em 29/07/2026)', url: 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-crianca/view' },
      { id: 'CALGEST2026', title: 'Calendário Nacional de Vacinação — Gestante (atualizado em 27/08/2026)', url: 'https://www.gov.br/saude/pt-br/vacinacao/arquivos/calendario-nacional-de-vacinacao-gestante/view' },
      { id: 'NT11DENGUE', title: 'Nota Técnica nº 11/2026 — vacinação dengue em trabalhadores da APS', url: 'https://www.gov.br/saude/pt-br/vacinacao/notas-tecnicas/nota-tecnica-no-11-2026-cgici-dpni-svsa-ms' },
      { id: 'COVID2026', title: 'Estratégias de vacinação contra a Covid-19', url: 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/c/covid-19/esquemas-vacinais/esquema-vacinal-covid-19' }
    ]
  };

  var groups = [
    { idGroup: 'g0', ageMonths: 0, ageLabel: 'Ao nascer', profileTypes: ['crianca'], doses: [
      { id: 'hepb_0', name: 'Hepatite B', doseLabel: '1ª dose (ao nascer)', rule: { type: 'scheduled' } },
      { id: 'bcg_u', name: 'BCG', doseLabel: 'dose única', rule: { type: 'scheduled' } }
    ]},
    { idGroup: 'g2', ageMonths: 2, ageLabel: '2 meses', profileTypes: ['crianca'], doses: [
      { id: 'penta_1', name: 'Penta', doseLabel: '1ª dose', indicator: 'C2', rule: { type: 'scheduled' } },
      { id: 'vip_1', name: 'VIP (poliomielite inativada)', doseLabel: '1ª dose', indicator: 'C2', rule: { type: 'scheduled' } },
      { id: 'pneumo_1', name: 'Pneumocócica 20-valente (VPC20)', doseLabel: '1ª dose', indicator: 'C2', rule: { type: 'scheduled' } },
      { id: 'rota_1', name: 'Rotavírus humano (VRH)', doseLabel: '1ª dose', rule: { type: 'eligibility_window', minDays: 45, maxDays: 364, targetMonths: 2 } }
    ]},
    { idGroup: 'g3', ageMonths: 3, ageLabel: '3 meses', profileTypes: ['crianca'], doses: [
      { id: 'menin_1', name: 'Meningocócica C', doseLabel: '1ª dose', rule: { type: 'scheduled' } }
    ]},
    { idGroup: 'g4', ageMonths: 4, ageLabel: '4 meses', profileTypes: ['crianca'], doses: [
      { id: 'penta_2', name: 'Penta', doseLabel: '2ª dose', indicator: 'C2', rule: { type: 'scheduled' } },
      { id: 'vip_2', name: 'VIP (poliomielite inativada)', doseLabel: '2ª dose', indicator: 'C2', rule: { type: 'scheduled' } },
      { id: 'pneumo_2', name: 'Pneumocócica 10-valente (VPC10)', doseLabel: '2ª dose', indicator: 'C2', rule: { type: 'scheduled' } },
      { id: 'rota_2', name: 'Rotavírus humano (VRH)', doseLabel: '2ª dose (mín. 60 dias após a 1ª)', rule: { type: 'eligibility_window', minDays: 105, maxDays: 729, targetMonths: 4, afterDoseId: 'rota_1', minIntervalDays: 60 } }
    ]},
    { idGroup: 'g5', ageMonths: 5, ageLabel: '5 meses', profileTypes: ['crianca'], doses: [
      { id: 'menin_2', name: 'Meningocócica C', doseLabel: '2ª dose', rule: { type: 'scheduled' } }
    ]},
    { idGroup: 'g6', ageMonths: 6, ageLabel: '6 meses', profileTypes: ['crianca'], doses: [
      { id: 'penta_3', name: 'Penta', doseLabel: '3ª dose', indicator: 'C2', rule: { type: 'scheduled' } },
      { id: 'vip_3', name: 'VIP (poliomielite inativada)', doseLabel: '3ª dose', indicator: 'C2', rule: { type: 'scheduled' } },
      { id: 'influ_1', name: 'Influenza', doseLabel: 'vacinação anual (6m a <6a); na primeira vacinação, 2 doses com 30 dias', rule: { type: 'history_check' } }
    ]},
    { idGroup: 'g6covid', ageMonths: 6, ageLabel: '6 meses — Covid-19', profileTypes: ['crianca'], doses: [
      { id: 'covid_1', name: 'Covid-19', doseLabel: 'iniciar/completar esquema a partir de 6 meses — confirmar fabricante e histórico', rule: { type: 'history_check' } },
      { id: 'covid_2', name: 'Covid-19', doseLabel: '2ª dose conforme imunizante e intervalo — confirmar histórico', rule: { type: 'history_check' } }
    ]},
    { idGroup: 'g9', ageMonths: 9, ageLabel: '9 meses', profileTypes: ['crianca'], doses: [
      { id: 'fa_1', name: 'Febre Amarela', doseLabel: '1ª dose', rule: { type: 'scheduled' } },
      { id: 'covid_3', name: 'Covid-19', doseLabel: '3ª dose somente quando indicada pelo esquema (ex.: Comirnaty/Pfizer) — confirmar histórico', rule: { type: 'history_check' } }
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
      { id: 'vip_ref2', name: 'VIP (poliomielite inativada)', doseLabel: '2º reforço', rule: { type: 'scheduled' } },
      { id: 'fa_ref', name: 'Febre Amarela', doseLabel: 'reforço', rule: { type: 'scheduled' } },
      { id: 'vari_2', name: 'Varicela', doseLabel: '2ª dose', rule: { type: 'scheduled' } }
    ]},
    { idGroup: 'g_hpv', ageMonths: 108, ageLabel: 'HPV (9 a 14 anos)', profileTypes: ['crianca'], doses: [
      { id: 'hpv_dose', name: 'HPV4', doseLabel: 'dose única (9 a 14 anos)', indicator: 'C7', rule: { type: 'eligibility_window', minMonths: years(9), maxMonths: 14 * YR + 11, targetMonths: years(9) } }
    ]},
    { idGroup: 'g_dengue', ageMonths: 120, ageLabel: 'Dengue (10 a 14 anos)', profileTypes: ['crianca'], doses: [
      { id: 'dengue_1', name: 'Dengue (DNG4)', doseLabel: '1ª dose (10 a 14 anos)', rule: { type: 'eligibility_window', minMonths: years(10), maxMonths: 14 * YR + 11, targetMonths: years(10) } },
      { id: 'dengue_2', name: 'Dengue (DNG4)', doseLabel: '2ª dose (3 meses após a 1ª)', rule: { type: 'relative_to_previous_dose', afterDoseId: 'dengue_1', offsetDays: 90, maxMonths: 14 * YR + 11 } }
    ]},
    { idGroup: 'g_menacwy_ado', ageMonths: 132, ageLabel: 'Meningo ACWY (11 a 14 anos)', profileTypes: ['crianca'], doses: [
      { id: 'menacwy_ado', name: 'Meningocócica ACWY', doseLabel: 'dose (11 a 14 anos)', rule: { type: 'eligibility_window', minMonths: years(11), maxMonths: 14 * YR + 11, targetMonths: years(11) } }
    ]},
    { idGroup: 'g_dt_ado', ageMonths: 168, ageLabel: '14 anos', profileTypes: ['crianca'], doses: [
      { id: 'dt_14', name: 'dT (dupla adulto)', doseLabel: 'reforço; depois, conforme histórico', rule: { type: 'scheduled' } }
    ]},
    { idGroup: 'g_resgate', ageMonths: 900, ageLabel: 'Resgate (conforme histórico)', profileTypes: ['crianca'], doses: [
      { id: 'hpv_resgate', name: 'HPV4', doseLabel: 'resgate 15–19 anos (dose única; conforme estratégia local)', indicator: 'C7', rule: { type: 'history_check' } },
      { id: 'scr_res', name: 'Tríplice Viral (SCR)', doseLabel: 'verificar 2 doses conforme histórico', rule: { type: 'history_check' } },
      { id: 'hepb_res', name: 'Hepatite B', doseLabel: 'verificar 3 doses conforme histórico', rule: { type: 'history_check' } },
      { id: 'fa_res', name: 'Febre Amarela', doseLabel: 'avaliar histórico e indicação', rule: { type: 'history_check' } },
      { id: 'dt_res', name: 'dT (dupla adulto)', doseLabel: 'verificar esquema/reforços conforme histórico', rule: { type: 'history_check' } }
    ]},

    { idGroup: 'gestante', ageMonths: 999, ageLabel: 'Gestante — conferir caderneta e idade gestacional', profileTypes: ['gestante'], doses: [
      { id: 'hepb_gest', name: 'Hepatite B', doseLabel: 'verificar/completar esquema conforme histórico', rule: { type: 'history_check' } },
      { id: 'dt_gest', name: 'dT (dupla adulto)', doseLabel: 'verificar/completar esquema conforme histórico', rule: { type: 'history_check' } },
      { id: 'influ_gest', name: 'Influenza', doseLabel: '1 dose por temporada', rule: { type: 'history_check' } },
      { id: 'covid_gest', name: 'Covid-19', doseLabel: '1 dose a cada gestação', rule: { type: 'history_check' } },
      { id: 'fa_gest', name: 'Febre Amarela', doseLabel: 'somente em situações excepcionais, após avaliação de risco-benefício pelo serviço', rule: { type: 'history_check' } },
      { id: 'dtpa_gest', name: 'dTpa', doseLabel: '1 dose a partir da 20ª semana, em cada gestação', rule: { type: 'history_check' } },
      { id: 'vsr_gest', name: 'VSR (VVSR)', doseLabel: 'dose única a partir da 28ª semana, em cada gestação', rule: { type: 'history_check' } }
    ]},

    { idGroup: 'trabsaude', ageMonths: 998, ageLabel: 'Trabalhador de Saúde — conferir histórico e atuação', profileTypes: ['trabsaude'], doses: [
      { id: 'hepb_trab', name: 'Hepatite B', doseLabel: 'verificar/completar esquema conforme histórico', rule: { type: 'history_check' } },
      { id: 'dt_trab', name: 'dT (dupla adulto)', doseLabel: 'verificar esquema; reforços conforme histórico', rule: { type: 'history_check' } },
      { id: 'dtpa_trab', name: 'dTpa', doseLabel: 'recomendada para profissionais/parteiras/estagiários que atuam com recém-nascidos — confirmar atuação', rule: { type: 'history_check' } },
      { id: 'scr_trab', name: 'Tríplice Viral (SCR)', doseLabel: '2 doses para trabalhador da saúde, conforme histórico', rule: { type: 'history_check' } },
      { id: 'vari_trab', name: 'Varicela', doseLabel: '2 doses se sem história da doença ou na dúvida; avaliação do serviço', rule: { type: 'history_check' } },
      { id: 'influ_trab', name: 'Influenza', doseLabel: 'vacinação anual/conforme campanha vigente', rule: { type: 'history_check' } },
      { id: 'covid_trab', name: 'Covid-19', doseLabel: 'confirmar estratégia/campanha vigente para o perfil', rule: { type: 'history_check' } },
      { id: 'dengue_aps_trab', name: 'Dengue — Instituto Butantan', doseLabel: 'trabalhador da APS, 15–59a11m29d: dose única; confirmar critérios e histórico', rule: { type: 'history_check' } }
    ]}
  ];

  return { meta: meta, groups: groups };
});
