-- Update the existing protector user's email from real email to phone-based email
-- so it matches the login flow
UPDATE auth.users 
SET email = '615709576@safehome.app',
    email_confirmed_at = NOW()
WHERE id = 'b512806f-bd51-43f1-9626-26d4dca68f79';