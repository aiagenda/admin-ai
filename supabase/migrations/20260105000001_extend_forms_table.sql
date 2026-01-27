-- Extend forms table with new fields for Knowledge Base and form filling functionality
ALTER TABLE public.forms 
ADD COLUMN IF NOT EXISTS form_type TEXT CHECK (form_type IN ('form', 'letter', 'guide', 'template')),
ADD COLUMN IF NOT EXISTS category TEXT, -- 'adozas', 'egeszsegugy', 'oktatas', 'szocialis', 'kozlekedes', 'ingatlan', 'uzlet', 'egyeb'
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS fillable_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS fillable_url TEXT, -- Online kitöltési URL
ADD COLUMN IF NOT EXISTS download_url TEXT, -- Letöltési URL (ha különbözik a pdf_url-től)
ADD COLUMN IF NOT EXISTS print_url TEXT, -- Nyomtatási URL (ha különbözik a pdf_url-től)
ADD COLUMN IF NOT EXISTS instructions TEXT, -- Kitöltési útmutató
ADD COLUMN IF NOT EXISTS required_documents TEXT[], -- Szükséges mellékletek
ADD COLUMN IF NOT EXISTS deadline_info TEXT, -- Határidő információk
ADD COLUMN IF NOT EXISTS official_source_url TEXT, -- Hivatalos forrás URL
ADD COLUMN IF NOT EXISTS last_updated DATE; -- Utolsó frissítés dátuma

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_forms_category ON public.forms(category);
CREATE INDEX IF NOT EXISTS idx_forms_form_type ON public.forms(form_type);
CREATE INDEX IF NOT EXISTS idx_forms_tags ON public.forms USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_forms_fillable_online ON public.forms(fillable_online);

-- Add comments for documentation
COMMENT ON COLUMN public.forms.form_type IS 'Type of form: form, letter, guide, or template';
COMMENT ON COLUMN public.forms.category IS 'Category of the form (adozas, egeszsegugy, oktatas, szocialis, kozlekedes, ingatlan, uzlet, egyeb)';
COMMENT ON COLUMN public.forms.tags IS 'Array of tags for better searchability';
COMMENT ON COLUMN public.forms.fillable_online IS 'Whether the form can be filled online';
COMMENT ON COLUMN public.forms.fillable_url IS 'URL for online form filling';
COMMENT ON COLUMN public.forms.download_url IS 'URL for downloading the form (if different from pdf_url)';
COMMENT ON COLUMN public.forms.print_url IS 'URL for printing the form (if different from pdf_url)';
COMMENT ON COLUMN public.forms.instructions IS 'Instructions for filling out the form';
COMMENT ON COLUMN public.forms.required_documents IS 'Array of required documents/attachments';
COMMENT ON COLUMN public.forms.deadline_info IS 'Information about deadlines related to this form';
COMMENT ON COLUMN public.forms.official_source_url IS 'Official source URL where this form is published';
COMMENT ON COLUMN public.forms.last_updated IS 'Date when the form was last updated';

