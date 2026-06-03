import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, Edit, Sparkles, Upload, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  source_type: string;
  source_url: string | null;
  source_institution: string | null;
  created_at: string;
  updated_at: string;
}

export default function KnowledgeBaseAdmin() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<KnowledgeDocument | null>(null);
  const [generatingEmbeddings, setGeneratingEmbeddings] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [sourceType, setSourceType] = useState("official");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceInstitution, setSourceInstitution] = useState("");

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    try {
      const { data, error } = await supabase
        .from("knowledge_documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error loading documents:", error);
      toast.error("Hiba a dokumentumok betöltése során");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setTitle("");
    setContent("");
    setCategory("");
    setSourceType("official");
    setSourceUrl("");
    setSourceInstitution("");
    setEditingDoc(null);
  }

  function openEditDialog(doc: KnowledgeDocument) {
    setEditingDoc(doc);
    setTitle(doc.title);
    setContent(doc.content);
    setCategory(doc.category);
    setSourceType(doc.source_type);
    setSourceUrl(doc.source_url || "");
    setSourceInstitution(doc.source_institution || "");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!title || !content || !category) {
      toast.error("Kérjük, töltse ki az összes kötelező mezőt");
      return;
    }

    try {
      if (editingDoc) {
        // Update existing document
        const { error } = await supabase
          .from("knowledge_documents")
          .update({
            title,
            content,
            category,
            source_type: sourceType,
            source_url: sourceUrl || null,
            source_institution: sourceInstitution || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingDoc.id);

        if (error) throw error;
        toast.success("Dokumentum frissítve");
      } else {
        // Create new document
        const { error } = await supabase.from("knowledge_documents").insert({
          title,
          content,
          category,
          source_type: sourceType,
          source_url: sourceUrl || null,
          source_institution: sourceInstitution || null,
        });

        if (error) throw error;
        toast.success("Dokumentum létrehozva");
      }

      resetForm();
      setDialogOpen(false);
      await loadDocuments();
    } catch (error) {
      console.error("Error saving document:", error);
      toast.error("Hiba a mentés során: " + ((error as Error)?.message || "Ismeretlen hiba"));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Biztosan törölni szeretnéd ezt a dokumentumot?")) return;

    try {
      const { error } = await supabase
        .from("knowledge_documents")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Dokumentum törölve");
      await loadDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Hiba a törlés során");
    }
  }

  async function generateEmbeddings(docId: string) {
    setGeneratingEmbeddings(docId);

    try {
      const functionUrl =
        import.meta.env.VITE_SUPABASE_FUNCTION_URL ||
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

      // Note: In production, you'd call a dedicated Edge Function for this
      // For now, we'll just show a message
      toast.info("Embedding generálás funkció hamarosan elérhető. Használd a generate-embeddings.ts scriptet.");
    } catch (error) {
      console.error("Error generating embeddings:", error);
      toast.error("Hiba az embedding generálása során");
    } finally {
      setGeneratingEmbeddings(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Base Admin</h1>
          <p className="text-muted-foreground mt-1">
            Hivatalos dokumentumok kezelése az AI elemzéshez
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Új dokumentum
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingDoc ? "Dokumentum szerkesztése" : "Új dokumentum"}
              </DialogTitle>
              <DialogDescription>
                Adja meg a dokumentum adatait. Ez a tartalom az AI elemzéshez használatos.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Cím *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Dokumentum címe"
                />
              </div>
              <div>
                <Label htmlFor="category">Kategória *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Válasszon kategóriát" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adozas">Adózás</SelectItem>
                    <SelectItem value="egeszsegugy">Egészségügy</SelectItem>
                    <SelectItem value="oktatas">Oktatás</SelectItem>
                    <SelectItem value="szocialis">Szociális</SelectItem>
                    <SelectItem value="kozlekedes">Közlekedés</SelectItem>
                    <SelectItem value="ingatlan">Ingatlan</SelectItem>
                    <SelectItem value="uzlet">Üzlet</SelectItem>
                    <SelectItem value="egyeb">Egyéb</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="content">Tartalom *</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Dokumentum teljes szövege..."
                  rows={10}
                />
              </div>
              <div>
                <Label htmlFor="sourceType">Forrás típus</Label>
                <Select value={sourceType} onValueChange={setSourceType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="official">Hivatalos</SelectItem>
                    <SelectItem value="legal">Jogi</SelectItem>
                    <SelectItem value="form">Űrlap</SelectItem>
                    <SelectItem value="guide">Útmutató</SelectItem>
                    <SelectItem value="faq">GYIK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sourceUrl">Forrás URL</Label>
                <Input
                  id="sourceUrl"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="sourceInstitution">Intézmény</Label>
                <Input
                  id="sourceInstitution"
                  value={sourceInstitution}
                  onChange={(e) => setSourceInstitution(e.target.value)}
                  placeholder="NAV, TB, stb."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Mégse
              </Button>
              <Button onClick={handleSave}>Mentés</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Documents list */}
      <Card>
        <CardHeader>
          <CardTitle>Dokumentumok ({documents.length})</CardTitle>
          <CardDescription>
            A knowledge base dokumentumok, amelyeket az AI használ a pontos instrukciók generálásához
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Még nincs dokumentum. Hozz létre egy újat a fenti gombbal.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cím</TableHead>
                  <TableHead>Kategória</TableHead>
                  <TableHead>Forrás</TableHead>
                  <TableHead>Intézmény</TableHead>
                  <TableHead>Létrehozva</TableHead>
                  <TableHead className="text-right">Műveletek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{doc.source_type}</Badge>
                    </TableCell>
                    <TableCell>{doc.source_institution || "-"}</TableCell>
                    <TableCell>
                      {new Date(doc.created_at).toLocaleDateString("hu-HU")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateEmbeddings(doc.id)}
                          disabled={generatingEmbeddings === doc.id}
                        >
                          {generatingEmbeddings === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(doc)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

