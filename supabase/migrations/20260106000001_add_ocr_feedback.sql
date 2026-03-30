-- Create OCR feedback table for tracking handwritten number recognition accuracy
CREATE TABLE IF NOT EXISTS public.ocr_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES public.analyses(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- OCR specifikus feedback
  ocr_accuracy TEXT CHECK (ocr_accuracy IN ('excellent', 'good', 'fair', 'poor')),
  handwritten_numbers_detected BOOLEAN DEFAULT false,
  handwritten_numbers_correct BOOLEAN, -- NULL ha nincs kézzel írott szám
  extracted_amount TEXT, -- AI által kinyert összeg
  correct_amount TEXT, -- Felhasználó által javított összeg (ha van)
  extracted_bank_account TEXT, -- AI által kinyert bankszámlaszám
  correct_bank_account TEXT, -- Felhasználó által javított bankszámlaszám (ha van)
  
  -- Feedback részletek
  feedback_comment TEXT, -- Opcionális komment
  improvement_suggestions TEXT, -- AI javaslatok a felismerés javításához
  
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.ocr_feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Users can view their own OCR feedback" ON public.ocr_feedback;
CREATE POLICY "Users can view their own OCR feedback"
  ON public.ocr_feedback FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own OCR feedback" ON public.ocr_feedback;
CREATE POLICY "Users can insert their own OCR feedback"
  ON public.ocr_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own OCR feedback" ON public.ocr_feedback;
CREATE POLICY "Users can update their own OCR feedback"
  ON public.ocr_feedback FOR UPDATE
  USING (auth.uid() = user_id);

-- Indexek
CREATE INDEX IF NOT EXISTS idx_ocr_feedback_analysis_id ON public.ocr_feedback(analysis_id);
CREATE INDEX IF NOT EXISTS idx_ocr_feedback_document_id ON public.ocr_feedback(document_id);
CREATE INDEX IF NOT EXISTS idx_ocr_feedback_user_id ON public.ocr_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ocr_feedback_handwritten ON public.ocr_feedback(handwritten_numbers_detected);
CREATE INDEX IF NOT EXISTS idx_ocr_feedback_accuracy ON public.ocr_feedback(ocr_accuracy);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_ocr_feedback_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ocr_feedback_updated_at ON public.ocr_feedback;
CREATE TRIGGER ocr_feedback_updated_at
  BEFORE UPDATE ON public.ocr_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ocr_feedback_updated_at();
