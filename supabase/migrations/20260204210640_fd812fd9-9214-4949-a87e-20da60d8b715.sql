-- Ajouter un champ pour forcer le changement de mot de passe à la première connexion
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false;