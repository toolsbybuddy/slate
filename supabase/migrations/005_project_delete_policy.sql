-- Add DELETE policy for projects
-- Allows authenticated users to delete projects

CREATE POLICY "Authenticated users can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (true);
