# Aurora — Plataforma de Gestão para Clínica de Estética

## O que está neste repositório

| Pasta / arquivo | Conteúdo |
|---|---|
| `Plano-Plataforma-Gestao-Estetica.{md,docx,pdf}` | Plano diretor completo (38 p.): orçamento, agenda, prontuário, estoque, financeiro, comissões, fiscal, roadmap e custo. |
| `app/` | Aplicação funcional (Node.js, sem build): servidor, regras de negócio, interface e banco SQLite local para desenvolvimento. |
| `app/db/` | **Banco de dados pronto para produção** (PostgreSQL): schema, migrações, seed, configuração e backup. |
| `app/docs/screens/` | Capturas das telas (painel, agenda, orçamento, venda, paciente). |

## Banco de dados — pronto para produção

O banco está em `app/db/` e foi projetado para rodar em **PostgreSQL 15+** em produção, com `node:sqlite` como fallback de desenvolvimento local (zero dependências).

### Arquivos-chave

- `app/db/schema.sql` — DDL completo: tenants, usuários, pacientes (LGPD), profissionais, serviços com ficha técnica/custo real, estoque por lote (FEFO), orçamentos versionados, vendas com receita diferida, recebíveis, pagamentos com taxa, caixa, agenda, prontuário imutável, comissões, NFS-e, recall, auditoria e views de relatório (DRE, funil, estoque).
- `app/db/migrations/001_initial.sql` — cópia versionada do schema inicial.
- `app/db/migrations/manifest.json` — controle de migrações aplicadas.
- `app/db/seed.sql` — dados de demonstração (UUIDs fixos). **Não usar em produção com dados reais de pacientes.**
- `app/db/.env.example` — variáveis de ambiente (`DATABASE_URL`, `SESSION_SECRET`, `PG_DUMP_PATH`, `BACKUP_DIR`, etc.).
- `app/db/connect.js` — conector que alterna PostgreSQL (`DATABASE_URL`) ou SQLite local.
- `app/db/setup.js` — inicialização/validação do banco.
- `app/db/backup.ps1` / `app/db/backup.sh` — scripts de backup com retenção (PostgreSQL via `pg_dump` ou cópia do SQLite).
- `app/db/README.md` — guia completo de implantação em produção.

### Como colocar em produção

```bash
# 1. Configure o ambiente
cp app/.env.example app/.env
# edite o .env com DATABASE_URL (PostgreSQL) e SESSION_SECRET

# 2. Instale o driver Postgres (produção)
npm install pg

# 3. Crie o schema
psql -d "$DATABASE_URL" -f app/db/migrations/001_initial.sql

# 4. (Homologação apenas) Carregue o seed
psql -d "$DATABASE_URL" -f app/db/seed.sql

# 5. Backup
./app/db/backup.sh          # Linux/macOS
.\app\db\backup.ps1         # Windows PowerShell
```

### Regras de banco implementadas

- Dinheiro em **centavos (BIGINT)** — sem erro de ponto flutuante.
- **Exclusão lógica** em cadastros; **imutabilidade** em prontuário fechado e receita reconhecida (triggers).
- **Auditoria automática** (`audit_log`) nas tabelas críticas.
- **Multi-tenant** (`tenant_id` em todas as tabelas de negócio) desde a migração 001.
- **Bloqueio de overlap** de horário na agenda.
- **Rastreabilidade sanitária**: paciente → atendimento → lote → fornecedor.

## Rodar localmente (desenvolvimento)

```bash
cd app
npm install          # opcional; não há dependências obrigatórias
node server.js       # http://127.0.0.1:4321
```

O banco SQLite é criado automaticamente na primeira execução em `app/data/clinica.db`.

## Próximos passos sugeridos

1. Autenticação e papéis (dona, recepção, profissional) com MFA.
2. PDF do orçamento e do prontuário.
3. Emissão de NFS-e via provedor (Focus NFe, PlugNotas, eNotas).
4. Testes automatizados das regras de negócio (o `domain.js` é isolado para isso).
