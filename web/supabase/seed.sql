-- Seed data for development

-- Create a demo organization
INSERT INTO public.organizations (id, name, slug, plan)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Organization', 'demo-org', 'pro')
ON CONFLICT DO NOTHING;
