-- Drop existing delete policy for super admins
DROP POLICY IF EXISTS "Enable delete for super admins" ON public.shift_notes;

-- Create new delete policy for authors and super admins
CREATE POLICY "Enable delete for authors and super admins"
ON public.shift_notes FOR DELETE
TO authenticated
USING (
    author_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('super_admin', 'superadmin')
    )
);
