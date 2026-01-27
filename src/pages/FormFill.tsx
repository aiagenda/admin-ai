import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { FormFiller } from "@/components/FormFiller";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Form {
  id: string;
  key: string;
  name: string;
  pdf_url: string;
  fillable_url: string | null;
  instructions: string | null;
  form_type: string | null;
  category: string | null;
  fillable_online: boolean | null;
}

export default function FormFill() {
  const { formKey } = useParams<{ formKey: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadForm() {
      if (!formKey) {
        toast.error("Hiányzó űrlap kulcs");
        navigate("/archive");
        return;
      }

      try {
        const { data, error } = await supabase
          .from("forms")
          .select("*")
          .eq("key", formKey)
          .single();

        if (error) {
          throw error;
        }

        if (!data) {
          toast.error("Űrlap nem található");
          navigate("/archive");
          return;
        }

        setForm(data as Form);
      } catch (error: any) {
        console.error("Error loading form:", error);
        toast.error("Hiba az űrlap betöltése során: " + (error.message || "Ismeretlen hiba"));
        navigate("/archive");
      } finally {
        setLoading(false);
      }
    }

    loadForm();
  }, [formKey, navigate]);

  if (loading) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Űrlap nem található</p>
          <Button onClick={() => navigate("/archive")} className="mt-4">
            Vissza az archívumhoz
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Vissza
        </Button>
      </div>

      <FormFiller
        formId={form.id}
        formKey={form.key}
        formName={form.name}
        pdfUrl={form.pdf_url}
        fillableUrl={form.fillable_url}
        instructions={form.instructions}
      />
    </div>
  );
}

