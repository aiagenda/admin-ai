import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, Trash2, Download, ExternalLink, ArrowLeft, Edit } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  inferPrefixFromFilename,
  humanizeName,
  generateNextKey,
  sha1File,
  publicUrlFor,
  guessInstitution,
  sanitizeFilename,
  findUniqueStorageKey,
  INSTITUTIONS,
  type FormPrefix,
} from "@/lib/formsUpload";

interface FormRecord {
  id: string;
  key: string;
  name: string;
  pdf_url: string;
  online_url: string | null;
  institution: string;
  description: string;
  file_hash: string | null;
  created_at: string;
  form_type?: string | null;
  category?: string | null;
  tags?: string[] | null;
  fillable_online?: boolean | null;
  fillable_url?: string | null;
  download_url?: string | null;
  print_url?: string | null;
  instructions?: string | null;
  required_documents?: string[] | null;
  deadline_info?: string | null;
  official_source_url?: string | null;
  last_updated?: string | null;
}

interface FileWithMeta {
  file: File;
  institution?: string;
  description?: string;
}

export default function FormAdmin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [files, setFiles] = useState<FileWithMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<FormRecord | null>(null);
  const [editFormType, setEditFormType] = useState<string>("");
  const [editCategory, setEditCategory] = useState<string>("");
  const [editTags, setEditTags] = useState<string>("");
  const [editFillableOnline, setEditFillableOnline] = useState<boolean>(false);
  const [editFillableUrl, setEditFillableUrl] = useState<string>("");
  const [editDownloadUrl, setEditDownloadUrl] = useState<string>("");
  const [editPrintUrl, setEditPrintUrl] = useState<string>("");
  const [editInstructions, setEditInstructions] = useState<string>("");
  const [editRequiredDocuments, setEditRequiredDocuments] = useState<string>("");
  const [editDeadlineInfo, setEditDeadlineInfo] = useState<string>("");
  const [editOfficialSourceUrl, setEditOfficialSourceUrl] = useState<string>("");
  const [existingKeys, setExistingKeys] = useState<string[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    loadForms();
    loadExistingKeys();
  }, []);

  async function loadForms() {
    setLoadingForms(true);
    const { data, error } = await supabase
      .from("forms")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Hiba történt",
        description: "A formok betöltése sikertelen: " + error.message,
        variant: "destructive",
      });
    } else {
      setForms(data || []);
    }
    setLoadingForms(false);
  }

  async function loadExistingKeys() {
    const { data } = await supabase.from("forms").select("key");
    setExistingKeys(data?.map(d => d.key) || []);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
        .filter(f => f.type === "application/pdf" || f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
        .map(file => ({ file }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files)
      .filter(f => f.type === "application/pdf" || f.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
      .map(file => ({ file }));
    setFiles(prev => [...prev, ...droppedFiles]);
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }

  function updateFileMeta(index: number, field: "institution" | "description", value: string) {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, [field]: value } : f));
  }

  async function handleUpload() {
    if (files.length === 0) {
      toast({ title: "Nincs fájl", description: "Válassz ki legalább egy fájlt!" });
      return;
    }

    setUploading(true);
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const fileWithMeta of files) {
      const { file, institution, description } = fileWithMeta;

      try {
        // Calculate hash
        const hash = await sha1File(file);

        // Check for duplicate
        const { data: existing } = await supabase
          .from("forms")
          .select("id, name")
          .eq("file_hash", hash)
          .maybeSingle();

        if (existing) {
          toast({
            title: "Duplikátum kihagyva",
            description: `Már létezik: ${existing.name}`,
          });
          skipCount++;
          continue;
        }

        // Generate metadata
        const prefix = inferPrefixFromFilename(file.name);
        const name = humanizeName(file.name);
        const autoInstitution = institution || guessInstitution(prefix);
        const autoDescription = description || "Hivatalos formanyomtatvány.";

        // Sanitize filename for storage
        const sanitizedFilename = sanitizeFilename(file.name);
        
        // Find unique key (handle duplicates with -1, -2, etc.)
        const uniqueKey = await findUniqueStorageKey(sanitizedFilename);
        
        // Upload to storage using sanitized filename
        const { error: uploadError } = await supabase.storage
          .from("forms")
          .upload(uniqueKey, file, { upsert: false });

        if (uploadError) {
          toast({
            title: "Storage hiba",
            description: `${file.name}: ${uploadError.message}`,
            variant: "destructive",
          });
          errorCount++;
          continue;
        }

        // Get public URL
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const pdfUrl = publicUrlFor(supabaseUrl, "forms", uniqueKey);

        // Insert into DB using sanitized key
        const { error: insertError } = await supabase.from("forms").insert({
          key: uniqueKey,
          name,
          pdf_url: pdfUrl,
          online_url: null,
          institution: autoInstitution,
          description: autoDescription,
          file_hash: hash,
        });

        if (insertError) {
          toast({
            title: "Adatbázis hiba",
            description: `${name}: ${insertError.message}`,
            variant: "destructive",
          });
          errorCount++;
          continue;
        }

        // Update existing keys
        setExistingKeys(prev => [...prev, uniqueKey]);
        successCount++;

      } catch (err) {
        toast({
          title: "Hiba",
          description: `${file.name}: ${(err as Error)?.message}`,
          variant: "destructive",
        });
        errorCount++;
      }
    }

    setUploading(false);
    setFiles([]);

    toast({
      title: "Feltöltés kész",
      description: `Sikeres: ${successCount}, Kihagyva: ${skipCount}, Hiba: ${errorCount}`,
    });

    await loadForms();
    await loadExistingKeys();
  }

  async function handleDelete(id: string) {
    const form = forms.find(f => f.id === id);
    if (!form) return;

    // Extract storage path from pdf_url
    const urlParts = form.pdf_url.split("/forms/");
    const storagePath = urlParts[1];

    // Delete from storage
    if (storagePath) {
      await supabase.storage.from("forms").remove([storagePath]);
    }

    // Delete from DB
    const { error } = await supabase.from("forms").delete().eq("id", id);

    if (error) {
      toast({
        title: "Törlési hiba",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Törölve", description: form.name });
      await loadForms();
    }
  }

  async function handleBulkDelete() {
    for (const id of selectedIds) {
      await handleDelete(id);
    }
    setSelectedIds([]);
    setDeleteDialogOpen(false);
  }

  function openEditDialog(form: FormRecord) {
    setEditingForm(form);
    setEditFormType(form.form_type || "");
    setEditCategory(form.category || "");
    setEditTags(form.tags?.join(", ") || "");
    setEditFillableOnline(form.fillable_online || false);
    setEditFillableUrl(form.fillable_url || "");
    setEditDownloadUrl(form.download_url || "");
    setEditPrintUrl(form.print_url || "");
    setEditInstructions(form.instructions || "");
    setEditRequiredDocuments(form.required_documents?.join(", ") || "");
    setEditDeadlineInfo(form.deadline_info || "");
    setEditOfficialSourceUrl(form.official_source_url || "");
    setEditDialogOpen(true);
  }

  async function handleSaveEdit() {
    if (!editingForm) return;

    const updateData: Partial<FormRecord> = {
      form_type: editFormType || null,
      category: editCategory || null,
      tags: editTags ? editTags.split(",").map(t => t.trim()).filter(t => t) : null,
      fillable_online: editFillableOnline,
      fillable_url: editFillableUrl || null,
      download_url: editDownloadUrl || null,
      print_url: editPrintUrl || null,
      instructions: editInstructions || null,
      required_documents: editRequiredDocuments ? editRequiredDocuments.split(",").map(d => d.trim()).filter(d => d) : null,
      deadline_info: editDeadlineInfo || null,
      official_source_url: editOfficialSourceUrl || null,
      last_updated: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("forms")
      .update(updateData)
      .eq("id", editingForm.id);

    if (error) {
      toast({
        title: "Hiba",
        description: "A mentés sikertelen: " + error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sikeres mentés",
        description: "Az űrlap adatai frissítve lettek.",
      });
      setEditDialogOpen(false);
      setEditingForm(null);
      await loadForms();
    }
  }

  function toggleSelectAll() {
    if (selectedIds.length === forms.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(forms.map(f => f.id));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }

  if (authLoading || !user) {
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
          <h1 className="text-3xl font-bold">Form Admin</h1>
          <p className="text-muted-foreground mt-1">Tömeges PDF feltöltés és kezelés</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/archive")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Vissza az archívumhoz
        </Button>
      </div>

      {/* Upload section */}
      <div className="mb-8 rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold mb-4">Új PDF-ek feltöltése</h2>
        
        <div
          className="border-2 border-dashed rounded-lg p-8 text-center mb-4 transition-colors hover:border-primary/50"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">Húzd ide a PDF vagy DOCX fájlokat</p>
          <p className="text-sm text-muted-foreground mb-4">vagy</p>
          <Label htmlFor="file-upload" className="cursor-pointer">
            <div className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90">
              Fájlok tallózása
            </div>
            <Input
              id="file-upload"
              type="file"
              multiple
              accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={handleFileChange}
            />
          </Label>
        </div>

        {files.length > 0 && (
          <div className="space-y-3 mb-4">
            <p className="font-medium">{files.length} fájl kiválasztva</p>
            {files.map((fileWithMeta, idx) => (
              <div key={idx} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium truncate flex-1">{fileWithMeta.file.name}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Intézmény</Label>
                    <Select
                      value={fileWithMeta.institution}
                      onValueChange={(v) => updateFileMeta(idx, "institution", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Auto (fájlnév alapján)" />
                      </SelectTrigger>
                      <SelectContent>
                        {INSTITUTIONS.map(inst => (
                          <SelectItem key={inst.value} value={inst.value}>
                            {inst.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Leírás</Label>
                    <Textarea
                      placeholder="Auto: 'Hivatalos formanyomtatvány.'"
                      value={fileWithMeta.description || ""}
                      onChange={(e) => updateFileMeta(idx, "description", e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
          className="w-full"
        >
          {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Feltöltés ({files.length} fájl)
        </Button>
      </div>

      {/* Forms list */}
      <div className="rounded-lg border bg-card">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Feltöltött formok</h2>
            {selectedIds.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Törlés ({selectedIds.length})
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {loadingForms ? (
            <div className="p-8 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            </div>
          ) : forms.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Még nincs feltöltött form
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.length === forms.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Kulcs</TableHead>
                  <TableHead>Név</TableHead>
                  <TableHead>Intézmény</TableHead>
                  <TableHead>Létrehozva</TableHead>
                  <TableHead className="text-right">Műveletek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(form.id)}
                        onCheckedChange={() => toggleSelect(form.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{form.key}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{form.name}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{form.institution}</span>
                    </TableCell>
                    <TableCell>
                      {form.category ? (
                        <Badge variant="outline">{form.category}</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(form.created_at).toLocaleDateString("hu-HU")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(form.pdf_url, "_blank")}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {form.online_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(form.online_url!, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(form)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(form.id)}
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
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) {
          setEditingForm(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Űrlap szerkesztése</DialogTitle>
            <DialogDescription>
              {editingForm?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-form-type">Űrlap típus</Label>
              <Select value={editFormType} onValueChange={setEditFormType}>
                <SelectTrigger>
                  <SelectValue placeholder="Válasszon típust" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="form">Űrlap</SelectItem>
                  <SelectItem value="letter">Levél</SelectItem>
                  <SelectItem value="guide">Útmutató</SelectItem>
                  <SelectItem value="template">Sablon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-category">Kategória</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
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
              <Label htmlFor="edit-tags">Címkék (vesszővel elválasztva)</Label>
              <Input
                id="edit-tags"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="pl: adóbevallás, NAV, 2024"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-fillable-online"
                checked={editFillableOnline}
                onCheckedChange={(checked) => setEditFillableOnline(checked === true)}
              />
              <Label htmlFor="edit-fillable-online" className="font-normal cursor-pointer">
                Online kitölthető
              </Label>
            </div>
            <div>
              <Label htmlFor="edit-fillable-url">Online kitöltési URL</Label>
              <Input
                id="edit-fillable-url"
                value={editFillableUrl}
                onChange={(e) => setEditFillableUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label htmlFor="edit-download-url">Letöltési URL (ha különbözik a PDF-től)</Label>
              <Input
                id="edit-download-url"
                value={editDownloadUrl}
                onChange={(e) => setEditDownloadUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label htmlFor="edit-print-url">Nyomtatási URL (ha különbözik a PDF-től)</Label>
              <Input
                id="edit-print-url"
                value={editPrintUrl}
                onChange={(e) => setEditPrintUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label htmlFor="edit-instructions">Kitöltési útmutató</Label>
              <Textarea
                id="edit-instructions"
                value={editInstructions}
                onChange={(e) => setEditInstructions(e.target.value)}
                placeholder="Részletes útmutató a kitöltéshez..."
                rows={5}
              />
            </div>
            <div>
              <Label htmlFor="edit-required-documents">Szükséges mellékletek (vesszővel elválasztva)</Label>
              <Input
                id="edit-required-documents"
                value={editRequiredDocuments}
                onChange={(e) => setEditRequiredDocuments(e.target.value)}
                placeholder="pl: személyi igazolvány, lakcímkártya"
              />
            </div>
            <div>
              <Label htmlFor="edit-deadline-info">Határidő információk</Label>
              <Input
                id="edit-deadline-info"
                value={editDeadlineInfo}
                onChange={(e) => setEditDeadlineInfo(e.target.value)}
                placeholder="pl: 30 napon belül kell benyújtani"
              />
            </div>
            <div>
              <Label htmlFor="edit-official-source-url">Hivatalos forrás URL</Label>
              <Input
                id="edit-official-source-url"
                value={editOfficialSourceUrl}
                onChange={(e) => setEditOfficialSourceUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Mégse
            </Button>
            <Button onClick={handleSaveEdit}>Mentés</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Biztosan törölni szeretnéd?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedIds.length} form kerül törlésre. Ez a művelet nem vonható vissza.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégse</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete}>
              Törlés
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
