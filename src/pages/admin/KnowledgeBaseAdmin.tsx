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
      toast.error("Failed to load documents");
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
      toast.error("Please fill in all required fields.");
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
        toast.success("Document updated");
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
        toast.success("Document created");
      }

      resetForm();
      setDialogOpen(false);
      await loadDocuments();
    } catch (error) {
      console.error("Error saving document:", error);
      toast.error("Failed to save: " + ((error as Error)?.message || "Unknown error"));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const { error } = await supabase
        .from("knowledge_documents")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Document deleted");
      await loadDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
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
      toast.info("Embedding generation coming soon. Use the generate-embeddings.ts script.");
    } catch (error) {
      console.error("Error generating embeddings:", error);
      toast.error("Failed to generate embeddings");
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
              New document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingDoc ? "Edit document" : "New document"}
              </DialogTitle>
              <DialogDescription>
                Fill in the document details. This content is used by the AI for analysis.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Document title"
                />
              </div>
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adozas">Tax</SelectItem>
                    <SelectItem value="egeszsegugy">Healthcare</SelectItem>
                    <SelectItem value="oktatas">Education</SelectItem>
                    <SelectItem value="szocialis">Social services</SelectItem>
                    <SelectItem value="kozlekedes">Transportation</SelectItem>
                    <SelectItem value="ingatlan">Real estate</SelectItem>
                    <SelectItem value="uzlet">Business</SelectItem>
                    <SelectItem value="egyeb">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Full document text..."
                  rows={10}
                />
              </div>
              <div>
                <Label htmlFor="sourceType">Source type</Label>
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
                <Label htmlFor="sourceUrl">Source URL</Label>
                <Input
                  id="sourceUrl"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="sourceInstitution">Institution</Label>
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
                Cancel
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Documents list */}
      <Card>
        <CardHeader>
          <CardTitle>Documents ({documents.length})</CardTitle>
          <CardDescription>
            Knowledge base documents used by the AI to generate accurate instructions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No documents yet. Create one using the button above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Institution</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                      {new Date(doc.created_at).toLocaleDateString("en-US")}
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

