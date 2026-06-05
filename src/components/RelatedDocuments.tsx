import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link2, Plus, X, FileText, Calendar, ExternalLink, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { resolveAnalysisId } from "@/lib/resolveAnalysisId";
import { useAuth } from "@/contexts/AuthContext";

interface RelatedDocument {
  id: string;
  document_id: string;
  related_document_id: string;
  relation_type: string;
  description: string | null;
  created_at: string;
  related_filename: string;
  related_upload_date: string;
  related_category: string | null;
  related_status: string;
}

interface RelatedDocumentsProps {
  documentId: string;
}

const RELATION_TYPES = {
  related: "Related",
  revision: "Revision",
  response: "Response",
  attachment: "Attachment",
  duplicate: "Duplicate",
};

export function RelatedDocuments({ documentId }: RelatedDocumentsProps) {
  const [relatedDocs, setRelatedDocs] = useState<RelatedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [availableDocuments, setAvailableDocuments] = useState<Array<{ id: string; filename: string; upload_date: string }>>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [relationType, setRelationType] = useState<string>("related");
  const [relationDescription, setRelationDescription] = useState<string>("");
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchRelatedDocuments();
  }, [documentId]);

  const fetchRelatedDocuments = async () => {
    try {
      const { data, error } = await supabase.rpc("get_related_documents", {
        p_document_id: documentId,
      });

      if (error) throw error;

      setRelatedDocs((data || []) as RelatedDocument[]);
    } catch (error) {
      console.error("Error fetching related documents:", error);
      toast.error("Failed to load related documents");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableDocuments = async () => {
    if (!user) return;

    setLoadingDocuments(true);
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("id, filename, upload_date")
        .eq("user_id", user.id)
        .neq("id", documentId)
        .order("upload_date", { ascending: false })
        .limit(100);

      if (error) throw error;

      setAvailableDocuments(data || []);
    } catch (error) {
      console.error("Error fetching available documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleAddRelation = async () => {
    if (!selectedDocumentId) {
      toast.error("Please select a document");
      return;
    }

    try {
      const { error } = await supabase.from("document_relations").insert({
        document_id_1: documentId,
        document_id_2: selectedDocumentId,
        relation_type: relationType,
        description: relationDescription || null,
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success("Link created");
      setShowAddDialog(false);
      setSelectedDocumentId("");
      setRelationType("related");
      setRelationDescription("");
      fetchRelatedDocuments();
    } catch (error) {
      console.error("Error creating relation:", error);
      toast.error("Failed to create link");
    }
  };

  const handleRemoveRelation = async (relationId: string) => {
    if (!confirm("Remove this link?")) return;

    try {
      const { error } = await supabase
        .from("document_relations")
        .delete()
        .eq("id", relationId);

      if (error) throw error;

      toast.success("Link removed");
      fetchRelatedDocuments();
    } catch (error) {
      console.error("Error removing relation:", error);
      toast.error("Failed to remove link");
    }
  };

  const handleViewDocument = async (relatedDocId: string) => {
    const analysisId = await resolveAnalysisId(relatedDocId);
    if (analysisId) {
      navigate(`/result/${analysisId}`);
      return;
    }
    toast.error("No analysis found for this document");
  };

  const getCategoryLabel = (category: string | null) => {
    const labels: Record<string, string> = {
      adozas: "Tax",
      egeszsegugy: "Health",
      oktatas: "Education",
      szocialis: "Social Services",
      kozlekedes: "Transportation",
      ingatlan: "Ingatlan",
      uzlet: "Business",
      szamla: "Invoice",
      hatosagi_level: "Official Notice",
      egyeb: "Other",
    };
    return category ? labels[category] || category : null;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            <CardTitle>Related Documents</CardTitle>
          </div>
          <Dialog open={showAddDialog} onOpenChange={(open) => {
            setShowAddDialog(open);
            if (open) {
              fetchAvailableDocuments();
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Related Document</DialogTitle>
                <DialogDescription>
                  Select a document to link to this one
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Document</label>
                  <Select
                    value={selectedDocumentId}
                    onValueChange={setSelectedDocumentId}
                    disabled={loadingDocuments}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingDocuments ? "Loading…" : "Select a document"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDocuments.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          {doc.filename} ({format(new Date(doc.upload_date), "yyyy. MM. dd.", { locale: hu })})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Link Type</label>
                  <Select value={relationType} onValueChange={setRelationType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(RELATION_TYPES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Description (optional)</label>
                  <Textarea
                    value={relationDescription}
                    onChange={(e) => setRelationDescription(e.target.value)}
                    placeholder="Brief description of the link…"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddRelation} disabled={!selectedDocumentId}>
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          {relatedDocs.length} related document(s)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {relatedDocs.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No related documents yet</p>
            <p className="text-sm mt-2">Click "Add" to link documents together</p>
          </div>
        ) : (
          <div className="space-y-3">
            {relatedDocs.map((related) => (
              <div
                key={related.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium truncate">{related.related_filename}</p>
                      <Badge variant="secondary">
                        {RELATION_TYPES[related.relation_type as keyof typeof RELATION_TYPES] || related.relation_type}
                      </Badge>
                      {related.related_category && (
                        <Badge variant="outline" className="bg-primary/10">
                          {getCategoryLabel(related.related_category)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format(new Date(related.related_upload_date), "yyyy. MM. dd. HH:mm", { locale: hu })}
                      </span>
                    </div>
                    {related.description && (
                      <p className="text-sm text-muted-foreground mt-1">{related.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleViewDocument(related.related_document_id)}
                    title="View document"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveRelation(related.id)}
                    title="Remove link"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
