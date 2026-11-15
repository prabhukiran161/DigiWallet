ALTER TABLE dw_categories ADD COLUMN IF NOT EXISTS color text
  CHECK (color IN ('blue', 'light-blue', 'green', 'light-green', 'red', 'light-red', 'yellow', 'orange', 'purple', 'light-purple', 'pink', 'light-pink', 'maroon', 'teal', 'gray', 'black'));
