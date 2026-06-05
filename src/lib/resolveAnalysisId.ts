import { supabase } from "@/integrations/supabase/client";

/** Resolve `analyses.id` whether the input is an analysis UUID or a document UUID. */
export async function resolveAnalysisId(idOrDocumentId: string): Promise<string | null> {
  const byAnalysisId = await supabase
    .from("analyses")
    .select("id")
    .eq("id", idOrDocumentId)
    .maybeSingle();

  if (byAnalysisId.data?.id) return byAnalysisId.data.id;

  const byDocumentId = await supabase
    .from("analyses")
    .select("id")
    .eq("document_id", idOrDocumentId)
    .maybeSingle();

  return byDocumentId.data?.id ?? null;
}
