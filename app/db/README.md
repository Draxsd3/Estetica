# Aurora — Banco de dados (produção)

Este diretório contém a camada de persistência da plataforma. O objetivo é deixar o banco **pronto para produção**: schema versionado, migrações, seed controlado, configuração via variáveis de ambiente e scripts de backup.

## Estrutura

```
app/db/
  connect.js          # Conector: PostgreSQL (DATABASE_URL) ou SQLite local (dev)
  setup.js            # Inicialização / validação do banco
  schema.sql          # DDL completo (PostgreSQL 15+)
  seed.sql            # Dados de demonstração (NÃO usar em produção real)
  .env.example        # Variáveis de ambiente (copie para .env)
  README.md           # Este arquivo
  migrations/
    001_initial.sql   # Cópia do schema inicial (versionada)
    manifest.json     # Controle de migrações aplicadas
  backup.ps1          # Backup no Windows (PowerShell)
  backup.sh           # Backup no Linux/macOS (Bash)
```

## Dialeto suportado

Produção: **PostgreSQL 15+** com extensão `pgcrypto` (UUIDs aleatórios).  
Desenvolvimento local: **SQLite** via `node:sqlite` (sem dependências, zero config).

## Como colocar em produção

### 1. Variáveis de ambiente

Copie `app/.env.example` para `app/.env` e preencha:

```bash
cp app/.env.example app/.env
```

Variáveis obrigatórias em produção:

| Variável | Exemplo | Obrigatório |
|---|---|---|
| `DATABASE_URL` | `postgres://aurora:senha@db.example.com:5432/aurora?sslmode=require` | Sim |
| `SESSION_SECRET` | chave aleatória de 32+ caracteres | Sim |
| `BCRYPT_ROUNDS` | `12` | Não (padrão 12) |
| `PG_DUMP_PATH` | caminho do `pg_dump` | Não (se no PATH) |
| `BACKUP_DIR` | `./backups` | Não |
| `BACKUP_RETENTION_DAYS` | `30` | Não |

### 2. Criar o schema

```bash
psql -d "$DATABASE_URL" -f app/db/migrations/001_initial.sql
```

O schema cria: tenants, usuários, pacientes (LGPD), profissionais, serviços com ficha técnica, estoque por lote, orçamentos versionados, vendas com receita diferida, recebíveis, pagamentos, caixa, agenda, prontuário imutável, comissões, NFS-e, recall, auditoria e views de relatório.

### 3. Seed (apenas homologação)

**Nunca rode o seed em produção com dados reais de pacientes.**

```bash
# Apenas em homologação:
psql -d "$DATABASE_URL" -f app/db/seed.sql
```

### 4. Backups

```bash
# Linux/macOS
chmod +x app/db/backup.sh
./app/db/backup.sh

# Windows (PowerShell)
.\app\db\backup.ps1
```

O script deteta automaticamente se está usando PostgreSQL (`pg_dump`) ou SQLite (cópia do arquivo) e aplica retenção configurável (`BACKUP_RETENTION_DAYS`, padrão 30).

### 5. Driver Node (produção)

Para a aplicação se conectar ao PostgreSQL, instale o driver:

```bash
npm install pg
```

Defina `DATABASE_URL` e o conector em `app/db/connect.js` alternará automaticamente para o pool PostgreSQL. Sem `DATABASE_URL`, o app continua rodando em SQLite local.

## Segurança

- Senhas nunca em texto plano: bcrypt (custo configurável via `BCRYPT_ROUNDS`).
- MFA TOTP disponível para usuários (`mfa_enabled`, `mfa_secret` criptografado).
- Sessões com refresh token hasheado e expiração.
- Auditoria imutável em `audit_log` (trigger automático nas tabelas críticas).
- Prontuário (`encounters`) é imutável após fechamento (trigger impede edição).
- Receita reconhecida (`revenue_entries`) é imutável.
- Exclusão lógica (`deleted_at`) em pacientes, respeitando a LGPD; anonimização após o prazo legal.

## Regras de banco implementadas no schema

- `quotes.discount_cents <= quotes.subtotal_cents` (desconto nunca excede o subtotal).
- `receivables.paid_cents <= receivables.amount_cents`.
- `sale_items.sessions_done <= sale_items.qty_sessions`.
- `sale_items.revenue_recognized_cents <= sale_items.total_cents`.
- `commission_entries.amount_cents` e `base_cents` não negativos.
- Exclusão de overlap de horário na agenda (`appointments_no_overlap` via `EXCLUDE` com `gist`).
- `stock_lots.qty >= 0` e `stock_lots.expires_on` com índice para alertas de vencimento.

## Multi-tenant

Todas as tabelas de negócio têm `tenant_id` desde a migração 001. Isso permite, sem migração futura, rodar múltiplas clínicas/unidades no mesmo banco (ou oferecer como SaaS) com isolamento por `tenant_id` em todas as consultas.
