-- =============================================================
-- EzUmrah CRM — SaaS hardening: RLS tenant isolation + roles
-- =============================================================

-- superadmin role
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('superadmin', 'owner', 'manager', 'staff'));

-- Helpers (SECURITY DEFINER so policies can read profiles)
CREATE OR REPLACE FUNCTION public.current_agency_id()
RETURNS uuid AS $$
  SELECT agency_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'superadmin');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- invoice_items / quotation_items get agency_id for uniform isolation
ALTER TABLE public.invoice_items   ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.quotation_items ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE;
UPDATE public.invoice_items ii   SET agency_id = i.agency_id  FROM public.invoices i   WHERE i.id = ii.invoice_id AND ii.agency_id IS NULL;
UPDATE public.quotation_items qi SET agency_id = q.agency_id  FROM public.quotations q WHERE q.id = qi.quotation_id AND qi.agency_id IS NULL;

-- Enable RLS on all tenant tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'agencies','profiles','packages','customers','bookings','flights','hotels',
    'visas','transports','invoices','invoice_items','quotations','quotation_items',
    'documents','tasks'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- Tenant isolation policy (all ops, authenticated only)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'packages','customers','bookings','flights','hotels','visas','transports',
    'invoices','invoice_items','quotations','quotation_items','documents','tasks'
  ] LOOP
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON public.%I
      FOR ALL TO authenticated
      USING (agency_id = public.current_agency_id() OR public.is_superadmin())
      WITH CHECK (agency_id = public.current_agency_id() OR public.is_superadmin())
    $f$, t);
  END LOOP;
END $$;

-- agencies: tenant sees its own row; superadmin sees all
CREATE POLICY tenant_isolation ON public.agencies
  FOR ALL TO authenticated
  USING (id = public.current_agency_id() OR public.is_superadmin())
  WITH CHECK (id = public.current_agency_id() OR public.is_superadmin());

-- profiles: users see colleagues in their agency; superadmin sees all
CREATE POLICY tenant_isolation ON public.profiles
  FOR ALL TO authenticated
  USING (agency_id = public.current_agency_id() OR id = auth.uid() OR public.is_superadmin())
  WITH CHECK (agency_id = public.current_agency_id() OR id = auth.uid() OR public.is_superadmin());
