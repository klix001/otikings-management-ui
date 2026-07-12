-- Deduplicate inventory_items keeping only the row with the highest id per (name, date, department)
DELETE FROM public.inventory_items a
USING public.inventory_items b
WHERE a.id < b.id
  AND a.name = b.name
  AND a.date = b.date
  AND a.department = b.department;

-- Add unique constraint: one record per item per date per department
ALTER TABLE public.inventory_items
  DROP CONSTRAINT IF EXISTS inventory_items_name_date_dept_key;

ALTER TABLE public.inventory_items
  ADD CONSTRAINT inventory_items_name_date_dept_key
  UNIQUE (name, date, department);
