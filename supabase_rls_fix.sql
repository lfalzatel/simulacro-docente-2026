-- Add Delete Policy for Admins
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;
CREATE POLICY "Admins can delete roles" 
ON user_roles 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Ensure Admins can also update roles (for the dropdown)
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
CREATE POLICY "Admins can update roles" 
ON user_roles 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Ensure Admins can see all roles
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
CREATE POLICY "Admins can view all roles" 
ON user_roles 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) OR user_id = auth.uid()
);
