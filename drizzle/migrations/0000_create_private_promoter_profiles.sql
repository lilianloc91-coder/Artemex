CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 display_name text NOT NULL DEFAULT '',
 avatar_path text,
 professional_email text NOT NULL DEFAULT '',
 official_id text NOT NULL DEFAULT '',
 professional_title text NOT NULL DEFAULT '',
 organization text NOT NULL DEFAULT '',
 credential text NOT NULL DEFAULT '',
 experience_years integer NOT NULL DEFAULT 0 CHECK (experience_years >= 0),
 region text NOT NULL DEFAULT '',
 communities text NOT NULL DEFAULT '',
 bio text NOT NULL DEFAULT '',
 specialties text[] NOT NULL DEFAULT '{}',
 ethics_accepted boolean NOT NULL DEFAULT false,
 submitted_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE FUNCTION public.create_user_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN INSERT INTO public.profiles(id, display_name, professional_email) VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'full_name',''),coalesce(NEW.email,'')); RETURN NEW; END; $$;
CREATE TRIGGER create_profile_on_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();
INSERT INTO public.profiles(id, display_name, professional_email) SELECT id, coalesce(raw_user_meta_data->>'full_name',''),coalesce(email,'') FROM auth.users ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Read own promoter photo" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'promoter-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Upload own promoter photo" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'promoter-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Update own promoter photo" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'promoter-photos' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'promoter-photos' AND (storage.foldername(name))[1] = auth.uid()::text);