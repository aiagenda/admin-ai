-- US accounting layer: switch invoice module from Hungarian VAT to US sales tax,
-- default currency to USD, and replace expense categories with IRS Schedule C lines.
-- The legacy invoices.vat_rate / vat_amount columns are kept and now hold the
-- sales-tax rate / sales-tax amount (internal names only; never shown to users).

-- ==============================================================================
-- 1. INVOICES: default currency USD for new rows
-- ==============================================================================
ALTER TABLE public.invoices ALTER COLUMN currency SET DEFAULT 'USD';

COMMENT ON COLUMN public.invoices.net_amount IS 'Subtotal (pre-tax total)';
COMMENT ON COLUMN public.invoices.vat_rate IS 'Sales tax rate, e.g. "8.25%" or "0%" (US sales/use tax)';
COMMENT ON COLUMN public.invoices.vat_amount IS 'Sales tax amount (US sales/use tax)';
COMMENT ON COLUMN public.invoices.gross_amount IS 'Total (subtotal + sales tax)';

-- ==============================================================================
-- 2. EXPENSE CATEGORIES: IRS Schedule C (Form 1040) lines
-- ==============================================================================
-- Track the Schedule C line for accountant-grade categorization.
ALTER TABLE public.expense_categories ADD COLUMN IF NOT EXISTS schedule_c_line TEXT;

-- Remove the old Hungarian default global categories.
DELETE FROM public.expense_categories WHERE user_id IS NULL AND is_default = true;

-- Insert IRS Schedule C categories. name = canonical key used by the AI + UI,
-- name_hu now holds the English display label (US market is English-only).
INSERT INTO public.expense_categories (user_id, name, name_hu, icon, is_default, sort_order, schedule_c_line) VALUES
  (NULL, 'advertising',        'Advertising',                    'megaphone',  true,  1,  'Line 8'),
  (NULL, 'car_truck',          'Car & Truck Expenses',           'car',        true,  2,  'Line 9'),
  (NULL, 'commissions_fees',   'Commissions & Fees',             'percent',    true,  3,  'Line 10'),
  (NULL, 'contract_labor',     'Contract Labor',                 'users',      true,  4,  'Line 11'),
  (NULL, 'depreciation',       'Depreciation',                   'trending-down', true, 5, 'Line 13'),
  (NULL, 'insurance',          'Insurance (other than health)',  'shield',     true,  6,  'Line 15'),
  (NULL, 'interest',           'Interest',                       'banknote',   true,  7,  'Line 16'),
  (NULL, 'legal_professional', 'Legal & Professional Services',  'scale',      true,  8,  'Line 17'),
  (NULL, 'office_expense',     'Office Expense',                 'pencil',     true,  9,  'Line 18'),
  (NULL, 'rent_lease',         'Rent or Lease',                  'building',   true, 10,  'Line 20'),
  (NULL, 'repairs',            'Repairs & Maintenance',          'wrench',     true, 11,  'Line 21'),
  (NULL, 'supplies',           'Supplies',                       'package',    true, 12,  'Line 22'),
  (NULL, 'taxes_licenses',     'Taxes & Licenses',               'file-text',  true, 13,  'Line 23'),
  (NULL, 'travel',             'Travel',                         'plane',      true, 14,  'Line 24a'),
  (NULL, 'meals',              'Meals (50% deductible)',         'utensils',   true, 15,  'Line 24b'),
  (NULL, 'utilities',          'Utilities',                      'plug',       true, 16,  'Line 25'),
  (NULL, 'wages',              'Wages',                          'users',      true, 17,  'Line 26'),
  (NULL, 'other',              'Other Expenses',                 'folder',     true, 18,  'Line 27a')
ON CONFLICT DO NOTHING;
