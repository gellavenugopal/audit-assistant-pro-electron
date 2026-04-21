-- Add 5-level hierarchy columns to trial_balance_lines
ALTER TABLE trial_balance_lines 
ADD COLUMN IF NOT EXISTS face_group text,
ADD COLUMN IF NOT EXISTS note_group text,
ADD COLUMN IF NOT EXISTS sub_note text,
ADD COLUMN IF NOT EXISTS level4_group text,
ADD COLUMN IF NOT EXISTS level5_detail text;

-- Add balance logic columns to aile_mapping_rules
ALTER TABLE aile_mapping_rules 
ADD COLUMN IF NOT EXISTS target_face_group text,
ADD COLUMN IF NOT EXISTS target_note_group text,
ADD COLUMN IF NOT EXISTS target_sub_note text,
ADD COLUMN IF NOT EXISTS has_balance_logic boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS negative_face_group text,
ADD COLUMN IF NOT EXISTS negative_note_group text,
ADD COLUMN IF NOT EXISTS negative_sub_note text,
ADD COLUMN IF NOT EXISTS positive_face_group text,
ADD COLUMN IF NOT EXISTS positive_note_group text,
ADD COLUMN IF NOT EXISTS positive_sub_note text;

-- Add comment for clarity
COMMENT ON COLUMN trial_balance_lines.face_group IS 'Level 1: Face of Financial Statement (Current Assets, Non-Current Assets, etc.)';
COMMENT ON COLUMN trial_balance_lines.note_group IS 'Level 2: Note Group (Cash and cash equivalents, Trade receivables, etc.)';
COMMENT ON COLUMN trial_balance_lines.sub_note IS 'Level 3: Sub Note detail';
COMMENT ON COLUMN trial_balance_lines.level4_group IS 'Level 4: Ledger group (mandatory for BS items)';
COMMENT ON COLUMN trial_balance_lines.level5_detail IS 'Level 5: Ledger detail (mandatory for PL items)';
COMMENT ON COLUMN aile_mapping_rules.has_balance_logic IS 'Whether this rule applies balance-based reclassification';
COMMENT ON COLUMN aile_mapping_rules.negative_face_group IS 'Face group when closing balance is negative (Debit in Tally)';
COMMENT ON COLUMN aile_mapping_rules.positive_face_group IS 'Face group when closing balance is positive (Credit in Tally)';