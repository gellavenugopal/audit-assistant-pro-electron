-- One-time setup: Create a helper function to execute SQL
-- Run this ONCE in Supabase Dashboard SQL Editor, then you can use the migration script

CREATE OR REPLACE FUNCTION public.exec_sql(sql_text TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  EXECUTE sql_text;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.exec_sql(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(TEXT) TO service_role;

