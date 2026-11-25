# Aurora — gestão de clínica de estética

Aplicação funcional do plano diretor: **orçamento → venda → agenda → atendimento → financeiro → comissão**, com as regras de negócio que decidem o resultado da clínica.

Roda localmente, sem build e sem dependências externas.

## Como rodar

```bash
cd app
node server.js
```

Abra http://127.0.0.1:4321.

- Node 22.5+ (usa o SQLite nativo `node:sqlite`).
- O banco é criado e populado na primeira execução em `app/data/clinica.db`.
- Para recomeçar do zero: apague a pasta `app/data` (ou `npm run reset`).

## O que está implementado

**Comercial**
- Tabela de preços com **custo real** por procedimento (insumos + hora de sala + hora de profissional) e margem calculada.
- Orçamento com múltiplos itens, sessões, desconto (limite de 20%), validade e número sequencial.
- Funil por status: rascunho, enviado, convertido, recusado (com motivo da perda).
- Fechamento da venda com entrada + parcelas, geração de títulos e **rateio do desconto entre os itens** — a soma dos itens fecha exatamente com o total contratado.

**Operação**
- Agenda semanal por profissional, com bloqueio de conflito de horário, check-in, falta e vínculo com sessão de pacote.
- Atendimento com ficha técnica: baixa de estoque **FEFO** (primeiro que vence, primeiro que sai), por lote, com rastreio do material usado.
- Fechamento do atendimento reconhece a receita da sessão e provisiona a comissão na mesma transação.

**Financeiro**
- Contas a receber (parciais, vencidos, baixa por forma de pagamento com taxa de cartão), contas a pagar e caixa do dia.
- Receita reconhecida por execução × receita a reconhecer (pacotes) — os dois números nunca se misturam.
- Comissões por competência, com status "a liberar" e "pago".

**Gestão**
- Painel com receita reconhecida, a receber, funil, alertas de vencimento/estoque e tendência mensal.
- Estoque com lotes, validade, estoque mínimo e movimentações.
- Ficha do paciente com histórico, títulos, sessões em andamento e saldo.

## Estrutura

```
app/
  server.js        HTTP, rotas e parsing de formulários (sem framework)
  db.js            schema SQLite, seed e helpers de data/moeda
  domain.js        regras de negócio (preço, orçamento, venda, receita, comissão, estoque)
  views.js         HTML renderizado no servidor
  public/app.css   design system
  public/app.js    construtor de orçamento e prévia de parcelas
  data/clinica.db  banco (criado na primeira execução)
```

## Decisões de arquitetura

- **Zero dependências.** O registro npm estava inacessível no ambiente de desenvolvimento; em vez de travar, a aplicação usa `node:http`, `node:sqlite` e HTML renderizado no servidor. Isso a mantém portátil e sem superfície de atualização.
- **Domínio isolado em `domain.js`.** Nenhuma regra de negócio vive na camada de apresentação. É o que permite migrar para outro runtime (Next.js, por exemplo) sem reescrever as regras.
- **Valores em centavos inteiros**, datas em ISO local, `total_cents` sempre igual à soma dos itens.
- **Imutabilidade onde importa:** prontuário/atendimento fechado não recebe edição; correção vira novo registro.

## Fluxo de demonstração

1. **Orçamentos → Novo**: escolha paciente, adicione serviços e defina sessões/desconto.
2. Abra o orçamento e **Feche a venda** com entrada e parcelas.
3. Na **venda**, clique em **Agendar sessão** (leva para a agenda já vinculada à sessão do pacote).
4. Na **agenda**, clique em **Atender** e depois **Fechar atendimento**.
5. Verifique: receita reconhecida na venda, comissão em **Comissões**, baixa de insumo em **Estoque**.

## O que ainda não existe

- Login e multiusuário (hoje é uma estação única, papel de gestora).
- Emissão de NFS-e e exportação contábil.
- Geração de PDF do orçamento (a tela é print-friendly; o PDF é o próximo passo).
- Testes automatizados e migrações versionadas de schema.
- Portal do paciente (fora de escopo por decisão do plano).

## Próximos passos sugeridos

1. Autenticação + papéis (dona, recepção, profissional) com as permissões da seção 4 do plano.
2. PDF do orçamento e do prontuário.
3. NFS-e via provedor (Focus NFe/PlugNotas).
4. Testes de domínio para as 12 regras (o `domain.js` é puro o suficiente para isso).
