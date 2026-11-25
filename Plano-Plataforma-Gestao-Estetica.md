# Plataforma de Gestão para Clínica de Estética

## Plano diretor — do orçamento de serviços ao controle financeiro

| Campo | Conteúdo |
|---|---|
| Versão | 1.0 |
| Data | 23/11/2026 |
| Escopo | 1 unidade · equipe pequena · uso 100% interno |
| Horizonte | 28 semanas, com MVP operacional em 12 |
| Status | Proposta para decisão |

> Documento de planejamento. Prazos, custos e metas são estimativas de referência para decisão, não compromissos contratuais.

## Sumário

1. Sumário executivo
2. Diagnóstico: onde o dinheiro vaza
3. Princípios de produto
4. Personas e permissões
5. Escopo funcional por módulo
6. Fluxo ponta a ponta e ciclos de vida
7. As 12 regras de negócio que decidem o projeto
8. Modelo de dados
9. Arquitetura e stack
10. Segurança, LGPD e conformidade
11. Roadmap e cronograma
12. Esforço, custo e decisão construir × comprar
13. Implantação e migração
14. Métricas de sucesso
15. Riscos e mitigações
16. Decisões pendentes
17. Anexos

---

## 1. Sumário executivo

### 1.1 O problema em uma frase

A clínica sabe quanto vendeu, mas não sabe quanto lucrou por procedimento, não mede quantos orçamentos viraram tratamento e fecha o mês com números que não batem entre si.

### 1.2 A proposta

Uma plataforma única, de uso interno, que amarra cinco elos hoje soltos: **tabela de preços com custo real → orçamento versionado e aprovável → agenda que executa → prontuário que comprova → financeiro que reconhece receita, paga comissão e mostra margem.**

Não é um "sistema de clínica" genérico com agenda e prontuário. É um sistema cujo eixo é a **rentabilidade por procedimento**, e cuja espinha dorsal é o **orçamento** — o documento onde o preço nasce, o desconto acontece e a margem se decide.

### 1.3 Três apostas de projeto

1. **O orçamento é o documento central, não a agenda.** É nele que se ganha ou se perde dinheiro. Todo orçamento precisa de dono, validade, versão e desfecho registrado (aprovado, recusado, expirado, perdido com motivo). Sem isso, não existe funil, não existe conversão, não existe previsão de receita.
2. **Margem por procedimento é calculada, não estimada.** Cada serviço tem ficha técnica (insumos, tempo de sala, tempo de profissional) e custo padrão recalculado quando o insumo muda de preço. O sistema alerta venda abaixo do custo e mostra a margem real de cada combinação vendida.
3. **Receita é reconhecida por execução, não por recebimento.** Pacote de 10 sessões vendido por R$ 5.000 não é R$ 5.000 de receita no ato: é R$ 500 por sessão executada, com o restante em receita a reconhecer. Sem essa separação, o caixa parece bom e o lucro é ficção.

### 1.4 O que muda na prática

| Hoje | Com a plataforma |
|---|---|
| Orçamento no WhatsApp, sem histórico | Orçamento numerado, versionado, com validade e desfecho |
| Preço definido pelo "quanto o paciente aceita" | Preço piso calculado sobre custo, margem e comissão |
| Comissão calculada na planilha do mês passado | Comissão provisionada por execução e extrato por profissional |
| Pacote vendido entra inteiro no caixa do mês | Receita reconhecida por sessão; passivo de sessões a entregar |
| Estoque de toxina controlado "no olho" | Baixa por lote na execução, rastreio paciente → lote → fornecedor |
| Fechamento do mês em uma semana de conferência | Fechamento em D+3 com checklist e período travado |
| Não se sabe se o procedimento X dá lucro | DRE gerencial por procedimento, profissional e centro de custo |

### 1.5 Metas de referência para 90 dias após o go-live

| Indicador | Meta |
|---|---|
| Taxa de conversão de orçamento | Visível e ≥ 45% (linha de base medida no 1º mês) |
| Ticket médio | +10% a +15% via combos e reajuste de tabela |
| Inadimplência sobre faturamento | ≤ 3% |
| No-show | ≤ 8% |
| Estoque vencido | Zero |
| Tempo de fechamento mensal | ≤ 3 dias úteis |
| Receita por procedimento com margem conhecida | 100% dos serviços ativos |

### 1.6 Investimento e decisão recomendada

| Cenário | Custo inicial | Custo recorrente | Quando faz sentido |
|---|---|---|---|
| Construir sob medida (recomendado se houver ambição de produto) | R$ 66–142 mil (MVP) | R$ 450–1.550/mês de infra e terceiros | Processo próprio, dados sensíveis, intenção de virar SaaS ou franquia |
| Assinar SaaS de clínica | R$ 0–2 mil de implantação | R$ 4–12 mil/ano | Objetivo é apenas operar; aceita processo do fornecedor |
| ERP genérico + planilhas | R$ 0–3 mil | R$ 3–8 mil/ano | Não recomendado: não cobre orçamento clínico nem prontuário |

**Recomendação:** construir o **núcleo** (orçamento, agenda, prontuário, financeiro, comissão, estoque) e **comprar as bordas** (emissão de NFS-e via provedor, pagamentos via PSP/maquininha, contabilidade via exportação). Construir tudo — inclusive fiscal e contábil — é o caminho mais caro e mais lento.

---

## 2. Diagnóstico: onde o dinheiro vaza

### 2.1 A cadeia de valor da clínica

| Etapa | O que acontece | O que costuma falhar | O que o sistema precisa capturar |
|---|---|---|---|
| Captação | Anúncio, indicação, Instagram, walk-in | Origem não registrada | Canal, campanha, custo do lead |
| Avaliação | Profissional indica procedimentos | Indicação não vira documento | Anamnese, fotos, indicação técnica |
| Orçamento | Preço, desconto, parcelamento | Vive no WhatsApp; sem versão | Itens, preço, desconto, validade, desfecho |
| Fechamento | Sinal, parcelas, contrato | Sem contrato; sem política de sinal | Condição de pagamento, assinatura, títulos |
| Agendamento | Sessões e retornos | Encaixe, conflito, no-show | Recurso, duração, confirmação, histórico de faltas |
| Execução | Procedimento e aplicação | Insumo não baixado; lote não registrado | Ficha técnica consumida, lote, profissional |
| Pós | Retorno, avaliação, nova venda | Ninguém lembra de chamar | Recall, NPS, próxima sessão |
| Financeiro | Recebimento, comissão, imposto | Regime misturado; comissão errada | Competência, caixa, taxa, comissão, NFS-e |

### 2.2 Os sete vazamentos

| # | Vazamento | Sintoma | Efeito estimado | Módulo que resolve |
|---|---|---|---|---|
| 1 | Orçamento sem rastro | "Aquele orçamento da semana passada" | 10 p.p. de conversão perdida | Orçamento |
| 2 | Preço sem custo real | Combo "promocional" que dá prejuízo | 5–15% de margem | Tabela de preços e custo |
| 3 | Cadeira vazia | No-show sem política | 8–15% da agenda | Agenda |
| 4 | Comissão sobre venda, não sobre recebido | Comissão paga sobre parcela não recebida | 2–5% do faturamento | Comissões |
| 5 | Pacote lançado como receita no ato | Caixa bom, lucro fictício | Distorção de 20–40% no mês | Contratos e receita diferida |
| 6 | Estoque sem lote e validade | Perda de insumo e risco sanitário | 3–8% do custo | Estoque |
| 7 | Caixa único PF/PJ | Pró-labore irreal | Decisão de sócio errada | Financeiro |

**Exemplo de cálculo (vazamento 1):** 40 orçamentos/mês, ticket médio R$ 1.800, conversão de 40% para 50% → 4 vendas adicionais/mês → R$ 7.200/mês → R$ 86.400/ano. É o vazamento mais barato de corrigir e o maior em receita.

**Exemplo de cálculo (vazamento 5):** venda de 10 pacotes de R$ 5.000 no mês, 30% das sessões executadas → R$ 50.000 lançados como receita contra R$ 15.000 efetivamente entregues. O mês seguinte herda R$ 35.000 de obrigação sem receita correspondente.

### 2.3 Por que planilha + WhatsApp param de funcionar

1. **Concorrência de edição:** duas pessoas na mesma planilha geram versões divergentes e perda de dado.
2. **Sem trilha:** não se sabe quem alterou o preço, quem aprovou o desconto, quando o orçamento foi enviado.
3. **Cálculo manual:** comissão, taxa de cartão, imposto e rateio viram fórmulas frágeis que ninguém audita.
4. **Sem visão por procedimento:** a planilha soma receita, mas não cruza insumo, tempo, comissão e imposto.
5. **Risco LGPD:** dados de saúde e fotos de pacientes circulando em celulares pessoais e grupos de WhatsApp, sem controle de acesso nem retenção.

### 2.4 O que o mercado já resolve — e o que não resolve

Existem três famílias de solução, e nenhuma cobre o eixo do orçamento com margem:

- **ERPs de clínica:** fortes em agenda, prontuário e faturamento; fracos em custo por procedimento, ficha técnica de insumos e receita diferida de pacotes.
- **Prontuário eletrônico:** excelente para registro clínico; não é ferramenta comercial nem financeira.
- **Financeiro/contábil:** excelente para obrigação fiscal; não entende sessão, pacote, comissão de profissional nem orçamento.

A plataforma proposta não substitui o contador: ela produz o dado organizado que o contador consome. A fronteira é explícita no módulo fiscal.

---

## 3. Princípios de produto

1. **Um fato, um lugar.** Um pagamento é um registro; título, caixa, comissão e DRE derivam dele. Nada é digitado duas vezes.
2. **Todo número é rastreável.** Clicar em "lucro do mês" leva ao lançamento, ao documento e ao usuário que o criou.
3. **O sistema não deixa fazer errado.** Validação e bloqueio valem mais que treinamento. Se o desconto estoura a alçada, o botão não habilita.
4. **Simples para a recepção, rigoroso para o financeiro.** A mesma base, duas experiências: quem atende vê o essencial; quem fecha o mês vê tudo.
5. **Prontuário é registro legal, não anotação.** Imutável após fechamento, com aditamento, assinatura e retenção de 20 anos.
6. **Nada de tela em branco.** Ficha técnica padrão, modelos de anamnese, TCLE por procedimento, políticas default.
7. **Automação depois de processo estável.** Primeiro registrar bem; depois automatizar lembrete, cobrança e recall.
8. **Construir o núcleo, comprar as bordas.** Fiscal, pagamento e contabilidade são commodities reguladas; o diferencial está no fluxo clínico-comercial.

---

## 4. Personas e permissões

### 4.1 Quem usa

| Persona | Rotina | Precisa | Não pode |
|---|---|---|---|
| **Dona / gestora** | Fecha o mês, define preço, cobra meta | Tudo: margem, DRE, funil, comissão | — |
| **Recepção** | Agenda, orçamento, cobrança, confirmação | Paciente, agenda, orçamento, recebimento | Ver custo, margem, folha, prontuário clínico |
| **Profissional** | Atende, registra evolução, prescreve | Sua agenda, seus pacientes, prontuário, fotos | Financeiro, comissão de terceiros, preço de custo |
| **Financeiro** | Concilia, paga, emite NFS-e, fecha | Títulos, caixa, fiscal, comissão | Editar prontuário |
| **Contador (externo)** | Apura imposto, confere notas | Exportação fiscal e contábil | Qualquer dado clínico |

### 4.2 Matriz de permissões

Legenda: ● total · ◐ parcial (próprio escopo) · ○ leitura · — sem acesso

| Módulo | Dona | Recepção | Profissional | Financeiro | Contador |
|---|---|---|---|---|---|
| Orçamentos | ● | ● | ◐ | ○ | — |
| Preço e custo | ● | — | — | ○ | — |
| Agenda | ● | ● | ◐ | ○ | — |
| Prontuário | ● | — | ◐ | — | — |
| Estoque | ● | ○ | ◐ | ◐ | — |
| Contas a receber/pagar | ● | ◐ | — | ● | ○ |
| Comissões | ● | — | ◐ (própria) | ● | — |
| Fiscal | ● | — | — | ● | ○ |
| Relatórios | ● | ◐ | ◐ | ● | ○ |
| Configurações | ● | — | — | — | — |

### 4.3 Segregação mínima viável

Em equipe pequena não há como separar totalmente as funções, mas três controles são obrigatórios:

- **Desconto acima da alçada** exige aprovação registrada de outro usuário (dona ou gestora).
- **Baixa manual de título** (sem pagamento registrado) exige motivo e fica marcada para revisão.
- **Cancelamento de venda ou NFS-e** exige justificativa e gera evento de auditoria imutável.

---

## 5. Escopo funcional por módulo

Treze módulos, marcados por fase: **[MVP]** entra na primeira entrega; **[F2]** e **[F3]** nas fases seguintes.

### 5.1 Cadastros e configuração [MVP]

**Objetivo:** base única, sem duplicidade, pronta para LGPD.

**Funcionalidades**
- Paciente: dados pessoais, contato, CPF válido, endereço, origem (canal/campanha), alertas clínicos, responsável legal quando menor.
- Profissional: usuário vinculado, conselho (tipo, número, UF), especialidades, cor na agenda, perfil de comissão.
- Serviço: categoria, duração padrão, preço de lista, ficha técnica, exige avaliação, exige receita, código de serviço municipal.
- Produto: insumo ou revenda, unidade, custo médio, estoque mínimo, controla lote, registro ANVISA.
- Sala e equipamento: capacidade, custo/hora, manutenção.
- Fornecedor, forma de pagamento (taxa, prazo), centro de custo, categoria de despesa.
- Usuário, papel, MFA.

**Regras**
- CPF com dígito verificador e unicidade; telefone em E.164; e-mail validado.
- Deduplicação na criação (nome + nascimento + telefone) com aviso, não bloqueio.
- Paciente nunca é excluído: inativação + anonimização sob solicitação, preservando prontuário pelo prazo legal.

**Telas:** lista com busca e filtros; ficha 360º do paciente com linha do tempo (orçamentos, sessões, pagamentos, fotos).

### 5.2 Tabela de preços e custo [MVP]

**Objetivo:** saber quanto custa cada procedimento antes de vendê-lo. É o módulo que sustenta a aposta 2.

**Funcionalidades**
- Preço de lista por serviço, com histórico e vigência (reajuste não reescreve o passado).
- Ficha técnica: lista de insumos e quantidades por procedimento.
- Custo padrão = insumos (custo médio do estoque) + custo/hora de sala + custo/hora do profissional.
- Margem alvo por categoria; preço piso calculado; semáforo de margem.
- Preço promocional com período e limite de quantidade.
- Simulador: custo → margem → preço → comissão → lucro por sessão.

**Regras**
- Alteração de custo de insumo recalcula o custo do serviço e sinaliza serviços abaixo do piso.
- Orçamento enviado guarda snapshot de preço: mudança de tabela não altera proposta em negociação.
- Preço piso = custo ÷ (1 − margem alvo − comissão %). O sistema bloqueia venda abaixo do custo e alerta entre custo e piso.

**Telas:** editor de ficha técnica; simulador de preço; relatório de margem por serviço.

### 5.3 Orçamento [MVP]

**Objetivo:** transformar avaliação em proposta clara, aprovada e rastreável.

**Funcionalidades**
- Criar a partir do paciente ou da avaliação, reaproveitando a indicação do profissional.
- Itens: serviços avulsos, pacotes, produtos de revenda; quantidade e sessões.
- Desconto por item ou sobre o total, sempre com motivo.
- Simulação de parcelamento com taxa e valor da parcela.
- Validade configurável (padrão 15 dias); PDF com identidade da clínica; envio por WhatsApp/e-mail; cópia impressa.
- Aprovação: total, parcial (item a item) ou com ressalva; registro de data, hora, usuário e IP; assinatura no balcão.
- Versionamento: alteração gera v2 com histórico; a v1 permanece consultável.
- Motivo de perda obrigatório (preço, prazo, concorrência, desistência, sem retorno).

**Regras**
- Numeração sequencial por clínica, sem furos.
- Orçamento expirado não converte em venda sem revisão de preço.
- Item não aprovado permanece aberto para follow-up, não vira venda.

**Telas:** construtor de orçamento; funil em kanban (rascunho → enviado → negociação → aprovado → perdido); detalhe com linha do tempo de eventos.

### 5.4 Fechamento, contrato e pacotes [MVP]

**Objetivo:** converter orçamento aprovado em venda com condição de pagamento, contrato e saldo de sessões.

**Funcionalidades**
- Condições: à vista, sinal + parcelas, parcelamento no cartão, PIX, boleto, combinação de formas.
- Contrato de adesão em PDF com aceite registrado; termo de pacote com validade e regras de uso.
- Pacote: quantidade de sessões, validade, transferibilidade, regra de reajuste.
- Extrato de sessões do paciente: contratadas, executadas, saldo, validade.
- Upgrade/downgrade de pacote com ajuste financeiro proporcional.

**Regras**
- Soma das parcelas = total − descontos + acréscimos; divergência de R$ 0,01 bloqueia o fechamento.
- Sinal abate do total e não é receita até a execução (ver regra R5).
- Venda só nasce de orçamento aprovado ou de venda avulsa autorizada (walk-in).

**Telas:** checkout interno; contrato; extrato de sessões.
### 5.5 Agenda [MVP]

**Objetivo:** ocupar a cadeira certa, com o profissional certo, sem conflito e com histórico de comparecimento.

**Funcionalidades**
- Visão dia/semana/mês por profissional, sala ou equipamento; arrastar para reagendar.
- Duração real por serviço (não a padrão), com tempo de preparo e limpeza por sala.
- Status: agendado, confirmado, aguardando, em atendimento, atendido, faltou, cancelado.
- Confirmação por WhatsApp/e-mail em D−2 e D−1; confirmação manual na recepção.
- Lista de espera por profissional e por janela de horário; encaixe com alerta de conflito.
- Bloqueios: férias, almoço, manutenção de equipamento, curso.
- Recorrência: retorno de toxina em 120 dias, manutenção de laser, sessões de pacote.
- Histórico de faltas e atrasos por paciente, visível no momento de agendar.

**Regras**
- Conflito de recurso (profissional, sala, equipamento) é bloqueado, não apenas avisado.
- Procedimento que exige avaliação prévia não pode ser agendado como primeira sessão.
- Política de no-show configurável: taxa, consumo de sessão do pacote ou crédito do sinal; aplicada com registro.
- Reagendamento preserva o histórico (não sobrescreve a data original).

**Telas:** calendário; fila do dia (check-in); painel de confirmações.

### 5.6 Atendimento e prontuário [MVP básico · F2 completo]

**Objetivo:** registrar o ato clínico de forma legalmente válida, rastreável e útil para o retorno.

**Funcionalidades**
- Anamnese estruturada por modelo (geral, injetáveis, laser), com alertas automáticos: alergia, gestação, anticoagulante, histórico de herpes, cirurgia recente.
- Termo de consentimento livre e esclarecido (TCLE) por procedimento, com assinatura digital ou em tela, hash e PDF arquivado.
- Fotos antes/depois com padronização (ângulo, iluminação, distância), marca d'água e consentimento de uso de imagem separado do consentimento de tratamento.
- Evolução por sessão: técnica, produto, dose, lote, intercorrências, orientações.
- Materiais aplicados com lote e validade, vinculados ao atendimento (rastreio reverso).
- Receituário para medicamentos sujeitos a prescrição e retenção (toxina botulínica), com assinatura do profissional habilitado.
- Anexos: exames, laudos, fotos de terceiros.
- Fechamento do atendimento com bloqueio de edição; correção por aditamento datado.

**Regras**
- Prontuário fechado é imutável; correção gera aditamento com autor, data e motivo.
- Retenção mínima de 20 anos para prontuário médico (Resolução CFM 1.821/2007); para demais categorias, seguir exigência do conselho e da legislação aplicável.
- Acesso restrito ao profissional responsável e à gestora, com log de leitura.
- Foto sem consentimento registrado não é armazenada.
- Assinatura do TCLE é pré-requisito para iniciar procedimento invasivo.

**Telas:** ficha de atendimento em etapas; galeria comparativa; PDF do prontuário; prescrição.

### 5.7 Estoque [MVP básico · F2 lote e validade]

**Objetivo:** garantir insumo disponível, no lote certo, com custo real e sem perda por vencimento.

**Funcionalidades**
- Entrada por nota fiscal, com custo, lote, validade e fornecedor.
- Custo médio ponderado; atualização automática do custo dos serviços.
- Saída automática na execução do procedimento (ficha técnica), com FEFO (primeiro que vence, primeiro que sai).
- Estoque mínimo e ponto de pedido por produto; alerta de validade em 60 e 30 dias.
- Inventário cíclico com ajuste motivado; registro de perdas, quebras e devoluções.
- Curva ABC de consumo; consumo por procedimento e por profissional.
- Rastreio reverso: paciente → atendimento → lote → nota fiscal → fornecedor.

**Regras**
- Lote vencido não pode ser baixado em atendimento.
- Ajuste de inventário sempre com motivo e usuário; diferença acima de limite exige aprovação.
- Estoque negativo é bloqueado (indica erro de baixa ou entrada não lançada).

**Telas:** posição de estoque; movimentações; alertas; inventário.

### 5.8 Comissões [MVP]

**Objetivo:** pagar certo, na competência certa, sem planilha paralela.

**Funcionalidades**
- Regras por profissional: percentual sobre venda, percentual sobre recebido, valor fixo por procedimento, escalonado por meta.
- Escopo da regra: serviço, categoria, produto ou tudo; vigência com data de início e fim.
- Provisão automática no fechamento da venda e liberação na execução (ou no recebimento, conforme política).
- Estorno automático em cancelamento, devolução ou chargeback.
- Fechamento mensal: extrato por profissional, conferência, aprovação, pagamento (folha ou RPA) e lançamento no financeiro.
- Simulador "quanto o profissional recebe se vender X".

**Regras**
- Comissão padrão incide sobre valor **recebido**, não faturado; em pacote, libera proporcionalmente à sessão executada.
- Comissão paga sobre título estornado é descontada no fechamento seguinte, com rastro.
- Mudança de regra não recalcula competência fechada; vale a partir da vigência.

**Telas:** regras; extrato; fechamento; recibo.

### 5.9 Financeiro [MVP]

**Objetivo:** saber quanto entrou, quanto saiu, quanto vai entrar e quanto sobrou — por procedimento e por centro de custo.

**Funcionalidades**
- **Contas a receber:** títulos por parcela, baixa total/parcial, múltiplas formas no mesmo título, taxas e valor líquido, antecipação de cartão, renegociação, aging, régua de cobrança (D−3, D+1, D+7, D+15).
- **Contas a pagar:** fornecedores, despesas recorrentes, impostos, folha, comissões, aluguel, cartão, parcelamentos; aprovação por alçada.
- **Caixa:** abertura, sangria, suprimento, fechamento diário com conferência cega e registro de divergência.
- **Conciliação:** importação OFX/CSV, casamento automático por valor e data, fila de pendências [F2].
- **Fluxo de caixa:** realizado e projetado em 90 dias, por conta bancária.
- **DRE gerencial:** receita bruta, impostos, taxas, custos variáveis (insumos e comissão), margem de contribuição, custos fixos, resultado [F2].
- **Ponto de equilíbrio** por mês e por profissional.
- **Fechamento mensal:** checklist, provisões, trava do período e reabertura auditada.

**Regras**
- Título não é excluído: é cancelado com motivo, preservando o histórico.
- Recebimento gera lançamento financeiro, libera comissão e alimenta o caixa na mesma transação.
- Período fechado não aceita lançamento retroativo sem reabertura registrada.
- Taxa de cartão e prazo são atributos da forma de pagamento, não digitação manual.

**Telas:** contas a receber; contas a pagar; caixa; conciliação; DRE; fluxo.

### 5.10 Fiscal [MVP emissão · F2 automação]

**Objetivo:** emitir NFS-e correta sem digitar duas vezes e entregar dados ao contador.

**Funcionalidades**
- Emissão de NFS-e em padrão nacional via provedor (Focus NFe, PlugNotas ou equivalente), a partir da venda.
- Dados do tomador, código de serviço municipal, alíquota de ISS, retenções quando aplicáveis.
- PDF e XML armazenados e vinculados à venda; cancelamento com prazo e motivo.
- Exportação mensal para contabilidade (CSV/XLSX) e conciliação entre nota emitida e receita reconhecida.
- Regime tributário configurável (Simples, Lucro Presumido) para cálculo gerencial de imposto.

**Regras**
- Uma nota por venda, com numeração da prefeitura; nota cancelada não some do relatório.
- Emissão bloqueada se o cadastro do tomador estiver incompleto.
- Nota é documento fiscal: correção por cancelamento e reemissão, nunca por edição.

**Nota regulatória:** desde 01/09/2026 a NFS-e de padrão nacional é obrigatória para contribuintes do Simples Nacional (Resolução CGSN 189/2026), com cronogramas municipais próprios. Confirmar com o contador a situação do município antes do MVP.

### 5.11 CRM e recall [F2]

**Objetivo:** não perder o orçamento que não fechou e trazer o paciente de volta na hora certa.

**Funcionalidades**
- Origem do paciente e custo por canal (para CAC).
- Follow-up automático de orçamento não aprovado: D+2 (mensagem), D+7 (ligação), D+15 (última tentativa).
- Recall clínico: toxina em 120–150 dias, preenchimento em 12 meses, laser conforme protocolo.
- Aniversário, pós-procedimento (D+1 e D+7), pesquisa de NPS.
- Opt-out e preferência de canal, com registro de consentimento de marketing.

**Regras**
- Comunicação de marketing só com consentimento específico e revogável (LGPD).
- Recall não duplica: um contato ativo por paciente e motivo.

### 5.12 Relatórios e indicadores [MVP parcial]

| Relatório | Conteúdo | Decisão que habilita | Fase |
|---|---|---|---|
| Painel do dia | Agenda, check-ins, caixa, pendências | Operação | MVP |
| Funil de orçamentos | Enviados, aprovados, perdidos, conversão | Ajustar preço e follow-up | MVP |
| Produção por profissional | Sessões, receita, comissão | Meta e capacidade | MVP |
| Margem por procedimento | Receita, insumo, comissão, margem | Portfólio e preço | MVP |
| Contas a receber/aging | Vencidos, a vencer, inadimplência | Cobrança | MVP |
| Fluxo de caixa 90 dias | Realizado e projetado | Liquidez | MVP |
| Estoque crítico | Mínimo, validade, parado | Compra | MVP |
| Comissões do mês | Provisão, liberado, pago | Fechamento | MVP |
| DRE gerencial | Resultado por competência | Preço e custo fixo | F2 |
| Receita diferida | Saldo de pacotes a entregar | Risco operacional | F2 |
| Ocupação da agenda | Horas vendidas ÷ horas disponíveis | Capacidade e contratação | F2 |
| LTV e CAC | Receita por paciente, custo de aquisição | Marketing | F3 |
| NPS e reclamações | Satisfação e reincidência | Qualidade | F3 |

### 5.13 Administração [MVP]

- Usuários, papéis, MFA, sessões ativas e revogação de acesso.
- Parâmetros: alçadas de desconto, validade de orçamento, política de no-show, prazos de comissão, numeração.
- Trilha de auditoria consultável por entidade e por usuário.
- Backup automático com teste de restauração trimestral documentado.
- Exportação integral dos dados (CSV/XLSX) e portabilidade.
- Gestão de integrações e credenciais.

### 5.14 Fora de escopo (explícito)

Não entram no plano, para proteger prazo e foco:

- Portal ou aplicativo do paciente (decisão: uso 100% interno).
- Telemedicina e videochamada.
- Folha de pagamento completa e eSocial.
- Contabilidade e apuração fiscal interna (o sistema entrega dado, não substitui o contador).
- Marketplace, programa de fidelidade e cartão-presente.
- Multi-unidade e franquia (previsto na arquitetura, implementado na F3).
- BI externo e data warehouse.

---

## 6. Fluxo ponta a ponta e ciclos de vida

### 6.1 Um dia na clínica

1. **08h — recepção abre o caixa** e vê a fila do dia: 9 atendimentos, 2 confirmações pendentes, 1 paciente com histórico de falta.
2. **08h20 — paciente chega para avaliação.** Recepção faz check-in; profissional abre a ficha, registra anamnese e fotos.
3. **08h50 — profissional monta a indicação** e a recepção transforma em orçamento: 3 sessões de laser + 1 toxina, R$ 4.667.
4. **09h10 — desconto de 10%** aplicado pela recepção dentro da alçada; o total fecha em R$ 4.200 (entrada de R$ 1.200 + 3× R$ 1.000); orçamento enviado por WhatsApp e impresso; status = enviado, validade 15 dias.
5. **11h — paciente aprova no balcão**, assina no tablet; sistema registra aprovação e gera venda, contrato, títulos e saldo de sessões.
6. **11h10 — primeira sessão agendada** para o mesmo dia; sala e equipamento reservados; sessão de laser executada, insumos baixados por lote.
7. **11h50 — atendimento fechado:** evolução, lote registrado, receita de 1/3 reconhecida, comissão provisionada.
8. **14h — paciente paga entrada no PIX**; baixa automática, caixa atualizado, recibo enviado.
9. **18h — fechamento do caixa** com conferência cega; divergência de R$ 0,00; relatório do dia disponível.
10. **Fim do mês — fechamento:** comissões conferidas, NFS-e emitidas, DRE gerencial, pacotes com saldo a entregar, e o mês é travado.

### 6.2 Ciclo de vida do orçamento

| De | Para | Condição | Efeito |
|---|---|---|---|
| — | Rascunho | Criação | Número reservado, sem validade |
| Rascunho | Enviado | PDF gerado e/ou link enviado | Snapshot de preço, validade começa |
| Enviado | Em negociação | Primeira alteração comercial | Nova versão; anterior consultável |
| Em negociação | Aprovado | Aceite total ou parcial registrado | Gera venda e títulos |
| Em negociação | Recusado | Motivo informado | Entra no funil de perda |
| Enviado | Expirado | Data > validade | Só reativa com revisão de preço |
| Aprovado | Convertido | Venda confirmada | Bloqueia edição do orçamento |
| Qualquer | Cancelado | Decisão da clínica | Exige motivo e auditoria |

### 6.3 Ciclo de vida do título e do dinheiro

```
VENDA (contrato)
  │
  ├── recebíveis (parcelas) ──► recebimento ──► caixa ──► conciliação
  │                                  │
  │                                  └── comissão liberada ──► pagamento
  │
  └── receita a reconhecer (passivo)
            │
            └── sessão executada ──► receita reconhecida ──► DRE
```

| Status do título | Significado | Ação permitida |
|---|---|---|
| Aberto | Emitido, não vencido | Receber, renegociar |
| Parcial | Recebido em parte | Receber saldo |
| Pago | Quitado | Estornar com motivo |
| Vencido | Passou do vencimento | Cobrar, renegociar, protestar |
| Em cobrança | Régua ativa | Renegociar, baixar perda |
| Renegociado | Substituído por novo acordo | Consultar histórico |
| Cancelado | Sem efeito | Reemitir |

### 6.4 Ciclo do atendimento

Agendado → Confirmado → Check-in → Em atendimento → Fechado → Faturado (sessão de pacote ou avulso).

O fechamento dispara, na mesma transação: baixa de insumos, reconhecimento de receita, provisão de comissão e liberação da sala.

### 6.5 Matriz evento → consequência

| Evento | O que o sistema faz automaticamente |
|---|---|
| Orçamento aprovado | Cria venda, contrato, títulos e saldo de sessões |
| Pagamento registrado | Baixa título, atualiza caixa, libera comissão |
| Sessão executada | Baixa insumos, reconhece receita, provisiona comissão |
| No-show | Aplica política, libera horário, registra ocorrência |
| Venda cancelada | Estorna títulos, comissão, sessões e nota fiscal |
| Estoque abaixo do mínimo | Alerta de compra e sugestão de pedido |
| Lote a vencer | Alerta em 60 e 30 dias, bloqueio após vencimento |
| Título vencido | Entra na régua de cobrança e no aging |
| Fechamento mensal | Trava período, consolida DRE, gera exportação contábil |
| Paciente solicita exclusão | Anonimiza dados pessoais, preserva prontuário pelo prazo legal |

---

## 7. As 12 regras de negócio que decidem o projeto

Regras são onde os sistemas de clínica falham. Cada uma abaixo tem o efeito de uma decisão errada e o mecanismo que a garante.

### R1 — Preço nasce do custo, não do feeling

**Regra:** todo serviço tem ficha técnica e custo padrão (insumos + hora de sala + hora de profissional). Existe preço piso; venda abaixo do custo é bloqueada, entre custo e piso é alertada.
**Por quê:** é o único jeito de descobrir que o combo "mais vendido" é o que dá prejuízo.
**Como garantir:** custo recalculado a cada entrada de insumo; semáforo de margem no orçamento; relatório mensal de serviços abaixo do piso.

### R2 — Orçamento é documento versionado e imutável após envio

**Regra:** enviado, o orçamento congela preço e itens; alteração gera nova versão; validade configurável; numeração sem furos.
**Por quê:** proposta que muda sem rastro destrói a confiança e a análise de conversão.
**Como garantir:** snapshot em JSON no envio; versionamento por `parent_id`; expiração por job diário.

### R3 — Aprovação pode ser parcial

**Regra:** o paciente pode aprovar parte dos itens; o restante permanece aberto para follow-up e não vira venda.
**Por quê:** forçar "tudo ou nada" perde venda de quem aceita um procedimento e recusa outro.
**Como garantir:** status por item; venda gerada apenas com itens aprovados; saldo do orçamento visível no funil.

### R4 — Sinal, parcelamento e múltiplas formas no mesmo acordo

**Regra:** a soma das parcelas fecha exatamente com o total líquido; cada parcela pode ter forma e vencimento próprios; sinal abate do total e não é receita até a execução.
**Por quê:** é a principal fonte de divergência de caixa em clínica de estética.
**Como garantir:** validação de soma em centavos; arredondamento determinístico na última parcela; sinal modelado como receita diferida.

### R5 — Pacote é receita diferida, não faturamento

**Regra:** venda de pacote cria passivo de "receita a reconhecer"; cada sessão executada reconhece a fração correspondente.
**Por quê:** sem isso, o mês com muitas vendas parece lucrativo e o mês seguinte, com muitas execuções, parece deficitário — e a dona toma decisão errada.
**Como garantir:** conta de receita diferida; reconhecimento no fechamento do atendimento; relatório de saldo a entregar.

### R6 — Comissão sobre recebido, liberada por execução

**Regra:** comissão padrão incide sobre valor recebido; em pacote, libera proporcionalmente à sessão; cancelamento estorna.
**Por quê:** pagar comissão sobre venda não recebida transfere o risco de inadimplência para a clínica.
**Como garantir:** regra com base de cálculo explícita; provisão → liberação → pagamento como estados distintos; estorno automático.

### R7 — Cartão tem taxa e prazo

**Regra:** pagamento registra valor bruto, taxa, prazo de disponibilidade e valor líquido; o fluxo de caixa usa a data de disponibilidade.
**Por quê:** R$ 10.000 no cartão em 3× não são R$ 10.000 hoje; antecipação tem custo.
**Como garantir:** forma de pagamento parametrizada; agenda de recebíveis por parcela; antecipação lançada como despesa financeira.

### R8 — Desconto tem alçada, motivo e dono

**Regra:** limite por papel (recepção 0%, gestora 10%, dona 20%); acima exige aprovação registrada; todo desconto tem motivo.
**Por quê:** desconto é a margem saindo pela porta; sem alçada, vira hábito.
**Como garantir:** bloqueio na interface; relatório de desconto por profissional e por usuário.

### R9 — No-show tem política, não improviso

**Regra:** confirmação em D−2 e D−1; falta gera taxa, consumo de sessão ou perda do sinal, conforme política; histórico visível no agendamento.
**Por quê:** cadeira vazia é o custo fixo que não se recupera.
**Como garantir:** status próprios; regra aplicada no fechamento do dia; relatório de faltas por paciente e por horário.

### R10 — Estoque baixa na execução, por lote

**Regra:** ao fechar o atendimento, o sistema baixa os insumos da ficha técnica pelo lote que vence primeiro e registra o lote no prontuário.
**Por quê:** garante custo real, evita vencimento e permite rastrear reação adversa até o fornecedor.
**Como garantir:** vínculo atendimento → itens → lote; bloqueio de lote vencido; alerta de divergência.

### R11 — Estorno é em cascata

**Regra:** cancelar venda estorna títulos, comissão, sessões, estoque e nota fiscal, nessa ordem, com trilha.
**Por quê:** cancelamento parcial deixa saldo fantasma e comissão paga indevidamente.
**Como garantir:** operação transacional com compensação; eventos de estorno; conciliação mensal de estornos.

### R12 — Competência e caixa são relatórios distintos

**Regra:** DRE por competência (receita reconhecida) e fluxo de caixa (entradas e saídas) coexistem; fechamento mensal trava o período.
**Por quê:** misturar os dois regimes é a razão de a clínica "vender bem e não ter dinheiro".
**Como garantir:** duas visões sobre os mesmos fatos; checklist de fechamento; reabertura auditada.
---

## 8. Modelo de dados

### 8.1 Convenções

- **Dinheiro em centavos (inteiro).** Nunca `float`. Arredondamento só na apresentação e na última parcela.
- **Datas em UTC**, exibidas no fuso da clínica (`America/Sao_Paulo`). Competência como `YYYY-MM`.
- **IDs opacos** (UUID v7 ou ULID) para permitir sincronização e integração futura.
- **Exclusão lógica** em cadastros; **imutabilidade** em prontuário fechado, título baixado, nota emitida e evento de auditoria.
- **`tenant_id` em todas as tabelas** desde o dia 1 (custo zero agora, dor enorme depois).
- **Auditoria** por entidade: quem, quando, de→para, IP.

### 8.2 Domínios

| Domínio | Entidades | Responsabilidade |
|---|---|---|
| Identidade e acesso | user, role, permission, user_role, session | Quem entra e o que vê |
| Clínico | patient, patient_consent, anamnesis, professional | Quem é atendido e por quem |
| Catálogo | service, service_material, product, room, equipment | O que é vendido e o que consome |
| Comercial | quote, quote_item, quote_event, sale, sale_item, contract | Do orçamento à venda |
| Agenda | appointment, waitlist, block | Quando e onde acontece |
| Atendimento | encounter, evolution, photo, prescription, consent_term | O que foi feito e comprovado |
| Estoque | stock_lot, stock_movement, inventory_count | O que entrou, saiu e vence |
| Financeiro | receivable, payment, payable, cash_session, bank_account, bank_transaction | O que entra, sai e sobra |
| Comissão | commission_rule, commission_entry | Quanto cada um recebe |
| Fiscal | invoice | O que foi declarado |
| Relacionamento | recall_task, notification, nps | Como o paciente volta |
| Plataforma | audit_log, attachment, setting, sequence | Governança e operação |

### 8.3 Entidades e campos-chave

| Entidade | Campos-chave | Observações |
|---|---|---|
| patient | nome, cpf, nascimento, telefone, email, origem, status, alertas | CPF único; soft delete; anonimização LGPD |
| patient_consent | patient_id, tipo, versao_termo, assinado_at, ip, hash, revogado_at | Tipos: dados, imagem, marketing |
| anamnesis | patient_id, template_id, respostas (jsonb), alertas | Versionada; nunca sobrescreve |
| professional | user_id, conselho, numero, uf, especialidades, comissao_perfil | Conselho obrigatório se exigir prescrição |
| service | nome, categoria, duracao_min, preco_lista, custo_padrao, exige_receita, ativo | Reajuste por vigência |
| service_material | service_id, product_id, quantidade | Ficha técnica (BOM) |
| product | nome, tipo, unidade, custo_medio, estoque_min, controla_lote, registro_anvisa | Custo médio ponderado |
| stock_lot | product_id, lote, validade, qtd_inicial, qtd_atual, fornecedor_id, nf | FEFO; bloqueio vencido |
| stock_movement | product_id, lot_id, tipo, qtd, motivo, encounter_id, user_id | Entrada, saída, ajuste, perda |
| quote | numero, patient_id, profissional_id, status, versao, validade, totais, aprovado_at | Snapshot de preço |
| quote_item | quote_id, service_id, qtd_sessoes, valor_unit, desconto, total, status_item | Aprovação item a item |
| quote_event | quote_id, tipo, payload, user_id, at | Trilha imutável |
| sale | quote_id, patient_id, tipo, valor_total, condicao, status | Avulso ou pacote |
| sale_item | sale_id, service_id, qtd_sessoes, valor, receita_reconhecida, sessoes_executadas | Base da receita diferida |
| contract | sale_id, pdf_url, aceite_at, aceite_ip, hash | Termo de adesão |
| receivable | sale_id, parcela, vencimento, valor, valor_pago, status, forma_id | Um por parcela |
| payment | receivable_id, valor, taxa, valor_liquido, data, gateway_txid, conciliado_at | Um título, N pagamentos |
| payable | fornecedor_id, categoria_id, centro_custo_id, vencimento, valor, status, recorrencia_id | Aprovação por alçada |
| cash_session | abertura, fechamento, saldo_sistema, saldo_informado, diferenca | Conferência cega |
| appointment | patient_id, professional_id, room_id, inicio, fim, status, sale_item_id | Conflito bloqueado |
| encounter | appointment_id, status, iniciado_at, fechado_at, assinado_por | Fechamento imutável |
| evolution | encounter_id, texto, intercorrencias, retorno_em | Aditamento datado |
| encounter_material | encounter_id, product_id, lot_id, qtd | Rastreio reverso |
| photo | patient_id, encounter_id, tipo, angulo, storage_key, consentimento_id | Sem consentimento, não grava |
| commission_rule | professional_id, escopo, base, percentual, vigencia, meta | Base: venda, recebido, execução |
| commission_entry | professional_id, sale_item_id, base_calculo, valor, competencia, status | Previsto, liberado, pago |
| invoice | sale_id, numero, serie, codigo_verificacao, status, xml_url, pdf_url | Cancelamento com prazo |
| recall_task | patient_id, motivo, due_date, status, responsavel | Um ativo por motivo |
| audit_log | user_id, entidade, entidade_id, acao, antes, depois, ip, at | Somente inserção |

### 8.4 Relacionamentos que sustentam as regras

- `quote 1—N quote_item` e `quote 1—N sale`: o orçamento sobrevive à venda; nunca é apagado.
- `sale 1—N receivable 1—N payment`: o título é a unidade de cobrança; o pagamento é a unidade de caixa.
- `sale_item 1—N encounter`: cada sessão executada aponta para o item que a vendeu — é o que permite receita diferida e comissão proporcional.
- `encounter 1—N encounter_material → stock_lot`: fecha o ciclo insumo → paciente → lote → fornecedor.
- `commission_entry` referencia `sale_item` **e** `payment`: a base de cálculo fica explícita e auditável.

### 8.5 Índices e desempenho

- `appointment (tenant_id, professional_id, inicio)` e `(tenant_id, inicio)` para o calendário.
- `receivable (tenant_id, status, vencimento)` para aging e régua.
- `stock_lot (product_id, validade)` para FEFO e alertas.
- `quote (tenant_id, status, created_at)` para o funil.
- `audit_log (entidade, entidade_id, at)` com particionamento por mês a partir de 1 milhão de linhas.
- Busca de paciente por nome com índice trigram; CPF e telefone com índice único parcial (apenas ativos).

### 8.6 Integridade

- Chaves estrangeiras com `ON DELETE RESTRICT` em tudo que é financeiro ou clínico.
- Transações explícitas no fechamento de atendimento, baixa de título e fechamento de comissão.
- Constraint de soma: parcelas de um título devem totalizar o valor do título (verificação noturna).
- Nenhum `UPDATE` em prontuário fechado: trigger de banco rejeita, além da regra na aplicação.

---

## 9. Arquitetura e stack

### 9.1 Requisitos não funcionais

| Requisito | Meta | Como verificar |
|---|---|---|
| Desempenho | p95 < 300 ms em telas operacionais | APM e teste de carga |
| Disponibilidade | 99,5% no horário comercial | Monitoramento externo |
| Usabilidade | Recepção agenda em < 30 s; orçamento em < 3 min | Teste com usuário real |
| Mobile | Prontuário utilizável em tablet e celular | Teste em dispositivo |
| Segurança | MFA, RBAC, criptografia em repouso e trânsito | Revisão e pentest leve |
| Backup | RPO ≤ 24 h, RTO ≤ 4 h | Restauração trimestral |
| Auditoria | 100% das ações financeiras e clínicas | Amostragem mensal |
| Portabilidade | Exportação completa em CSV/XLSX | Teste de exportação |

### 9.2 Três caminhos possíveis

| Critério (peso) | Construir sob medida | SaaS de clínica | ERP + planilha |
|---|---|---|---|
| Aderência ao processo (30%) | Alto | Médio | Baixo |
| Custo ano 1 (25%) | Alto | Baixo | Baixo |
| Custo 3 anos (15%) | Médio | Médio | Baixo |
| Margem por procedimento (15%) | Alto | Baixo | Baixo |
| Esforço de implantação (10%) | Alto | Baixo | Médio |
| Propriedade do dado (5%) | Alto | Baixo | Médio |

**Leitura:** construir ganha em aderência e margem, perde em custo e esforço no ano 1. A decisão vira estratégica: se a clínica é o negócio, SaaS resolve; se o sistema é parte do negócio (produto, franquia, padronização), construir.

### 9.3 Arquitetura recomendada

```
┌──────────────────────────────────────────────────────────────┐
│ Navegador (desktop) · Tablet (recepção/sala) · Celular       │
└──────────────────────────────┬───────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────▼───────────────────────────────┐
│ Aplicação única (Next.js): telas + API + regras de negócio   │
│ Auth/MFA · RBAC · validação · trilha de auditoria            │
└───┬──────────────────┬───────────────────┬───────────────────┘
    │                  │                   │
┌───▼────────┐  ┌──────▼───────┐  ┌────────▼──────────────────┐
│ PostgreSQL │  │ Fila / Jobs  │  │ Integrações               │
│ dados +    │  │ lembretes,   │  │ NFS-e · PIX/cartão ·      │
│ auditoria  │  │ cobrança,    │  │ WhatsApp · e-mail ·       │
│            │  │ recall       │  │ storage de fotos          │
└────────────┘  └──────────────┘  └───────────────────────────┘
```

**Monolito modular**, não microsserviços. Uma clínica, uma equipe pequena: a complexidade operacional de microsserviços não se paga. Os limites entre módulos são de código (pacotes), não de rede — o que permite extrair um serviço depois, se necessário.

### 9.4 Stack

| Camada | Escolha | Motivo | Alternativa |
|---|---|---|---|
| Front-end | Next.js + TypeScript + Tailwind + shadcn/ui | Velocidade, um só deploy, SSR para telas pesadas | Remix, Vue/Nuxt |
| Back-end | API routes/server actions no mesmo projeto | Menos peças, menos custo | NestJS separado |
| Banco | PostgreSQL 16 | Transações, jsonb, constraints, extensões | MySQL |
| ORM | Prisma ou Drizzle | Tipagem e migrações versionadas | SQL puro |
| Auth | Better Auth/Auth.js com MFA TOTP | Controle total, sem custo por usuário | Clerk, Supabase Auth |
| Jobs | pg-boss ou Trigger.dev | Fila sem infraestrutura extra | Redis + BullMQ |
| Storage | S3/R2 com URL assinada e criptografia | Fotos e PDFs fora do banco | Disco local (não) |
| Deploy | Vercel + Neon/Supabase, ou VPS com Docker | Simplicidade e backup gerenciado | AWS completa |
| Observabilidade | Sentry + logs estruturados + uptime | Erro visível antes do usuário reclamar | Datadog (caro) |
| NFS-e | Provedor (Focus NFe, PlugNotas, eNotas) | Não construir integração municipal | Direto na prefeitura |

### 9.5 Multi-tenant desde o início

Uma unidade hoje, mas `tenant_id` e `unit_id` em todas as tabelas, com escopo obrigatório na camada de acesso. Isso permite abrir a segunda unidade ou vender como SaaS sem migração de dados — uma das poucas decisões de arquitetura que custa quase nada agora e muito depois.

### 9.6 Integrações

| Integração | Para quê | Criticidade | Fase |
|---|---|---|---|
| Provedor de NFS-e | Emitir nota a partir da venda | Alta (legal) | MVP |
| PSP / PIX (Asaas, Pagar.me, Mercado Pago) | Cobrança e baixa automática | Média | F2 |
| Maquininha (Stone, Cielo, Getnet) | Recebíveis e conciliação | Média | F2 |
| WhatsApp Cloud API | Confirmação, orçamento, recall | Média | F2 |
| E-mail transacional | Orçamento, contrato, recibo | Baixa | MVP |
| Google Calendar (ICS) | Espelho da agenda | Baixa | F3 |
| Contabilidade (exportação) | Apuração e obrigações | Alta | MVP |
| Assinatura eletrônica | TCLE e contrato | Média | F2 |

### 9.7 Ambientes e operação

- **Ambientes:** local, homologação com dados fictícios, produção. Nunca testar em produção.
- **CI/CD:** lint, tipos, testes e migração automática; deploy em um clique com rollback.
- **Testes:** unidade nas regras (R1–R12), integração nos fluxos de orçamento, pagamento e fechamento, e2e nos três caminhos críticos.
- **Backup:** PITR no banco + dump diário em storage frio; restauração testada e registrada a cada trimestre.
- **Feature flags** para liberar módulo por módulo sem novo deploy.

### 9.8 Decisões arquiteturais registradas

| # | Decisão | Motivo | Consequência |
|---|---|---|---|
| AD1 | Monolito modular | Equipe pequena, escopo claro | Escalar verticalmente primeiro |
| AD2 | Postgres como fonte única | Transações e consistência financeira | Evitar cache como verdade |
| AD3 | Valores em centavos | Elimina erro de ponto flutuante | Conversão na borda |
| AD4 | Imutabilidade por trigger | Prontuário e financeiro são prova | Correção só por aditamento |
| AD5 | Storage externo para fotos | Banco pequeno, acesso controlado | URL assinada com expiração |
| AD6 | Fiscal terceirizado | Regra municipal muda demais | Dependência de provedor |

---

## 10. Segurança, LGPD e conformidade

### 10.1 Classificação dos dados

| Classe | Exemplos | Controle |
|---|---|---|
| Sensível (saúde) | Anamnese, evolução, fotos, prescrição | Criptografia, acesso por papel, log de leitura |
| Pessoal | Nome, CPF, contato, endereço | Acesso autenticado, minimização |
| Financeiro | Títulos, pagamentos, comissão | RBAC, trilha, retenção fiscal |
| Operacional | Agenda, estoque | Acesso interno |

### 10.2 Bases legais (LGPD)

| Tratamento | Base legal | Observação |
|---|---|---|
| Dados clínicos e prontuário | Tutela da saúde por profissional de saúde (art. 11, II, f) | Dispensa consentimento, mas exige sigilo |
| Execução de contrato | Procedimento contratado, pagamento | Art. 7, V |
| Fotos de antes/depois | Consentimento específico (art. 11, I) | Revogável; finalidade declarada |
| Uso de imagem em marketing | Consentimento específico e separado | Nunca presumido do contrato |
| Comunicação promocional | Consentimento (art. 7, I) | Opt-out fácil |
| Obrigação fiscal | Obrigação legal (art. 7, II) | Retenção pelo prazo fiscal |

### 10.3 Controles mínimos

| Categoria | Controle |
|---|---|
| Acesso | MFA para todos; sessão expira; revogação imediata no desligamento |
| Autorização | RBAC + escopo por profissional; prontuário só do responsável |
| Criptografia | TLS 1.3 em trânsito; AES-256 em repouso; fotos em bucket privado |
| Rastreabilidade | Log de leitura e escrita; auditoria imutável de ações financeiras e clínicas |
| Retenção | Prontuário 20 anos; fiscal 5 anos; marketing até revogação |
| Descarte | Anonimização irreversível após prazo; exclusão de backups em ciclo |
| Continuidade | Backup com teste; plano de resposta a incidente escrito |
| Terceiros | Contrato de operador com subprocessadores listados; hospedagem com DPA |

### 10.4 Prontuário e retenção

- Prontuário eletrônico com assinatura e trilha; retenção mínima de **20 anos** para médicos (Resolução CFM 1.821/2007). Demais categorias (biomedicina, farmácia estética, enfermagem, estética) seguem exigência do respectivo conselho e da legislação sanitária — confirmar com o responsável técnico.
- Direito de acesso do titular garante **cópia**, não edição nem exclusão do conteúdo clínico.
- Guarda em meio eletrônico exige backup e possibilidade de impressão verificável.

### 10.5 Imagem e consentimento

- Consentimento de uso de imagem é **separado** do consentimento de tratamento e do contrato; descreve onde a foto aparece e por quanto tempo.
- Revogação deve ser atendida com remoção das mídias de divulgação, sem apagar o prontuário.
- Fotos clínicas são dado sensível: acesso restrito, marca d'água com identificação e proibição de download em massa.

### 10.6 Sanitário e fiscal

- **Toxina botulínica:** medicamento sujeito a prescrição e retenção de receita (RDC 471/2021, com escopo ampliado pela RDC 973/2025). O sistema guarda receita, profissional prescritor, dose e lote aplicado.
- **Rastreabilidade de insumos:** lote e validade por atendimento, permitindo recall do fornecedor e investigação de reação adversa.
- **NFS-e:** obrigatoriedade do padrão nacional desde 01/09/2026 para o Simples Nacional (Resolução CGSN 189/2026), respeitando cronogramas municipais. Confirmar enquadramento e município com o contador.

### 10.7 Governança

- Encarregado (DPO) formalizado, ainda que acumule função.
- Registro de operações de tratamento (ROPA) e relatório de impacto (RIPD) para dados de saúde.
- Procedimento de incidente: contenção, avaliação, comunicação à ANPD e aos titulares quando houver risco relevante, em prazo regulamentado.
- Revisão anual de acessos e de fornecedores.

---

## 11. Roadmap e cronograma

### 11.1 Visão das fases

| Fase | Semanas | Foco | Entregável principal | Critério de saída |
|---|---|---|---|---|
| 0 — Descoberta | 1–2 | Processo, preços, regras, protótipo | Fluxos validados e tabela de preços | Dona aprova escopo e regras |
| 1 — MVP | 3–14 | Orçamento → venda → agenda → financeiro | Clínica opera 100% no sistema | Um mês fechado sem planilha paralela |
| 2 — Consolidação | 15–22 | Prontuário completo, conciliação, DRE, recall | Gestão por margem e retenção | DRE por procedimento confiável |
| 3 — Expansão | 23–28 | Automação, portal, multi-unidade | Escala e autoatendimento | Segunda unidade ou produto |

### 11.2 Fase 0 — Descoberta (2 semanas)

- Entrevistar dona, recepção e 2 profissionais (2 h cada).
- Levantar os 20 serviços mais vendidos com preço, duração, insumos e comissão.
- Definir alçadas, política de no-show, validade de orçamento e regra de comissão.
- Protótipo navegável de 6 telas: ficha do paciente, orçamento, fechamento, agenda, caixa, painel.
- Validar com a equipe e ajustar antes de escrever código.

**Saída:** documento de regras assinado + protótipo aprovado + tabela de preços carregável.

### 11.3 Fase 1 — MVP (12 semanas)

| Semanas | Entrega |
|---|---|
| 3–4 | Fundação: autenticação, RBAC, cadastros, migração de pacientes |
| 5–6 | Tabela de preços com ficha técnica e custo |
| 7–8 | Orçamento, PDF, funil e aprovação |
| 9–10 | Venda, parcelas, contrato, agenda |
| 11–12 | Atendimento básico, baixa de estoque, comissão |
| 13–14 | Financeiro (AR/AP/caixa), NFS-e, relatórios essenciais, go-live assistido |

**Escopo do MVP:** cadastros, preços e custo, orçamento, venda e pacote, agenda, atendimento com evolução simples, estoque básico, comissão, contas a receber/pagar, caixa, NFS-e, 8 relatórios.

**Fora do MVP:** fotos, TCLE digital, conciliação bancária, DRE completo, recall automático, PIX integrado.

### 11.4 Fase 2 — Consolidação (8 semanas)

- Prontuário completo: anamnese, TCLE, fotos, receituário, aditamento.
- Receita diferida com relatório de saldo a entregar e extrato de sessões.
- Conciliação bancária e DRE gerencial por procedimento e centro de custo.
- Comissão escalonada por meta; fechamento com aprovação.
- CRM: follow-up de orçamento, recall clínico, NPS.

### 11.5 Fase 3 — Expansão (6 semanas)

- Automação de WhatsApp (confirmação, cobrança, recall) com templates aprovados.
- Integração de pagamentos (PIX/cartão) com baixa automática.
- Painel gerencial com comparativo mensal e projeção.
- Multi-unidade e consolidação; avaliação de portal do paciente.
- Preparação para produto: onboarding, billing, documentação.

### 11.6 Time e papéis

| Papel | Alocação | Responsabilidade |
|---|---|---|
| Product owner (dona) | 4 h/semana | Prioridade, validação, aceite |
| Desenvolvedor full stack | 1 FTE | Construção e deploy |
| Designer/UX | 0,2 FTE na Fase 0–1 | Protótipo e usabilidade |
| Contador | 2 h/mês | Validação fiscal e de regime |
| Responsável técnico | 2 h/mês | Prontuário, TCLE e conformidade |
| QA | 0,3 FTE a partir da semana 8 | Teste de aceite e regressão |

### 11.7 Pontos de decisão (go/no-go)

1. **Fim da Fase 0:** as regras R1–R12 estão acordadas? Sem isso, não iniciar desenvolvimento.
2. **Semana 6:** a tabela de preços com custo está carregada e validada? É a fundação da margem.
3. **Semana 12:** o orçamento e a venda rodam ponta a ponta com dados reais? Se não, replanejar antes do financeiro.
4. **Go-live:** um mês fechado em paralelo com a planilha, com diferença ≤ 1%? Só então desligar a planilha.

---

## 12. Esforço, custo e decisão construir × comprar

### 12.1 Premissas

- Valores em reais, referência de novembro de 2026, sem impostos.
- Desenvolvedor pleno/sênior PJ entre R$ 150 e R$ 250 por hora.
- Escopo conforme seção 11; mudanças relevantes alteram a estimativa.
- Não inclui custo de oportunidade da dona nem retrabalho de processo.

### 12.2 Esforço estimado

| Fase | Horas (baixa) | Horas (alta) | Principais riscos de estouro |
|---|---|---|---|
| 0 — Descoberta | 60 | 90 | Processo indefinido |
| 1 — MVP | 380 | 480 | Integração fiscal, regras de comissão |
| 2 — Consolidação | 260 | 340 | Prontuário e fotos, conciliação |
| 3 — Expansão | 200 | 280 | WhatsApp e pagamentos |
| **Total** | **900** | **1.190** | |

### 12.3 Custo por cenário

| Cenário | Cálculo | Faixa |
|---|---|---|
| Desenvolvedor PJ contratado | 900–1.190 h × R$ 150–250 | R$ 135 mil – R$ 298 mil |
| Agência com escopo fechado | MVP + Fase 2 | R$ 120 mil – R$ 220 mil |
| Dev interno (CLT) | 6 meses de salário + encargos | R$ 90 mil – R$ 140 mil |
| MVP enxuto (só Fase 0–1) | 440–570 h | R$ 66 mil – R$ 142 mil |

**Leitura honesta:** o número alto assusta e é real. Por isso a seção 1.6 recomenda começar pelo MVP e só avançar com resultado medido. O erro clássico não é o custo, é construir 100% antes de validar 20%.

### 12.4 Infraestrutura e terceiros (mensal)

| Item | Faixa | Observação |
|---|---|---|
| Hospedagem da aplicação | R$ 110 – R$ 250 | Vercel Pro ou VPS |
| Banco gerenciado | R$ 140 – R$ 400 | Neon/Supabase com backup |
| Storage de fotos | R$ 30 – R$ 120 | Cresce com o acervo |
| Monitoramento e erros | R$ 0 – R$ 150 | Plano gratuito no início |
| Provedor de NFS-e | R$ 100 – R$ 300 | Por volume de notas |
| WhatsApp Business API | R$ 50 – R$ 250 | Por conversa |
| E-mail transacional | R$ 0 – R$ 80 | Volume baixo |
| Domínio e certificados | R$ 10 | Anual rateado |
| **Total** | **R$ 440 – R$ 1.550** | |

### 12.5 Custo total em 3 anos

| Cenário | Ano 1 | Anos 2–3 | Total 3 anos |
|---|---|---|---|
| Construir (MVP + Fase 2) | R$ 110 mil – R$ 220 mil | R$ 6 mil – R$ 12 mil/ano | R$ 122 mil – R$ 244 mil |
| SaaS de clínica | R$ 4 mil – R$ 12 mil | R$ 5 mil – R$ 14 mil/ano | R$ 14 mil – R$ 40 mil |
| ERP + planilha | R$ 3 mil – R$ 8 mil | R$ 4 mil – R$ 9 mil/ano | R$ 11 mil – R$ 26 mil |

### 12.6 Quando construir vale a pena

Construir se justifica quando **pelo menos dois** forem verdadeiros:

1. O processo comercial (orçamento, combo, comissão) é o diferencial competitivo e nenhum SaaS o reproduz.
2. Há intenção de transformar o sistema em produto, franquia ou licenciamento.
3. O horizonte é superior a 4 anos e a clínica tem volume que torna o custo marginal irrelevante.
4. A integração entre clínico, estoque e financeiro é requisito, não conveniência.
5. Há alguém capaz de manter o sistema depois (dev interno ou contrato de sustentação).

Se nenhum for verdadeiro, **não construa**: assine um SaaS, exporte os dados e invista o capital em marketing e capacidade.

---

## 13. Implantação e migração

### 13.1 Pré-requisitos

- Tabela de preços com ficha técnica e custo de todos os serviços ativos.
- Lista de pacientes ativos com contato e CPF (mínimo para migração).
- Definição de alçadas, política de no-show e regra de comissão.
- Certificado digital e acesso ao sistema de NFS-e do município.
- Contador alinhado sobre regime e retenções.

### 13.2 Migração de dados

| Ordem | Dado | Origem | Cuidado |
|---|---|---|---|
| 1 | Serviços e preços | Planilha | Validar margem antes de importar |
| 2 | Insumos e saldo de estoque | Planilha/notas | Custo médio inicial define margem |
| 3 | Profissionais e comissões | Contrato/planilha | Vigência retroativa gera erro |
| 4 | Pacientes | Planilha/agenda | Deduplicar por CPF e telefone |
| 5 | Pacotes em aberto | Planilha/contrato | Saldo de sessões é passivo real |
| 6 | Títulos em aberto | Planilha | Vencidos precisam de régua |
| 7 | Histórico de atendimentos | Só o essencial | Prontuário antigo fica no arquivo legal |

**Regra:** não migrar tudo. Migrar o que opera; o que é histórico permanece em arquivo consultável pelo prazo legal.

### 13.3 Cutover

1. **Semana sombra (2 semanas):** sistema e planilha em paralelo; conferência diária de caixa e semanal de comissão.
2. **Go-live no dia 1º do mês:** facilita fechamento e comparação.
3. **Congelamento:** planilha vira somente leitura; novos lançamentos só no sistema.
4. **Rollback definido:** se a diferença de caixa passar de 2% por 3 dias, volta-se à planilha por uma semana com correção.

### 13.4 Treinamento

| Público | Formato | Duração | Conteúdo |
|---|---|---|---|
| Recepção | Presencial + vídeo | 3 h | Agenda, orçamento, recebimento, caixa |
| Profissionais | Presencial curto | 1,5 h | Agenda própria, evolução, fotos |
| Financeiro | Presencial + manual | 4 h | Títulos, conciliação, comissão, fechamento |
| Dona | Sessão de gestão | 2 h | Funil, margem, DRE, indicadores |

Material de apoio: manual de 1 página por papel, vídeos de 3 minutos por tarefa e plantão de dúvidas na primeira semana.

### 13.5 Operação assistida (30 dias)

- Reunião diária de 15 min na primeira semana; semanal depois.
- Fila de melhorias classificada por impacto × esforço; correções críticas em 48 h.
- Medição semanal dos indicadores da seção 14.

### 13.6 Checklist de go-live

- [ ] Backup inicial e teste de restauração
- [ ] Usuários criados com MFA e papéis corretos
- [ ] Tabela de preços com custo revisada pela dona
- [ ] Alçadas de desconto configuradas
- [ ] Formas de pagamento com taxas e prazos corretos
- [ ] NFS-e emitida em homologação e cancelada
- [ ] Caixa de abertura conferido
- [ ] Primeiro orçamento real emitido e aprovado
- [ ] Primeira sessão executada com baixa de insumo
- [ ] Primeiro fechamento de caixa com divergência zero
- [ ] Contador recebeu exportação de teste

---

## 14. Métricas de sucesso

| Indicador | Fórmula | Linha de base | Meta 90 dias | Dono | Frequência |
|---|---|---|---|---|---|
| Conversão de orçamento | aprovados ÷ enviados | Medir no mês 1 | ≥ 45% | Dona | Semanal |
| Ticket médio | receita ÷ vendas | Medir | +10% | Dona | Mensal |
| Margem de contribuição | (receita − variáveis) ÷ receita | Medir | ≥ 55% | Dona | Mensal |
| Ocupação da agenda | horas vendidas ÷ disponíveis | Medir | 75–85% | Gestora | Semanal |
| No-show | faltas ÷ agendados | Medir | ≤ 8% | Recepção | Semanal |
| Inadimplência | vencido ÷ faturado | Medir | ≤ 3% | Financeiro | Mensal |
| Prazo médio de recebimento | dias entre venda e caixa | Medir | ≤ 5 dias | Financeiro | Mensal |
| Tempo de fechamento | dias até o mês fechado | ~7 dias | ≤ 3 dias | Financeiro | Mensal |
| Estoque vencido | valor vencido ÷ total | Desconhecido | R$ 0 | Gestora | Mensal |
| Receita diferida | saldo de pacotes a entregar | Desconhecido | Visível e conciliado | Dona | Mensal |
| Recall realizado | contatos ÷ elegíveis | 0 | ≥ 60% | Recepção | Mensal |
| NPS | promotores − detratores | Medir | ≥ 70 | Dona | Trimestral |

---

## 15. Riscos e mitigações

| # | Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|---|
| 1 | Escopo cresce e o MVP não sai | Alta | Alto | Escopo congelado na Fase 0; qualquer adição entra na Fase 2 |
| 2 | Equipe não adota e volta à planilha | Média | Alto | Treinamento por papel, semana sombra, campeão interno |
| 3 | Vazamento de dado sensível | Baixa | Muito alto | MFA, criptografia, mínimo privilégio, resposta a incidente |
| 4 | Dependência de um único desenvolvedor | Média | Alto | Código documentado, repositório da clínica, contrato de sustentação |
| 5 | Integração fiscal municipal trava | Média | Médio | Provedor homologado; emissão manual como plano B |
| 6 | Estimativa de prazo otimista | Alta | Médio | Buffer de 20%; entregas semanais visíveis |
| 7 | Regra de comissão mal definida gera conflito | Média | Alto | Acordo escrito na Fase 0; simulação antes do go-live |
| 8 | Dados migrados sujos | Alta | Médio | Deduplicação e conferência por amostragem |
| 9 | Custo de infraestrutura cresce com fotos | Baixa | Baixo | Compressão, ciclo de vida e storage frio |
| 10 | Over-engineering (multi-tenant, IA, app) | Média | Médio | Non-goals explícitos; revisão mensal de escopo |

---

## 16. Decisões pendentes

Estas decisões mudam escopo, prazo ou arquitetura. Sem resposta, o plano assume o padrão indicado.

| # | Pergunta | Por que importa | Padrão se não decidir |
|---|---|---|---|
| 1 | Construir ou assinar SaaS? | Define todo o resto | Construir apenas o MVP |
| 2 | A clínica vende pacote com validade? | Ativa receita diferida desde o dia 1 | Sim, validade de 12 meses |
| 3 | Comissão é sobre venda ou recebido? | Muda o fluxo de liberação | Sobre recebido |
| 4 | Existe sinal/entrada? | Muda o checkout e o caixa | Sim, mínimo 20% |
| 5 | Quem aplica injetáveis? | Define exigência de receita e TCLE | Profissional habilitado com conselho |
| 6 | Emite NFS-e hoje? Por onde? | Define integração e prazo | Provedor no MVP |
| 7 | Quantos profissionais e procedimentos ativos? | Dimensiona migração e treinamento | Até 8 e 60 |
| 8 | Usa maquininha de qual adquirente? | Define conciliação | Importação de CSV |
| 9 | Vai abrir segunda unidade em 24 meses? | Confirma multi-tenant | Sim |
| 10 | Orçamento disponível para o ano 1? | Define se é build ou buy | MVP de R$ 66–142 mil |
| 11 | Quem é o responsável técnico? | Assina prontuário e TCLE | Definir antes do go-live |
| 12 | Haverá marketing com foto de paciente? | Exige consentimento específico | Sim, com opt-in |

---

## 17. Anexos

### Anexo A — Checklist de aceite do MVP

**Cadastros**
- [ ] Paciente com CPF inválido é bloqueado
- [ ] Busca encontra por nome, CPF e telefone
- [ ] Profissional sem conselho não prescreve

**Preço e custo**
- [ ] Serviço sem ficha técnica não calcula custo
- [ ] Custo do serviço muda quando o insumo muda de preço
- [ ] Venda abaixo do custo é bloqueada

**Orçamento**
- [ ] Orçamento enviado não pode ser editado
- [ ] Alteração gera versão com histórico
- [ ] Aprovação parcial gera venda só dos itens aprovados
- [ ] Orçamento vencido não converte sem revisão

**Venda e financeiro**
- [ ] Soma das parcelas fecha com o total
- [ ] Pagamento parcial mantém saldo
- [ ] Baixa gera caixa e comissão
- [ ] Cancelamento estorna tudo
- [ ] Período fechado não aceita lançamento

**Agenda e atendimento**
- [ ] Conflito de sala é bloqueado
- [ ] Fechamento do atendimento baixa insumo por lote
- [ ] Prontuário fechado não aceita edição
- [ ] No-show aplica a política

**Fiscal**
- [ ] NFS-e emitida a partir da venda
- [ ] Cancelamento dentro do prazo
- [ ] Exportação mensal para o contador

### Anexo B — Exemplo de ficha técnica e margem

Valores ilustrativos, antes de impostos.

| Procedimento | Duração | Insumos | Sala + profissional | Preço | Comissão 10% | Margem | % |
|---|---|---|---|---|---|---|---|
| Toxina — 1 região | 30 min | 395 | 80 | 1.200 | 120 | 605 | 50% |
| Preenchimento 1 ml | 60 min | 900 | 160 | 2.400 | 240 | 1.100 | 46% |
| Limpeza de pele | 60 min | 45 | 130 | 280 | 28 | 77 | 28% |
| Peeling médio | 45 min | 70 | 98 | 450 | 45 | 237 | 53% |
| Criolipólise — 1 área | 90 min | 100 | 240 | 900 | 90 | 470 | 52% |
| Microagulhamento | 60 min | 90 | 130 | 550 | 55 | 275 | 50% |

**Leitura:** limpeza de pele tem margem baixa e ocupa 1 hora — é porta de entrada, não produto de lucro. O sistema deve mostrar isso, não esconder.

### Anexo C — DRE gerencial modelo (mês ilustrativo)

| Linha | Valor | % |
|---|---|---|
| Receita bruta de serviços | 120.000 | 100% |
| (−) Impostos sobre serviço | 9.600 | 8,0% |
| (−) Taxas de cartão | 1.800 | 1,5% |
| **= Receita líquida** | **108.600** | **90,5%** |
| (−) Insumos | 26.000 | 21,7% |
| (−) Comissões | 12.000 | 10,0% |
| **= Margem de contribuição** | **70.600** | **58,8%** |
| (−) Aluguel | 15.000 | 12,5% |
| (−) Folha e encargos | 28.000 | 23,3% |
| (−) Pró-labore | 12.000 | 10,0% |
| (−) Marketing | 6.000 | 5,0% |
| (−) Software, contabilidade e outros | 3.000 | 2,5% |
| **= Resultado operacional** | **6.600** | **5,5%** |

Ponto de equilíbrio = custos fixos ÷ margem de contribuição = 64.000 ÷ 0,588 ≈ **R$ 108.800/mês**.

### Anexo D — Política de desconto e alçadas

| Papel | Desconto máximo | Aprovação acima | Registro |
|---|---|---|---|
| Recepção | 0% | Gestora | Motivo obrigatório |
| Gestora | 10% | Dona | Motivo + cliente |
| Dona | 20% | — | Motivo obrigatório |
| Acima de 20% | Caso a caso | Dona + justificativa escrita | Revisão mensal |

Desconto nunca incide sobre comissão já calculada; se incidir, a regra deve estar explícita na comissão.

### Anexo E — Glossário

| Termo | Significado |
|---|---|
| Receita diferida | Valor recebido por serviço ainda não executado |
| Margem de contribuição | Receita menos custos variáveis |
| FEFO | Primeiro que vence, primeiro que sai |
| Ficha técnica (BOM) | Lista de insumos e quantidades de um procedimento |
| Aging | Distribuição de títulos por tempo de atraso |
| No-show | Falta sem aviso prévio |
| TCLE | Termo de consentimento livre e esclarecido |
| Recall | Chamada ativa do paciente para retorno |
| ROPA | Registro das operações de tratamento de dados |
| DSO | Prazo médio de recebimento |

### Anexo F — Referências normativas

- LGPD — Lei nº 13.709/2018: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- ANPD — orientações e prazos: https://www.gov.br/anpd
- Resolução CFM nº 1.821/2007 — prontuário e retenção: https://sistemas.cfm.org.br/normas/visualizar/resolucoes/BR/2007/1821
- RDC Anvisa nº 471/2021 — medicamentos sujeitos a prescrição e retenção: https://anvisalegis.datalegis.net/action/ActionDatalegis.php?acao=abrirTextoAto&link=S&tipo=RDC&numeroAto=00000471&seqAto=000&valorAno=2021&orgao=RDC%2FDC%2FANVISA%2FMS&cod_modulo=310&cod_menu=9431
- RDC Anvisa nº 973/2025 — ampliação do escopo de receitas sujeitas a retenção
- NFS-e padrão nacional: https://www.gov.br/nfse
- Resolução CGSN nº 189/2026 — obrigatoriedade da NFS-e nacional para o Simples Nacional (cobertura: https://jornalcontabil.com.br/noticia/simples-nacional-nfs-e-nacional-sera-obrigatoria-em-setembro/)

> Referências verificadas em 23/11/2026. Regras municipais e de conselho mudam: confirmar com contador e responsável técnico antes do go-live.
