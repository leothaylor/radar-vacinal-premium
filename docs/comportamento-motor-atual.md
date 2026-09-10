# Congelamento do Motor — comportamento atual (antes da V2)

> Referência para não regredir cálculos ao redesenhar. Cada item aqui deve ter teste antes de qualquer refatoração.

## Modelo de dados (paciente)
```js
{ id: 'c_<timestamp>', name, birthDate: 'YYYY-MM-DD', profileType: 'crianca'|'gestante'|'trabsaude', applied: [doseId, ...] }
```
- Paciente antigo pode não ter `profileType` → default `'crianca'`.
- `applied` guarda apenas IDs de doses marcadas; não guarda datas de aplicação.

## Funções de data (a preservar exatamente)
- `addMonths(dateStr, months)` — cria `Date(dateStr+'T12:00:00')` e soma meses. Usa meio-dia p/ evitar bug de fuso.
- `getDaysDiff(target)` — dias entre hoje (00:00) e alvo (00:00), `Math.ceil`.
- `getAgeText(birthDate)` — "Recém-nascido" (<1m), "N m" (<12m), "Ya Mm" (≥12m).
- `getAgeInDays(birthDate)` — dias desde nascimento (piso).

## Cálculo de status (`analisarCalendario`) — REGRA CRÍTICA
Para cada grupo do `vaccineDatabase` filtrado por `profileType`:
- Grupos com `ageMonths >= 900` (gestante=999, trabsaude=998) → **sempre `future`** (nunca "atraso"). ✔ Preserva "conforme indicação".
- Para os demais, data-alvo = `addMonths(birthDate, group.ageMonths)`; `daysDiff` = dias até o alvo.
- Status por dose:
  - marcada em `applied` → **`applied`**
  - grupo especial → **`future`**
  - `rotaWindow` e janela fechada (`isRotaWindowClosed`) → **`window_closed`**
  - senão: `daysDiff < 0` → **`delayed`**; `daysDiff <= 30` → **`alert`**; senão **`future`**
- `generalStatus`: `danger` se houver `delayed`; senão `alert` se houver `alert`; senão `ok`.

### Janela do rotavírus (`isRotaWindowClosed`)
- `rotaWindow===1` → fechada se `getAgeInDays > 364`
- `rotaWindow===2` → fechada se `getAgeInDays > 729`
- **Validado contra IN 2026** (D1 até 11m29d, D2 até 23m29d). Manter, refinando limites p/ dias exatos.

## Progresso
- `getTotalDoses(profileType)` = soma de `doses.length` de todos os grupos do perfil.
- `pct = round(applied.length / total * 100)`. Barra e "X/Y".
- ⚠️ Bug conhecido: como `applied` pode conter IDs de doses que não existem mais na base (se a base mudar), o progresso pode ficar inconsistente após atualização de base. **Tratar na migração** (validar IDs).

## Views e navegação
`hideAllViews()` esconde `view-home|form|detail|busca-ativa`. Estados via classes `hidden`. Sem router/URL.

## Persistência (efeitos colaterais)
- `saveData()` → `localStorage['radarPremiumV1']`
- `saveProfileInline()` → `localStorage['radarPremiumProfile']`
- `toggleDose` / `addChild` / `deleteChild` / `saveEditedName` chamam `saveData()`.
- `saveEditedName` **zera `applied`** ao editar (`child.applied = []`) — comportamento a revisar (perde marcações ao só corrigir nome).

## Exportação PDF
- `exportarFicha()` e `exportarBuscaAtiva()` adicionam classe `.exporting`, esperam 400ms, chamam `html2pdf()` com `scale:2`, A4 retrato. `try/catch` com `alert("Erro ao gerar arquivo.")`.

## Comportamentos a MANTER (não regredir)
1. Grupos especiais nunca geram "atraso".
2. Ordenação da home: danger → alert → ok, depois alfabética.
3. Busca ativa lista só doses `delayed`, ordenada por nº de pendências.
4. Janela rota fechada bloqueia marcação (mostra "não aplicar").
5. Perfil do ACS trava/destrava e alimenta a ficha impressa.
6. Filtros (all/danger/alert/ok) e busca por nome.

## Bugs / riscos observados (candidatos a correção com teste)
- `saveEditedName` apaga `applied`.
- `applied` com IDs órfãos após mudança de base → progresso incorreto.
- Lucide via `@latest` (não versionado) e `unpkg` (fora de allowlists comuns).
- Sem `schemaVersion` → migração precisa detectar formato antigo pela ausência do campo.
