-- Create shift_notes table
CREATE TABLE IF NOT EXISTS public.shift_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    content TEXT NOT NULL,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    department TEXT NOT NULL,
    is_important BOOLEAN DEFAULT FALSE
);

-- Set up Row Level Security
ALTER TABLE public.shift_notes ENABLE ROW LEVEL SECURITY;

-- Policies for shift_notes
CREATE POLICY "Enable read access for all authenticated users"
ON public.shift_notes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON public.shift_notes FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable delete for super admins"
ON public.shift_notes FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'superadmin')
    )
);

-- Create index on department for faster filtering
CREATE INDEX IF NOT EXISTS idx_shift_notes_department ON public.shift_notes(department);
CREATE INDEX IF NOT EXISTS idx_shift_notes_created_at ON public.shift_notes(created_at DESC);
