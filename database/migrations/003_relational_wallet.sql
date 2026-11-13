-- Additive migration. Existing wallet JSON and authentication remain intact.
-- Applied by the versioned migration runner, inside one transaction.
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS storage_mode text NOT NULL DEFAULT 'jsonb'
  CHECK (storage_mode IN ('jsonb', 'relational'));
CREATE TABLE dw_v3_wallet_meta (
  wallet_id text PRIMARY KEY REFERENCES wallets(user_id) ON DELETE RESTRICT,
  source_version integer NOT NULL,
  metadata jsonb NOT NULL CHECK (jsonb_typeof(metadata) = 'object'),
  checksum text NOT NULL,
  migrated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE dw_v3_accounts (
  wallet_id text NOT NULL REFERENCES dw_v3_wallet_meta(wallet_id) ON DELETE RESTRICT,
  row_id text NOT NULL,
  parent_id text,
  position integer NOT NULL CHECK (position >= 0),
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  f_name text NOT NULL,
  f_type text NOT NULL,
  f_opening bigint NOT NULL CHECK (f_opening BETWEEN -9007199254740991 AND 9007199254740991),
  f_date text NOT NULL,
  f_limit bigint NOT NULL CHECK (f_limit BETWEEN -9007199254740991 AND 9007199254740991),
  f_institution text NOT NULL,
  f_counterparty text NOT NULL,
  f_purpose text NOT NULL,
  f_loan_type text NOT NULL,
  f_terms text NOT NULL,
  f_due_date text NOT NULL,
  f_archived boolean NOT NULL,
  PRIMARY KEY (wallet_id, row_id)
);
CREATE INDEX dw_v3_accounts_order ON dw_v3_accounts(wallet_id, parent_id, position);
CREATE TABLE dw_v3_categories (
  wallet_id text NOT NULL REFERENCES dw_v3_wallet_meta(wallet_id) ON DELETE RESTRICT,
  row_id text NOT NULL,
  parent_id text,
  position integer NOT NULL CHECK (position >= 0),
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  f_name text NOT NULL,
  f_archived boolean NOT NULL,
  PRIMARY KEY (wallet_id, row_id)
);
CREATE INDEX dw_v3_categories_order ON dw_v3_categories(wallet_id, parent_id, position);
CREATE TABLE dw_v3_events (
  wallet_id text NOT NULL REFERENCES dw_v3_wallet_meta(wallet_id) ON DELETE RESTRICT,
  row_id text NOT NULL,
  parent_id text,
  position integer NOT NULL CHECK (position >= 0),
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  f_type text NOT NULL,
  f_date text NOT NULL,
  f_recorded_at text NOT NULL,
  f_description text NOT NULL,
  f_notes text NOT NULL,
  f_category text NOT NULL,
  f_expense bigint NOT NULL CHECK (f_expense BETWEEN -9007199254740991 AND 9007199254740991),
  f_income bigint NOT NULL CHECK (f_income BETWEEN -9007199254740991 AND 9007199254740991),
  f_inflow bigint NOT NULL CHECK (f_inflow BETWEEN -9007199254740991 AND 9007199254740991),
  f_outflow bigint NOT NULL CHECK (f_outflow BETWEEN -9007199254740991 AND 9007199254740991),
  PRIMARY KEY (wallet_id, row_id)
);
CREATE INDEX dw_v3_events_order ON dw_v3_events(wallet_id, parent_id, position);
CREATE TABLE dw_v3_lines (
  wallet_id text NOT NULL REFERENCES dw_v3_wallet_meta(wallet_id) ON DELETE RESTRICT,
  row_id text NOT NULL,
  parent_id text NOT NULL,
  position integer NOT NULL CHECK (position >= 0),
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  f_account text NOT NULL,
  f_delta bigint NOT NULL CHECK (f_delta BETWEEN -9007199254740991 AND 9007199254740991),
  PRIMARY KEY (wallet_id, row_id),
  FOREIGN KEY (wallet_id, parent_id) REFERENCES dw_v3_events(wallet_id, row_id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX dw_v3_lines_order ON dw_v3_lines(wallet_id, parent_id, position);
CREATE TABLE dw_v3_revisions (
  wallet_id text NOT NULL REFERENCES dw_v3_wallet_meta(wallet_id) ON DELETE RESTRICT,
  row_id text NOT NULL,
  parent_id text NOT NULL,
  position integer NOT NULL CHECK (position >= 0),
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  f_edited_at text NOT NULL,
  PRIMARY KEY (wallet_id, row_id),
  FOREIGN KEY (wallet_id, parent_id) REFERENCES dw_v3_events(wallet_id, row_id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX dw_v3_revisions_order ON dw_v3_revisions(wallet_id, parent_id, position);
CREATE TABLE dw_v3_limits (
  wallet_id text NOT NULL REFERENCES dw_v3_wallet_meta(wallet_id) ON DELETE RESTRICT,
  row_id text NOT NULL,
  parent_id text NOT NULL,
  position integer NOT NULL CHECK (position >= 0),
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  f_date text NOT NULL,
  f_limit bigint NOT NULL CHECK (f_limit BETWEEN -9007199254740991 AND 9007199254740991),
  f_recorded_at text NOT NULL,
  PRIMARY KEY (wallet_id, row_id),
  FOREIGN KEY (wallet_id, parent_id) REFERENCES dw_v3_accounts(wallet_id, row_id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX dw_v3_limits_order ON dw_v3_limits(wallet_id, parent_id, position);
CREATE TABLE dw_v3_allocations (
  wallet_id text NOT NULL REFERENCES dw_v3_wallet_meta(wallet_id) ON DELETE RESTRICT,
  row_id text NOT NULL,
  parent_id text,
  position integer NOT NULL CHECK (position >= 0),
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  f_loan text NOT NULL,
  f_purpose text NOT NULL,
  f_holding text NOT NULL,
  f_assigned bigint NOT NULL CHECK (f_assigned BETWEEN -9007199254740991 AND 9007199254740991),
  f_remaining bigint NOT NULL CHECK (f_remaining BETWEEN -9007199254740991 AND 9007199254740991),
  f_committed bigint NOT NULL CHECK (f_committed BETWEEN -9007199254740991 AND 9007199254740991),
  f_used bigint NOT NULL CHECK (f_used BETWEEN -9007199254740991 AND 9007199254740991),
  f_released bigint NOT NULL CHECK (f_released BETWEEN -9007199254740991 AND 9007199254740991),
  f_returned bigint NOT NULL CHECK (f_returned BETWEEN -9007199254740991 AND 9007199254740991),
  PRIMARY KEY (wallet_id, row_id)
);
CREATE INDEX dw_v3_allocations_order ON dw_v3_allocations(wallet_id, parent_id, position);
CREATE TABLE dw_v3_commitments (
  wallet_id text NOT NULL REFERENCES dw_v3_wallet_meta(wallet_id) ON DELETE RESTRICT,
  row_id text NOT NULL,
  parent_id text NOT NULL,
  position integer NOT NULL CHECK (position >= 0),
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  f_account text NOT NULL,
  f_amount bigint NOT NULL CHECK (f_amount BETWEEN -9007199254740991 AND 9007199254740991),
  PRIMARY KEY (wallet_id, row_id),
  FOREIGN KEY (wallet_id, parent_id) REFERENCES dw_v3_allocations(wallet_id, row_id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX dw_v3_commitments_order ON dw_v3_commitments(wallet_id, parent_id, position);
CREATE TABLE dw_v3_budgets (
  wallet_id text NOT NULL REFERENCES dw_v3_wallet_meta(wallet_id) ON DELETE RESTRICT,
  row_id text NOT NULL,
  parent_id text,
  position integer NOT NULL CHECK (position >= 0),
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  f_total bigint NOT NULL CHECK (f_total BETWEEN -9007199254740991 AND 9007199254740991),
  PRIMARY KEY (wallet_id, row_id)
);
CREATE INDEX dw_v3_budgets_order ON dw_v3_budgets(wallet_id, parent_id, position);
CREATE TABLE dw_v3_budget_categories (
  wallet_id text NOT NULL REFERENCES dw_v3_wallet_meta(wallet_id) ON DELETE RESTRICT,
  row_id text NOT NULL,
  parent_id text NOT NULL,
  position integer NOT NULL CHECK (position >= 0),
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  f_category text NOT NULL,
  f_amount bigint NOT NULL CHECK (f_amount BETWEEN -9007199254740991 AND 9007199254740991),
  PRIMARY KEY (wallet_id, row_id),
  FOREIGN KEY (wallet_id, parent_id) REFERENCES dw_v3_budgets(wallet_id, row_id) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX dw_v3_budget_categories_order ON dw_v3_budget_categories(wallet_id, parent_id, position);
CREATE TABLE dw_v3_deleted_accounts (
  wallet_id text NOT NULL REFERENCES dw_v3_wallet_meta(wallet_id) ON DELETE RESTRICT,
  row_id text NOT NULL,
  parent_id text,
  position integer NOT NULL CHECK (position >= 0),
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  f_deleted_at text NOT NULL,
  PRIMARY KEY (wallet_id, row_id)
);
CREATE INDEX dw_v3_deleted_accounts_order ON dw_v3_deleted_accounts(wallet_id, parent_id, position);
CREATE TABLE dw_v3_management (
  wallet_id text NOT NULL REFERENCES dw_v3_wallet_meta(wallet_id) ON DELETE RESTRICT,
  row_id text NOT NULL,
  parent_id text,
  position integer NOT NULL CHECK (position >= 0),
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  f_action text NOT NULL,
  f_id text NOT NULL,
  f_at text NOT NULL,
  PRIMARY KEY (wallet_id, row_id)
);
CREATE INDEX dw_v3_management_order ON dw_v3_management(wallet_id, parent_id, position);

ALTER TABLE dw_v3_accounts ADD CHECK (f_type IN ('bank','cash','card','investment','loan','receivable'));
ALTER TABLE dw_v3_accounts ADD CHECK (f_opening >= 0 AND f_limit >= 0);
ALTER TABLE dw_v3_events ADD CHECK (f_type IN ('opening','income','expense','borrow','transfer','invest','capitalReturn','cardPayment','lend','receive','repay','refund','release'));
ALTER TABLE dw_v3_allocations ADD FOREIGN KEY (wallet_id,f_loan) REFERENCES dw_v3_accounts(wallet_id,row_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE dw_v3_allocations ADD FOREIGN KEY (wallet_id,f_holding) REFERENCES dw_v3_accounts(wallet_id,row_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE dw_v3_allocations ADD CHECK (f_remaining >= 0 AND f_committed >= 0 AND f_committed <= f_remaining);
ALTER TABLE dw_v3_commitments ADD FOREIGN KEY (wallet_id,f_account) REFERENCES dw_v3_accounts(wallet_id,row_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE dw_v3_commitments ADD CHECK (f_amount >= 0);
ALTER TABLE dw_v3_budget_categories ADD FOREIGN KEY (wallet_id,f_category) REFERENCES dw_v3_categories(wallet_id,row_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE dw_v3_budget_categories ADD CHECK (f_amount >= 0);
ALTER TABLE dw_v3_budgets ADD CHECK (f_total >= 0);
CREATE INDEX dw_v3_events_history ON dw_v3_events(wallet_id,f_date DESC,row_id DESC);
CREATE INDEX dw_v3_lines_account ON dw_v3_lines(wallet_id,f_account,parent_id);

-- Cross-row accounting invariants are checked at commit, after the full batch.
CREATE FUNCTION dw_v3_check_journal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE w text; bad boolean; old_entry text; new_entry text;
BEGIN
  w := COALESCE(NEW.wallet_id, OLD.wallet_id);
  IF TG_TABLE_NAME = 'dw_v3_lines' THEN
    IF TG_OP <> 'INSERT' THEN old_entry := OLD.parent_id; END IF;
    IF TG_OP <> 'DELETE' THEN new_entry := NEW.parent_id; END IF;
    SELECT EXISTS(SELECT 1 FROM dw_v3_lines WHERE wallet_id=w AND parent_id IN (old_entry,new_entry) GROUP BY parent_id HAVING sum(f_delta) <> 0) INTO bad;
  ELSE bad := false;
  END IF;
  IF bad THEN RAISE EXCEPTION 'Unbalanced journal'; END IF;
  SELECT EXISTS(SELECT 1 FROM dw_v3_lines l WHERE l.wallet_id=w
    AND ((TG_TABLE_NAME='dw_v3_lines' AND l.parent_id IN (old_entry,new_entry)) OR TG_TABLE_NAME='dw_v3_accounts')
    AND l.f_account NOT IN ('system:equity','system:income','system:expense')
    AND NOT EXISTS(SELECT 1 FROM dw_v3_accounts a WHERE a.wallet_id=l.wallet_id AND a.row_id=l.f_account)) INTO bad;
  IF bad THEN RAISE EXCEPTION 'Journal account does not belong to wallet'; END IF;
  RETURN NULL;
END; $$;
CREATE CONSTRAINT TRIGGER dw_v3_balanced AFTER INSERT OR UPDATE OR DELETE ON dw_v3_lines
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION dw_v3_check_journal();
CREATE CONSTRAINT TRIGGER dw_v3_account_reference AFTER DELETE OR UPDATE ON dw_v3_accounts
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION dw_v3_check_journal();
ALTER TABLE dw_schema_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON dw_schema_migrations FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'REVOKE ALL ON dw_schema_migrations FROM anon'; END IF; IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'REVOKE ALL ON dw_schema_migrations FROM authenticated'; END IF; END $$;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON users FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'REVOKE ALL ON users FROM anon'; END IF; IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'REVOKE ALL ON users FROM authenticated'; END IF; END $$;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON sessions FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'REVOKE ALL ON sessions FROM anon'; END IF; IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'REVOKE ALL ON sessions FROM authenticated'; END IF; END $$;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON wallets FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'REVOKE ALL ON wallets FROM anon'; END IF; IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'REVOKE ALL ON wallets FROM authenticated'; END IF; END $$;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON institutions FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'REVOKE ALL ON institutions FROM anon'; END IF; IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'REVOKE ALL ON institutions FROM authenticated'; END IF; END $$;
ALTER TABLE audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON audit FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'REVOKE ALL ON audit FROM anon'; END IF; IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'REVOKE ALL ON audit FROM authenticated'; END IF; END $$;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON attempts FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'REVOKE ALL ON attempts FROM anon'; END IF; IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'REVOKE ALL ON attempts FROM authenticated'; END IF; END $$;
ALTER TABLE dw_v3_wallet_meta ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON dw_v3_wallet_meta FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'REVOKE ALL ON dw_v3_wallet_meta FROM anon'; END IF; IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'REVOKE ALL ON dw_v3_wallet_meta FROM authenticated'; END IF; END $$;
ALTER TABLE dw_v3_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON dw_v3_accounts FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'REVOKE ALL ON dw_v3_accounts FROM anon'; END IF; IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'REVOKE ALL ON dw_v3_accounts FROM authenticated'; END IF; END $$;
ALTER TABLE dw_v3_categories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON dw_v3_categories FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'REVOKE ALL ON dw_v3_categories FROM anon'; END IF; IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'REVOKE ALL ON dw_v3_categories FROM authenticated'; END IF; END $$;
ALTER TABLE dw_v3_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON dw_v3_events FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'REVOKE ALL ON dw_v3_events FROM anon'; END IF; IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'REVOKE ALL ON dw_v3_events FROM authenticated'; END IF; END $$;
ALTER TABLE dw_v3_lines ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON dw_v3_lines FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'REVOKE ALL ON dw_v3_lines FROM anon'; END IF; IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'REVOKE ALL ON dw_v3_lines FROM authenticated'; END IF; END $$;
ALTER TABLE dw_v3_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON dw_v3_revisions FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'REVOKE ALL ON dw_v3_revisions FROM anon'; END IF; IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'REVOKE ALL ON dw_v3_revisions FROM authenticated'; END IF; END $$;
ALTER TABLE dw_v3_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON dw_v3_limits FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'REVOKE ALL ON dw_v3_limits FROM anon'; END IF; IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'REVOKE ALL ON dw_v3_limits FROM authenticated'; END IF; END $$;
ALTER TABLE dw_v3_allocations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON dw_v3_allocations FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'REVOKE ALL ON dw_v3_allocations FROM anon'; END IF; IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'REVOKE ALL ON dw_v3_allocations FROM authenticated'; END IF; END $$;
ALTER TABLE dw_v3_commitments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON dw_v3_commitments FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'REVOKE ALL ON dw_v3_commitments FROM anon'; END IF; IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'REVOKE ALL ON dw_v3_commitments FROM authenticated'; END IF; END $$;
ALTER TABLE dw_v3_budgets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON dw_v3_budgets FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'REVOKE ALL ON dw_v3_budgets FROM anon'; END IF; IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'REVOKE ALL ON dw_v3_budgets FROM authenticated'; END IF; END $$;
ALTER TABLE dw_v3_budget_categories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON dw_v3_budget_categories FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'REVOKE ALL ON dw_v3_budget_categories FROM anon'; END IF; IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'REVOKE ALL ON dw_v3_budget_categories FROM authenticated'; END IF; END $$;
ALTER TABLE dw_v3_deleted_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON dw_v3_deleted_accounts FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'REVOKE ALL ON dw_v3_deleted_accounts FROM anon'; END IF; IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'REVOKE ALL ON dw_v3_deleted_accounts FROM authenticated'; END IF; END $$;
ALTER TABLE dw_v3_management ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON dw_v3_management FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE 'REVOKE ALL ON dw_v3_management FROM anon'; END IF; IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE 'REVOKE ALL ON dw_v3_management FROM authenticated'; END IF; END $$;
