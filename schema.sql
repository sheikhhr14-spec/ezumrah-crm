-- =============================================================
-- EzUmrah CRM — Database Schema
-- PostgreSQL (Supabase)
-- Modules: bookings, flights, hotels, visas, transport,
--          invoicing, quotations, documents, tasks
-- =============================================================

-- ---------- CUSTOMERS ----------
CREATE TABLE IF NOT EXISTS public.customers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     text NOT NULL,
  email         text,
  phone         text,
  whatsapp      text,
  country       text,
  passport_no   text,
  passport_expiry date,
  date_of_birth date,
  gender        text CHECK (gender IN ('male', 'female')),
  address       text,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customers_country ON public.customers(country);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(full_name);

-- ---------- BOOKINGS ----------
CREATE TABLE IF NOT EXISTS public.bookings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref    text NOT NULL,
  customer_id    uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  package_name   text,
  trip_type      text NOT NULL DEFAULT 'umrah' CHECK (trip_type IN ('umrah', 'hajj', 'holiday')),
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  pilgrims_count integer NOT NULL DEFAULT 1,
  departure_date date,
  return_date    date,
  total_amount    numeric(12,2) NOT NULL DEFAULT 0,
  paid_amount     numeric(12,2) NOT NULL DEFAULT 0,
  currency        text NOT NULL DEFAULT 'USD',
  source          text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bookings_ref_unique UNIQUE (booking_ref)
);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_departure ON public.bookings(departure_date);

-- ---------- FLIGHTS ----------
CREATE TABLE IF NOT EXISTS public.flights (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  airline           text,
  flight_no         text,
  departure_airport text,
  arrival_airport   text,
  departure_time     timestamptz,
  arrival_time       timestamptz,
  pax_count         integer NOT NULL DEFAULT 1,
  cabin_class       text DEFAULT 'economy' CHECK (cabin_class IN ('economy', 'premium', 'business', 'first')),
  confirmation_code text,
  status            text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_flights_booking ON public.flights(booking_id);

-- ---------- HOTELS ----------
CREATE TABLE IF NOT EXISTS public.hotels (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  city             text NOT NULL CHECK (city IN ('makkah', 'madinah', 'jeddah', 'taif', 'other')),
  hotel_name       text NOT NULL,
  check_in         date,
  check_out        date,
  nights           integer,
  room_type        text,
  rooms_count      integer NOT NULL DEFAULT 1,
  meal_plan        text,
  confirmation_code text,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hotels_booking ON public.hotels(booking_id);

-- ---------- VISAS ----------
CREATE TABLE IF NOT EXISTS public.visas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  visa_type        text NOT NULL DEFAULT 'umrah',
  application_date date,
  issue_date       date,
  expiry_date      date,
  visa_no          text,
  status           text NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'processing', 'issued', 'rejected', 'expired')),
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_visas_booking ON public.visas(booking_id);

-- ---------- TRANSPORT ----------
CREATE TABLE IF NOT EXISTS public.transports (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id     uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  transport_type text NOT NULL DEFAULT 'airport_transfer' CHECK (transport_type IN ('airport_transfer', 'intercity', 'local', 'ziyarah')),
  from_location  text,
  to_location    text,
  transport_date date,
  transport_time text,
  vehicle_type   text,
  seats          integer,
  driver_name    text,
  driver_phone   text,
  status         text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transports_booking ON public.transports(booking_id);

-- ---------- INVOICES ----------
CREATE TABLE IF NOT EXISTS public.invoices (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no  text NOT NULL,
  booking_id  uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  issue_date  date NOT NULL DEFAULT CURRENT_DATE,
  due_date    date,
  status      text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled')),
  subtotal    numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount  numeric(12,2) NOT NULL DEFAULT 0,
  total       numeric(12,2) NOT NULL DEFAULT 0,
  currency    text NOT NULL DEFAULT 'USD',
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoices_no_unique UNIQUE (invoice_no)
);
CREATE INDEX IF NOT EXISTS idx_invoices_booking ON public.invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity    numeric(10,2) NOT NULL DEFAULT 1,
  unit_price  numeric(12,2) NOT NULL DEFAULT 0,
  amount      numeric(12,2) NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);

-- ---------- QUOTATIONS ----------
CREATE TABLE IF NOT EXISTS public.quotations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_no     text NOT NULL,
  customer_id  uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  booking_id   uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  valid_until  date,
  status       text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  subtotal     numeric(12,2) NOT NULL DEFAULT 0,
  tax_amount   numeric(12,2) NOT NULL DEFAULT 0,
  total        numeric(12,2) NOT NULL DEFAULT 0,
  currency     text NOT NULL DEFAULT 'USD',
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quotations_no_unique UNIQUE (quote_no)
);
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON public.quotations(customer_id);

CREATE TABLE IF NOT EXISTS public.quotation_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  description  text NOT NULL,
  quantity     numeric(10,2) NOT NULL DEFAULT 1,
  unit_price   numeric(12,2) NOT NULL DEFAULT 0,
  amount       numeric(12,2) NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON public.quotation_items(quotation_id);

-- ---------- DOCUMENT VAULT ----------
CREATE TABLE IF NOT EXISTS public.documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id  uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  title        text NOT NULL,
  doc_type     text NOT NULL DEFAULT 'other' CHECK (doc_type IN ('passport', 'visa', 'ticket', 'hotel_voucher', 'transport_voucher', 'invoice', 'other')),
  file_url     text,
  file_name    text,
  file_size    bigint,
  expiry_date  date,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_booking ON public.documents(booking_id);
CREATE INDEX IF NOT EXISTS idx_documents_customer ON public.documents(customer_id);

-- ---------- TASKS ----------
CREATE TABLE IF NOT EXISTS public.tasks (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title              text NOT NULL,
  description        text,
  related_booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  due_date           date,
  priority           text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status             text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
  assigned_to        text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON public.tasks(due_date);

-- ---------- updated_at trigger ----------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customers_updated ON public.customers;
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_bookings_updated ON public.bookings;
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_flights_updated ON public.flights;
CREATE TRIGGER trg_flights_updated BEFORE UPDATE ON public.flights FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_hotels_updated ON public.hotels;
CREATE TRIGGER trg_hotels_updated BEFORE UPDATE ON public.hotels FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_visas_updated ON public.visas;
CREATE TRIGGER trg_visas_updated BEFORE UPDATE ON public.visas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_transports_updated ON public.transports;
CREATE TRIGGER trg_transports_updated BEFORE UPDATE ON public.transports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_invoices_updated ON public.invoices;
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_quotations_updated ON public.quotations;
CREATE TRIGGER trg_quotations_updated BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_documents_updated ON public.documents;
CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_tasks_updated ON public.tasks;
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- Grant access to Supabase's API roles ----------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
