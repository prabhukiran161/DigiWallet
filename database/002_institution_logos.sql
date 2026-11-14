ALTER TABLE dw_institutions
  ADD COLUMN IF NOT EXISTS logo_png bytea
  CHECK (octet_length(logo_png) <= 32768);

INSERT INTO dw_institutions (id, name, kind, country, normalized_name) VALUES
  ('barb', 'Bank of Baroda', 'bank', 'IN', 'bank of baroda'),
  ('bkid', 'Bank of India', 'bank', 'IN', 'bank of india'),
  ('cnrb', 'Canara Bank', 'bank', 'IN', 'canara bank'),
  ('cbin', 'Central Bank of India', 'bank', 'IN', 'central bank of india'),
  ('fdrl', 'Federal Bank', 'bank', 'IN', 'federal bank'),
  ('ibkl', 'IDBI Bank', 'bank', 'IN', 'idbi bank'),
  ('idfb', 'IDFC First Bank', 'bank', 'IN', 'idfc first bank'),
  ('idib', 'Indian Bank', 'bank', 'IN', 'indian bank'),
  ('ioba', 'Indian Overseas Bank', 'bank', 'IN', 'indian overseas bank'),
  ('indb', 'IndusInd Bank', 'bank', 'IN', 'indusind bank'),
  ('ubin', 'Union Bank of India', 'bank', 'IN', 'union bank of india'),
  ('yesb', 'Yes Bank', 'bank', 'IN', 'yes bank')
ON CONFLICT DO NOTHING;
