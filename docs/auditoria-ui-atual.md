# Auditoria de UI — tela por tela (estado atual)

Classificação: **MANTER** · **REDESENHAR** · **REMOVER** · **ADICIONAR** · **RISCO DE REGRESSÃO**

| Tela / Estado | Classificação | Observações e ação V2 |
|---|---|---|
| **Preloader** (neon spinner + logo) | REDESENHAR | Sequência de ~2,7s é longa demais p/ ferramenta de campo. Encurtar; respeitar `prefers-reduced-motion`. |
| **Login** (`view-login`, "Acesso exclusivo", user/senha) | **REMOVER** | Credenciais hardcoded (`radar`/`acs2026`). Remover 100%: abriu → usou. Sem substituto (nada de conta/e-mail). |
| **Home – header teal** | REDESENHAR | "Radar Vacinal Premium" + "Cobertura completa — nascimento até 19 anos". Renomear (remover "Premium"); rever linguagem absoluta. |
| **Home – métricas (Total/Atraso/Atenção/Em dia)** | MANTER + RISCO DE REGRESSÃO | Depende de `analisarCalendario`. Cor-only nos cartões → **ADICIONAR** ícone/rótulo (acessibilidade). |
| **Home – busca** | MANTER | Filtro por nome funciona. |
| **Home – filtros (chips)** | MANTER | all/danger/alert/ok. |
| **Home – card "Seus Dados (ACS)"** | MANTER | Toggle travar/editar; alimenta ficha. Rever contraste do estado travado. |
| **Home – aviso privacidade** | REDESENHAR | Bom conteúdo; integrar ao novo aviso clínico + "Sobre e dados". |
| **Home – promo SuperKit** (`btn-promo-pulse`, pulsação amarela) | REDESENHAR | Animação chamativa demais; aponta direto p/ **checkout Hotmart**. Trocar destino p/ landing + UTM por placement; tornar discreto. |
| **Home – lista de pacientes** | MANTER | Cartões com status/idade/tipo. Cor-only no badge → adicionar texto/ícone. |
| **Home – FAB "Adicionar paciente"** | MANTER | |
| **Form – Cadastrar Paciente** | MANTER | Tipo/nome/nascimento + aviso clínico. Bom. |
| **Detalhe – header + progresso** | MANTER + RISCO | Barra de progresso e badge de status. |
| **Detalhe – tabs (Próximas/Calendário/Impressão)** | MANTER | |
| **Detalhe – Próximas** | REDESENHAR | Seções atraso/alerta/futuras. "Calendário em dia!" (linguagem absoluta) → revisar. |
| **Detalhe – Calendário (timeline)** | MANTER + RISCO | Toque marca dose. Preservar toggle e janela-fechada. |
| **Detalhe – Impressão (ficha)** | MANTER + RISCO | Título "…Premium". Gera PDF. |
| **Detalhe – editar paciente (modal)** | MANTER + RISCO | ⚠️ Ao salvar, **zera `applied`** — corrigir. |
| **Busca Ativa** | MANTER + RISCO | "Sua microárea está zerada de atrasos" (linguagem absoluta) → revisar. |
| **Modal Dicionário / Guia** | MANTER | Atualizar textos conforme auditoria clínica (VPC20 etc.). |
| **Confirmação de exclusão** | REDESENHAR | Usa `confirm()` nativo. **ADICIONAR** "Desfazer" e proteção contra toque acidental. |
| **Estados vazios** | MANTER | Home e busca ativa têm empty states. |
| **Estados de erro** | REDESENHAR | Só `alert("Erro ao gerar arquivo.")`. Tratar storage cheio/indisponível, backup inválido, offline. |
| **Mobile** | MANTER | `max-w-md`, mobile-first. Base boa. |
| **Desktop** | REDESENHAR | App fica numa coluna estreita centralizada; aceitável, mas rever. |
| **PWA / instalação** | **ADICIONAR** | Não existe manifest/SW. |
| **Offline** | **ADICIONAR** | Depende de CDNs; quebra offline. |
| **Atualização de versão** | **ADICIONAR** | Sem mecanismo "nova versão disponível". |
| **Sobre e dados** | **ADICIONAR** | Versões, fontes, backup/restaurar/limpar, aviso clínico. |
| **Backup / restauração** | **ADICIONAR** | Exportar/Importar/Apagar local. |
| **Compartilhar Radar** | **ADICIONAR** | Web Share API + fallback. |

## Linguagem absoluta a revisar (seção 6 do handoff)
- "Cobertura **completa** do Calendário Nacional de Vacinação 2026"
- "Sua microárea está **zerada** de atrasos vacinais"
- "**Calendário em dia!**"
→ Trocar por linguagem delimitada pelos dados ("Nenhuma pendência identificada nos registros cadastrados", etc.).
