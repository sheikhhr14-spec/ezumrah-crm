-- SaaS layer: agencies, profiles, packages, subscriptions

CREATE TABLE IF NOT EXISTS public.agencies (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL,
  plan                 text NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'professional', 'enterprise')),
  subscription_status  text NOT NULL DEFAULT 'incomplete' CHECK (subscription_status IN ('incomplete', 'trialing', 'active', 'past_due', 'cancelled')),
  stripe_customer_id   text,
  stripe_subscription_id text,
  current_period_end   timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id   uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  full_name   text,
  role        text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'staff')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Service packages agencies sell (umrah / hajj / ziyarah etc.)
CREATE TABLE IF NOT EXISTS public.packages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id     uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  name          text NOT NULL,
  service_type  text NOT NULL DEFAULT 'umrah' CHECK (service_type IN ('umrah', 'hajj', 'ziyarah', 'hotel', 'flight', 'transport', 'holiday')),
  duration_days integer,
  description   text,
  price_from    numeric(12,2),
  currency      text NOT NULL DEFAULT 'USD',
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Multi-tenant: add agency_id to data tables
ALTER TABLE public.customers  ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.bookings  ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.tasks     ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.flights   ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.hotels    ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.visas     ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.transports ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_customers_agency ON public.customers(agency_id);
CREATE INDEX IF NOT EXISTS idx_bookings_agency ON public.bookings(agency_id);
CREATE INDEX IF NOT EXISTS idx_packages_agency ON public.packages(agency_id);

DROP TRIGGER IF EXISTS trg_agencies_updated ON public.agencies;
CREATE TRIGGER trg_agencies_updated BEFORE UPDATE ON public.agencies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_packages_updated ON public.packages;
CREATE TRIGGER trg_packages_updated BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on auth signup (kept in sync by app too)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
