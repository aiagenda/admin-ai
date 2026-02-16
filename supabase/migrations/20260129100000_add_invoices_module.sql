-- Költségszámla modul - invoices tábla és kapcsolódó funkciók
-- Ez a modul csak enterprise (Professzionális) előfizetéssel érhető el

-- ==============================================================================
-- 1. INVOICES TÁBLA - Költségszámlák tárolása
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Fájl információk
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  upload_date TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Számla alapadatok (AI által kinyert)
  invoice_number TEXT,
  invoice_date DATE,
  due_date DATE,
  
  -- Kibocsátó adatai
  vendor_name TEXT,
  vendor_address TEXT,
  vendor_tax_id TEXT,
  
  -- Összegek
  net_amount DECIMAL(12, 2),
  vat_rate TEXT, -- '27%', '18%', '5%', 'AAM', 'TAM'
  vat_amount DECIMAL(12, 2),
  gross_amount DECIMAL(12, 2),
  currency TEXT DEFAULT 'HUF',
  
  -- Tétel és kategória
  item_description TEXT,
  expense_category TEXT, -- üzemanyag, irodaszer, utazás, stb.
  
  -- Státusz és meta
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  ai_confidence DECIMAL(3, 2), -- 0.00-1.00
  has_handwritten_content BOOLEAN DEFAULT false,
  
  -- Eredeti AI válasz
  raw_ai_response JSONB,
  
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices"
  ON public.invoices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices"
  ON public.invoices FOR DELETE
  USING (auth.uid() = user_id);

-- Indexek
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_upload_date ON public.invoices(upload_date);
CREATE INDEX IF NOT EXISTS idx_invoices_expense_category ON public.invoices(expense_category);
CREATE INDEX IF NOT EXISTS idx_invoices_vendor_name ON public.invoices(vendor_name);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invoices_updated_at();

-- ==============================================================================
-- 2. EXPENSE_CATEGORIES TÁBLA - Költség kategóriák
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL = globális
  name TEXT NOT NULL,
  name_hu TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view default categories"
  ON public.expense_categories FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can manage their own categories"
  ON public.expense_categories FOR ALL
  USING (auth.uid() = user_id);

-- Alapértelmezett kategóriák
INSERT INTO public.expense_categories (user_id, name, name_hu, icon, is_default, sort_order) VALUES
  (NULL, 'fuel', 'Üzemanyag', 'fuel', true, 1),
  (NULL, 'office', 'Irodaszer', 'pencil', true, 2),
  (NULL, 'travel', 'Utazás', 'plane', true, 3),
  (NULL, 'accommodation', 'Szállás', 'bed', true, 4),
  (NULL, 'food', 'Vendéglátás', 'utensils', true, 5),
  (NULL, 'phone', 'Telefon/Internet', 'phone', true, 6),
  (NULL, 'software', 'Szoftver/Előfizetés', 'laptop', true, 7),
  (NULL, 'maintenance', 'Karbantartás', 'wrench', true, 8),
  (NULL, 'marketing', 'Marketing/Reklám', 'megaphone', true, 9),
  (NULL, 'other', 'Egyéb', 'folder', true, 10)
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 3. OCR_FEEDBACK BŐVÍTÉS - Számla mezők
-- ==============================================================================

-- Új oszlopok hozzáadása (ha még nem léteznek)
DO $$
BEGIN
  -- Invoice number
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ocr_feedback' AND column_name = 'extracted_invoice_number') THEN
    ALTER TABLE public.ocr_feedback ADD COLUMN extracted_invoice_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ocr_feedback' AND column_name = 'correct_invoice_number') THEN
    ALTER TABLE public.ocr_feedback ADD COLUMN correct_invoice_number TEXT;
  END IF;
  
  -- Vendor name
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ocr_feedback' AND column_name = 'extracted_vendor_name') THEN
    ALTER TABLE public.ocr_feedback ADD COLUMN extracted_vendor_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ocr_feedback' AND column_name = 'correct_vendor_name') THEN
    ALTER TABLE public.ocr_feedback ADD COLUMN correct_vendor_name TEXT;
  END IF;
  
  -- VAT amount
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ocr_feedback' AND column_name = 'extracted_vat_amount') THEN
    ALTER TABLE public.ocr_feedback ADD COLUMN extracted_vat_amount TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ocr_feedback' AND column_name = 'correct_vat_amount') THEN
    ALTER TABLE public.ocr_feedback ADD COLUMN correct_vat_amount TEXT;
  END IF;
  
  -- Net amount
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ocr_feedback' AND column_name = 'extracted_net_amount') THEN
    ALTER TABLE public.ocr_feedback ADD COLUMN extracted_net_amount TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ocr_feedback' AND column_name = 'correct_net_amount') THEN
    ALTER TABLE public.ocr_feedback ADD COLUMN correct_net_amount TEXT;
  END IF;
  
  -- Invoice ID reference
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ocr_feedback' AND column_name = 'invoice_id') THEN
    ALTER TABLE public.ocr_feedback ADD COLUMN invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ==============================================================================
-- 4. SUBSCRIPTION CHECK FÜGGVÉNY - Könyvelés modul ellenőrzés
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.can_access_invoices(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan TEXT;
BEGIN
  SELECT plan_type INTO user_plan
  FROM public.user_subscriptions
  WHERE user_id = _user_id;
  
  -- Csak enterprise (Professzionális) csomag fér hozzá
  RETURN COALESCE(user_plan, 'free') = 'enterprise';
END;
$$;

-- ==============================================================================
-- 5. INVOICE USAGE TRACKING
-- ==============================================================================

-- Havi számla feltöltés számláló (külön a dokumentumoktól)
CREATE TABLE IF NOT EXISTS public.invoice_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  invoices_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, year, month)
);

ALTER TABLE public.invoice_usage_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invoice usage"
  ON public.invoice_usage_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage invoice usage"
  ON public.invoice_usage_stats FOR ALL
  USING (true);

-- Increment invoice usage
CREATE OR REPLACE FUNCTION public.increment_invoice_usage(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year INTEGER;
  current_month INTEGER;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  current_month := EXTRACT(MONTH FROM CURRENT_DATE);

  INSERT INTO public.invoice_usage_stats (user_id, year, month, invoices_count)
  VALUES (_user_id, current_year, current_month, 1)
  ON CONFLICT (user_id, year, month)
  DO UPDATE SET
    invoices_count = invoice_usage_stats.invoices_count + 1,
    updated_at = now();

  RETURN TRUE;
END;
$$;

-- ==============================================================================
-- 6. EXPORT HELPER VIEW
-- ==============================================================================

CREATE OR REPLACE VIEW public.invoices_export_view AS
SELECT 
  i.id,
  i.user_id,
  i.invoice_date,
  i.due_date,
  i.invoice_number,
  i.vendor_name,
  i.vendor_tax_id,
  i.item_description,
  i.net_amount,
  i.vat_rate,
  i.vat_amount,
  i.gross_amount,
  i.currency,
  i.expense_category,
  ec.name_hu as category_name_hu,
  i.filename,
  i.upload_date,
  i.status
FROM public.invoices i
LEFT JOIN public.expense_categories ec ON 
  (ec.name = i.expense_category AND (ec.user_id IS NULL OR ec.user_id = i.user_id));

-- Grant access to the view
GRANT SELECT ON public.invoices_export_view TO authenticated;
