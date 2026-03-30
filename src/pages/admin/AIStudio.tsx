import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type PromptVersion = {
  id: string;
  doc_type: string;
  language_code: string;
  version: number;
  name: string;
  system_prompt: string;
  schema_prompt: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
};

type FieldDefinition = {
  id: string;
  doc_type: string;
  field_key: string;
  display_name: string;
  data_type: "text" | "number" | "boolean" | "date" | "array";
  is_required: boolean;
  prompt_snippet: string | null;
  sort_order: number;
  is_active: boolean;
};

type QualitySummary = {
  total_runs: number;
  success_runs: number;
  failed_runs: number;
  avg_confidence: number | null;
  helpful_feedback: number;
  negative_feedback: number;
};

const DEFAULT_DOC_TYPE = "general";
const DEFAULT_LANGUAGE = "hu";

export default function AIStudio() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prompts, setPrompts] = useState<PromptVersion[]>([]);
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [quality, setQuality] = useState<QualitySummary | null>(null);

  const [docType, setDocType] = useState(DEFAULT_DOC_TYPE);
  const [languageCode, setLanguageCode] = useState(DEFAULT_LANGUAGE);

  const [promptName, setPromptName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [schemaPrompt, setSchemaPrompt] = useState("");
  const [promptNotes, setPromptNotes] = useState("");

  const [fieldKey, setFieldKey] = useState("");
  const [fieldDisplayName, setFieldDisplayName] = useState("");
  const [fieldDataType, setFieldDataType] = useState<FieldDefinition["data_type"]>("text");
  const [fieldPromptSnippet, setFieldPromptSnippet] = useState("");

  const filteredPrompts = useMemo(
    () => prompts.filter((p) => p.doc_type === docType && p.language_code === languageCode).sort((a, b) => b.version - a.version),
    [prompts, docType, languageCode],
  );

  const filteredFields = useMemo(
    () => fields.filter((f) => f.doc_type === docType).sort((a, b) => a.sort_order - b.sort_order),
    [fields, docType],
  );

  useEffect(() => {
    void loadAll();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);

      const [promptRes, fieldRes, qualityRes] = await Promise.all([
        (supabase.from("ai_prompt_versions" as any).select("*").order("created_at", { ascending: false })) as any,
        (supabase.from("ai_field_definitions" as any).select("*").order("sort_order", { ascending: true })) as any,
        (supabase.rpc("get_ai_quality_summary", { _days: 30 })) as any,
      ]);

      if (promptRes.error) throw promptRes.error;
      if (fieldRes.error) throw fieldRes.error;

      setPrompts((promptRes.data || []) as PromptVersion[]);
      setFields((fieldRes.data || []) as FieldDefinition[]);

      if (!qualityRes.error && qualityRes.data) {
        const q = Array.isArray(qualityRes.data) ? qualityRes.data[0] : qualityRes.data;
        setQuality((q || null) as QualitySummary | null);
      }
    } catch (error: any) {
      toast.error(`AI Studio betöltési hiba: ${error.message || "ismeretlen hiba"}`);
    } finally {
      setLoading(false);
    }
  }

  async function createPromptVersion() {
    if (!promptName.trim() || !systemPrompt.trim()) {
      toast.error("A prompt név és system prompt kötelező.");
      return;
    }

    try {
      setSaving(true);
      const nextVersion = (filteredPrompts[0]?.version || 0) + 1;

      const { error } = await (supabase.from("ai_prompt_versions" as any).insert({
        doc_type: docType,
        language_code: languageCode,
        version: nextVersion,
        name: promptName.trim(),
        system_prompt: systemPrompt,
        schema_prompt: schemaPrompt || null,
        notes: promptNotes || null,
        is_active: filteredPrompts.length === 0,
      }) as any);

      if (error) throw error;

      setPromptName("");
      setSystemPrompt("");
      setSchemaPrompt("");
      setPromptNotes("");
      toast.success(`Új prompt verzió létrehozva (v${nextVersion}).`);
      await loadAll();
    } catch (error: any) {
      toast.error(`Prompt mentési hiba: ${error.message || "ismeretlen hiba"}`);
    } finally {
      setSaving(false);
    }
  }

  async function activatePrompt(prompt: PromptVersion) {
    try {
      setSaving(true);
      const { error: deactivateError } = await (supabase
        .from("ai_prompt_versions" as any)
        .update({ is_active: false })
        .eq("doc_type", prompt.doc_type)
        .eq("language_code", prompt.language_code) as any);

      if (deactivateError) throw deactivateError;

      const { error: activateError } = await (supabase
        .from("ai_prompt_versions" as any)
        .update({ is_active: true })
        .eq("id", prompt.id) as any);

      if (activateError) throw activateError;

      toast.success(`Aktív prompt: ${prompt.name} (v${prompt.version})`);
      await loadAll();
    } catch (error: any) {
      toast.error(`Aktiválási hiba: ${error.message || "ismeretlen hiba"}`);
    } finally {
      setSaving(false);
    }
  }

  async function createFieldDefinition() {
    if (!fieldKey.trim() || !fieldDisplayName.trim()) {
      toast.error("A field key és display name kötelező.");
      return;
    }

    try {
      setSaving(true);
      const nextOrder = (filteredFields[filteredFields.length - 1]?.sort_order || 0) + 10;

      const { error } = await (supabase.from("ai_field_definitions" as any).upsert({
        doc_type: docType,
        field_key: fieldKey.trim(),
        display_name: fieldDisplayName.trim(),
        data_type: fieldDataType,
        is_required: false,
        prompt_snippet: fieldPromptSnippet || null,
        sort_order: nextOrder,
        is_active: true,
      }, { onConflict: "doc_type,field_key" }) as any);

      if (error) throw error;

      setFieldKey("");
      setFieldDisplayName("");
      setFieldPromptSnippet("");
      setFieldDataType("text");
      toast.success("Field definíció mentve.");
      await loadAll();
    } catch (error: any) {
      toast.error(`Field mentési hiba: ${error.message || "ismeretlen hiba"}`);
    } finally {
      setSaving(false);
    }
  }

  async function toggleField(field: FieldDefinition) {
    try {
      const { error } = await (supabase
        .from("ai_field_definitions" as any)
        .update({ is_active: !field.is_active })
        .eq("id", field.id) as any);
      if (error) throw error;
      await loadAll();
    } catch (error: any) {
      toast.error(`Field frissítési hiba: ${error.message || "ismeretlen hiba"}`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6 max-w-7xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button variant="ghost" onClick={() => navigate("/admin/analytics")} className="mb-3">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Vissza
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" />
            AI Studio
          </h1>
          <p className="text-muted-foreground mt-1">
            Prompt verziók, dinamikus mezők és AI minőségi metrikák kezelése.
          </p>
        </div>

        <Button variant="outline" onClick={() => void loadAll()} disabled={loading || saving}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Frissítés
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Összes AI futás (30 nap)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{quality?.total_runs ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sikeres / Hibás</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {(quality?.success_runs ?? 0)} / {(quality?.failed_runs ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Átlag confidence</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {quality?.avg_confidence != null ? Number(quality.avg_confidence).toFixed(3) : "-"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kontextus</CardTitle>
          <CardDescription>Dokumentumtípus és nyelv, amelyhez a promptokat kezeled.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Dokumentum típus</Label>
            <Input value={docType} onChange={(e) => setDocType(e.target.value || DEFAULT_DOC_TYPE)} />
          </div>
          <div>
            <Label>Nyelvkód</Label>
            <Input value={languageCode} onChange={(e) => setLanguageCode(e.target.value || DEFAULT_LANGUAGE)} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="prompts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="prompts">Prompt verziók</TabsTrigger>
          <TabsTrigger value="fields">Dinamikus mezők</TabsTrigger>
        </TabsList>

        <TabsContent value="prompts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Új prompt verzió</CardTitle>
              <CardDescription>Új verzió mentése a kiválasztott doc_type + language kombinációhoz.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Prompt neve</Label>
                <Input value={promptName} onChange={(e) => setPromptName(e.target.value)} placeholder="pl. Magyar admin prompt v2" />
              </div>
              <div>
                <Label>System prompt</Label>
                <Textarea rows={6} value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} />
              </div>
              <div>
                <Label>Schema prompt (opcionális)</Label>
                <Textarea rows={3} value={schemaPrompt} onChange={(e) => setSchemaPrompt(e.target.value)} />
              </div>
              <div>
                <Label>Megjegyzés (opcionális)</Label>
                <Input value={promptNotes} onChange={(e) => setPromptNotes(e.target.value)} />
              </div>
              <Button onClick={() => void createPromptVersion()} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verzió mentése
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Elérhető prompt verziók</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Verzió</TableHead>
                    <TableHead>Név</TableHead>
                    <TableHead>Állapot</TableHead>
                    <TableHead>Létrehozva</TableHead>
                    <TableHead className="text-right">Művelet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrompts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">Nincs még prompt verzió.</TableCell>
                    </TableRow>
                  ) : (
                    filteredPrompts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>v{p.version}</TableCell>
                        <TableCell>{p.name}</TableCell>
                        <TableCell>
                          {p.is_active ? <Badge>Aktív</Badge> : <Badge variant="outline">Inaktív</Badge>}
                        </TableCell>
                        <TableCell>{new Date(p.created_at).toLocaleString("hu-HU")}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={p.is_active ? "secondary" : "outline"}
                            disabled={p.is_active || saving}
                            onClick={() => void activatePrompt(p)}
                          >
                            Aktiválás
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fields" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Új dinamikus mező</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Field key</Label>
                <Input value={fieldKey} onChange={(e) => setFieldKey(e.target.value)} placeholder="pl. payment_reference" />
              </div>
              <div>
                <Label>Megjelenítési név</Label>
                <Input value={fieldDisplayName} onChange={(e) => setFieldDisplayName(e.target.value)} placeholder="pl. Fizetési hivatkozás" />
              </div>
              <div>
                <Label>Adattípus</Label>
                <Select value={fieldDataType} onValueChange={(v) => setFieldDataType(v as FieldDefinition["data_type"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">text</SelectItem>
                    <SelectItem value="number">number</SelectItem>
                    <SelectItem value="boolean">boolean</SelectItem>
                    <SelectItem value="date">date</SelectItem>
                    <SelectItem value="array">array</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Prompt hint</Label>
                <Textarea rows={2} value={fieldPromptSnippet} onChange={(e) => setFieldPromptSnippet(e.target.value)} placeholder="Milyen mintát keressen az AI ehhez a mezőhöz." />
              </div>
              <div className="md:col-span-2">
                <Button onClick={() => void createFieldDefinition()} disabled={saving}>Field mentése</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Meződefiníciók</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Név</TableHead>
                    <TableHead>Típus</TableHead>
                    <TableHead>Státusz</TableHead>
                    <TableHead className="text-right">Művelet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFields.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">Nincs mező ehhez a doc_type-hoz.</TableCell>
                    </TableRow>
                  ) : (
                    filteredFields.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="font-mono text-xs">{f.field_key}</TableCell>
                        <TableCell>{f.display_name}</TableCell>
                        <TableCell>{f.data_type}</TableCell>
                        <TableCell>{f.is_active ? <Badge>Aktív</Badge> : <Badge variant="outline">Inaktív</Badge>}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => void toggleField(f)}>
                            {f.is_active ? "Kikapcsol" : "Bekapcsol"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
