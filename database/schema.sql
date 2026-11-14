-- Fresh development schema for DigiWallet. Applies to an empty public schema.
-- Reset only DigiWallet-owned public tables; never drop Supabase-managed schemas.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE dw_schema_migrations (
  name text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE dw_schema_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON dw_schema_migrations FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'REVOKE ALL ON dw_schema_migrations FROM anon'; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'REVOKE ALL ON dw_schema_migrations FROM authenticated'; END IF;
END $$;

CREATE TABLE dw_users (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE dw_wallets (
  id text PRIMARY KEY REFERENCES dw_users(id) ON DELETE CASCADE,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  currency char(3) NOT NULL DEFAULT 'INR',
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE dw_sessions (
  token_hash text PRIMARY KEY,
  user_id text NOT NULL REFERENCES dw_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dw_sessions_user_expiry ON dw_sessions(user_id, expires_at);
CREATE INDEX dw_sessions_expiry ON dw_sessions(expires_at);

CREATE TABLE dw_institutions (
  id text PRIMARY KEY,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('bank','investment','lender')),
  country char(2) NOT NULL DEFAULT 'IN',
  normalized_name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  UNIQUE(kind,country,normalized_name)
);
INSERT INTO dw_institutions(id,name,kind,country,normalized_name) VALUES
 ('sbi','State Bank of India','bank','IN','state bank of india'),
 ('hdfc','HDFC Bank','bank','IN','hdfc bank'),
 ('icici','ICICI Bank','bank','IN','icici bank'),
 ('axis','Axis Bank','bank','IN','axis bank'),
 ('pnb','Punjab National Bank','bank','IN','punjab national bank'),
 ('kotak','Kotak Mahindra Bank','bank','IN','kotak mahindra bank');

CREATE TABLE dw_accounts (
  wallet_id text NOT NULL REFERENCES dw_wallets(id) ON DELETE CASCADE,
  id text NOT NULL,
  position integer NOT NULL CHECK(position >= 0),
  name text NOT NULL,
  type text NOT NULL CHECK(type IN ('bank','cash','card','investment','loan','receivable')),
  opening_paise bigint NOT NULL DEFAULT 0 CHECK(opening_paise BETWEEN 0 AND 9007199254740991),
  opening_date timestamptz NOT NULL,
  balance_paise bigint NOT NULL DEFAULT 0 CHECK(balance_paise BETWEEN 0 AND 9007199254740991),
  credit_limit_paise bigint NOT NULL DEFAULT 0 CHECK(credit_limit_paise BETWEEN 0 AND 9007199254740991),
  institution_id text,
  counterparty text NOT NULL DEFAULT '',
  purpose text NOT NULL DEFAULT '',
  loan_type text NOT NULL DEFAULT '',
  terms text NOT NULL DEFAULT '',
  due_date text NOT NULL DEFAULT '',
  archived boolean NOT NULL DEFAULT false,
  generated boolean NOT NULL DEFAULT false,
  created_at timestamptz,
  closed_at timestamptz,
  credit_limit_history jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(credit_limit_history)='array'),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(metadata)='object'),
  PRIMARY KEY(wallet_id,id),
  FOREIGN KEY(institution_id) REFERENCES dw_institutions(id) ON DELETE SET NULL
);
CREATE INDEX dw_accounts_institution ON dw_accounts(institution_id) WHERE institution_id IS NOT NULL;
CREATE INDEX dw_accounts_wallet_type ON dw_accounts(wallet_id,type,id) WHERE NOT archived;

CREATE TABLE dw_categories (
  wallet_id text NOT NULL REFERENCES dw_wallets(id) ON DELETE CASCADE,
  id text NOT NULL,
  position integer NOT NULL CHECK(position >= 0),
  name text NOT NULL,
  archived boolean NOT NULL DEFAULT false,
  icon text NOT NULL DEFAULT 'other',
  is_system boolean NOT NULL DEFAULT false,
  PRIMARY KEY(wallet_id,id)
);

CREATE TABLE dw_transactions (
  wallet_id text NOT NULL REFERENCES dw_wallets(id) ON DELETE CASCADE,
  id text NOT NULL,
  position integer NOT NULL CHECK(position >= 0),
  type text NOT NULL CHECK(type IN ('opening','income','expense','borrow','transfer','invest','capitalReturn','cardPayment','lend','receive','repay','refund','release')),
  effective_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL,
  description text NOT NULL,
  notes text NOT NULL DEFAULT '',
  category_id text,
  amount_paise bigint NOT NULL DEFAULT 0 CHECK(amount_paise BETWEEN 0 AND 9007199254740991),
  income_paise bigint NOT NULL DEFAULT 0 CHECK(income_paise BETWEEN -9007199254740991 AND 9007199254740991),
  expense_paise bigint NOT NULL DEFAULT 0 CHECK(expense_paise BETWEEN -9007199254740991 AND 9007199254740991),
  inflow_paise bigint NOT NULL DEFAULT 0 CHECK(inflow_paise BETWEEN 0 AND 9007199254740991),
  outflow_paise bigint NOT NULL DEFAULT 0 CHECK(outflow_paise BETWEEN 0 AND 9007199254740991),
  revision integer NOT NULL DEFAULT 0 CHECK(revision >= 0),
  details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(details)='object'),
  PRIMARY KEY(wallet_id,id),
  FOREIGN KEY(wallet_id,category_id) REFERENCES dw_categories(wallet_id,id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX dw_transactions_wallet_date ON dw_transactions(wallet_id,effective_at DESC,id DESC);
CREATE INDEX dw_transactions_category_date ON dw_transactions(wallet_id,category_id,effective_at DESC);
CREATE FUNCTION dw_check_balanced_transaction() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE w text; tid text; total numeric; n integer;
BEGIN
  w:=COALESCE(NEW.wallet_id,OLD.wallet_id); tid:=COALESCE(NEW.transaction_id,OLD.transaction_id);
  SELECT COALESCE(sum(amount_paise),0),count(*) INTO total,n FROM dw_transaction_entries WHERE wallet_id=w AND transaction_id=tid;
  IF n>0 AND total<>0 THEN RAISE EXCEPTION 'Transaction journal entries must balance'; END IF;
  RETURN NULL;
END; $$;

CREATE TABLE dw_transaction_entries (
  wallet_id text NOT NULL,
  transaction_id text NOT NULL,
  line_no smallint NOT NULL CHECK(line_no >= 0),
  account_id text,
  system_account text,
  amount_paise bigint NOT NULL CHECK(amount_paise BETWEEN -9007199254740991 AND 9007199254740991 AND amount_paise <> 0),
  PRIMARY KEY(wallet_id,transaction_id,line_no),
  FOREIGN KEY(wallet_id,transaction_id) REFERENCES dw_transactions(wallet_id,id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY(wallet_id,account_id) REFERENCES dw_accounts(wallet_id,id) DEFERRABLE INITIALLY DEFERRED,
  CHECK((account_id IS NULL) <> (system_account IS NULL)),
  CHECK(system_account IS NULL OR system_account IN ('equity','income','expense'))
);
CREATE INDEX dw_entries_account ON dw_transaction_entries(wallet_id,account_id,transaction_id);
CREATE CONSTRAINT TRIGGER dw_entries_balanced AFTER INSERT OR UPDATE OR DELETE ON dw_transaction_entries
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION dw_check_balanced_transaction();

CREATE TABLE dw_transaction_revisions (
  wallet_id text NOT NULL,
  transaction_id text NOT NULL,
  revision integer NOT NULL CHECK(revision > 0),
  edited_at timestamptz NOT NULL,
  request_key text,
  previous_command jsonb NOT NULL CHECK(jsonb_typeof(previous_command)='object'),
  replacement_command jsonb NOT NULL CHECK(jsonb_typeof(replacement_command)='object'),
  PRIMARY KEY(wallet_id,transaction_id,revision),
  UNIQUE(wallet_id,request_key),
  FOREIGN KEY(wallet_id,transaction_id) REFERENCES dw_transactions(wallet_id,id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE dw_loan_funding (
  wallet_id text NOT NULL REFERENCES dw_wallets(id) ON DELETE CASCADE,
  id text NOT NULL,
  loan_account_id text NOT NULL,
  holding_account_id text NOT NULL,
  source_transaction_id text NOT NULL,
  purpose text NOT NULL,
  assigned_paise bigint NOT NULL CHECK(assigned_paise >= 0),
  remaining_paise bigint NOT NULL CHECK(remaining_paise >= 0),
  committed_paise bigint NOT NULL DEFAULT 0 CHECK(committed_paise >= 0 AND committed_paise <= remaining_paise),
  used_paise bigint NOT NULL DEFAULT 0 CHECK(used_paise >= 0),
  released_paise bigint NOT NULL DEFAULT 0 CHECK(released_paise >= 0),
  returned_paise bigint NOT NULL DEFAULT 0 CHECK(returned_paise >= 0),
  legacy_commitments jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(legacy_commitments)='object'),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(metadata)='object'),
  PRIMARY KEY(wallet_id,id),
  FOREIGN KEY(wallet_id,loan_account_id) REFERENCES dw_accounts(wallet_id,id) DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY(wallet_id,holding_account_id) REFERENCES dw_accounts(wallet_id,id) DEFERRABLE INITIALLY DEFERRED,
  FOREIGN KEY(wallet_id,source_transaction_id) REFERENCES dw_transactions(wallet_id,id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX dw_funding_holding ON dw_loan_funding(wallet_id,holding_account_id) WHERE remaining_paise > 0;
CREATE FUNCTION dw_check_funding_account_types() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM dw_accounts WHERE wallet_id=NEW.wallet_id AND id=NEW.loan_account_id AND type='loan') THEN RAISE EXCEPTION 'Funding must reference a loan account'; END IF;
 IF NOT EXISTS(SELECT 1 FROM dw_accounts WHERE wallet_id=NEW.wallet_id AND id=NEW.holding_account_id AND type='bank') THEN RAISE EXCEPTION 'Loan funds must be held in a bank account'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER dw_funding_account_types BEFORE INSERT OR UPDATE ON dw_loan_funding FOR EACH ROW EXECUTE FUNCTION dw_check_funding_account_types();

-- One row per month/category; the monthly total is SUM(amount_paise).
CREATE TABLE dw_budgets (
  wallet_id text NOT NULL REFERENCES dw_wallets(id) ON DELETE CASCADE,
  month date NOT NULL CHECK(extract(day FROM month)=1),
  category_id text NOT NULL,
  amount_paise bigint NOT NULL CHECK(amount_paise >= 0 AND amount_paise <= 9007199254740991),
  PRIMARY KEY(wallet_id,month,category_id),
  FOREIGN KEY(wallet_id,category_id) REFERENCES dw_categories(wallet_id,id) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE dw_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id text REFERENCES dw_wallets(id) ON DELETE SET NULL,
  actor_id text REFERENCES dw_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  sequence integer,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dw_audit_wallet_date ON dw_audit_log(wallet_id,recorded_at DESC);
CREATE UNIQUE INDEX dw_audit_history_order ON dw_audit_log(wallet_id,entity_type,sequence) WHERE entity_type='wallet_history';

CREATE TABLE dw_rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL CHECK(count > 0),
  expires_at timestamptz NOT NULL
);
CREATE INDEX dw_rate_limits_expiry ON dw_rate_limits(expires_at);

-- This app uses server-verified custom sessions and a trusted server DB role.
-- Browser roles receive no direct table access; keep credentials server-side.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['dw_users','dw_wallets','dw_sessions','dw_institutions','dw_accounts','dw_categories','dw_transactions','dw_transaction_entries','dw_transaction_revisions','dw_loan_funding','dw_budgets','dw_audit_log','dw_rate_limits'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON %I FROM PUBLIC',t);
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE format('REVOKE ALL ON %I FROM anon',t); END IF;
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE format('REVOKE ALL ON %I FROM authenticated',t); END IF;
  END LOOP;
END $$;
