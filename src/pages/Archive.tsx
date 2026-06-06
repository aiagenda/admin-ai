import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { FileText, Calendar, Upload, Trash2, CheckSquare, Square, Search, Filter, X, Tag, Plus, GitCompare, Download, FolderOpen, Link2 } from "lucide-react";
import { HelpTooltip } from "@/components/HelpTooltip";
import { ExportForAccountant } from "@/components/ExportForAccountant";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, differenceInDays, isPast } from "date-fns";
import { getAppDateLocale } from "@/lib/dateLocale";
import { formatCategoryLabel, formatTagLabel } from "@/lib/displayLabels";

interface DocumentWithAnalysis {
  id: string;
  filename: string;
  file_url: string;
  upload_date: string;
  status: string;
  category: string | null;
  tags: string[] | null;
  related_documents_count?: number;
  analyses: {
    id: string;
    severity: string;
    deadline: string | null;
    amount: string | null;
    bank_account: string | null;
    recipient_name: string | null;
    simple_summary: string | null;
  } | null;
}

export default function Archive() {
  const [documents, setDocuments] = useState<DocumentWithAnalysis[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingTags, setEditingTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState<string>("");
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [compareDoc1, setCompareDoc1] = useState<string | null>(null);
  const [compareDoc2, setCompareDoc2] = useState<string | null>(null);
  const [showBulkCategoryDialog, setShowBulkCategoryDialog] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<string>("");
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#export-accountant") return;
    const t = window.setTimeout(() => {
      document.getElementById("export-accountant")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => window.clearTimeout(t);
  }, [loading, documents.length]);

  useEffect(() => {
    if (!user) return;

    const fetchDocuments = async () => {
      try {
        const { data: docsData, error: docsError } = await supabase
          .from("documents")
          .select(
            `
            id,
            filename,
            file_url,
            upload_date,
            status,
            category,
            tags
          `,
          )
          .eq("user_id", user.id)
          .order("upload_date", { ascending: false });

        if (docsError) throw docsError;

        const docsWithAnalyses = await Promise.all(
          (docsData || []).map(async (doc) => {
            try {
            const { data: analysisData } = await supabase
              .from("analyses")
                .select("id, severity, deadline, amount, bank_account, recipient_name, simple_summary")
              .eq("document_id", doc.id)
              .single();

            // Get related documents count
            const { count: relatedCount } = await supabase
              .from("document_relations")
              .select("*", { count: "exact", head: true })
              .or(`document_id_1.eq.${doc.id},document_id_2.eq.${doc.id}`);

            return { ...doc, analyses: analysisData, related_documents_count: relatedCount || 0 };
            } catch (error) {
              // If analysis doesn't exist or query fails, return doc without analysis
              console.warn(`No analysis found for document ${doc.id}`);
              
              // Still try to get related documents count
              const { count: relatedCount } = await supabase
                .from("document_relations")
                .select("*", { count: "exact", head: true })
                .or(`document_id_1.eq.${doc.id},document_id_2.eq.${doc.id}`);
              
              return { ...doc, analyses: null, related_documents_count: relatedCount || 0 };
            }
          }),
        );

        setDocuments(docsWithAnalyses);
      } catch (error) {
        console.error("Error fetching documents:", error);
        toast.error("Failed to load documents");
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();

    // Subscribe to real-time updates for document status changes
    const channel = supabase
      .channel("documents-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "documents",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setDocuments((prev) =>
            prev.map((doc) =>
              doc.id === payload.new.id
                ? { ...doc, status: payload.new.status as string }
                : doc
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "analyses",
        },
        async (payload) => {
          // When analysis is created, update the document
          const documentId = payload.new.document_id as string;
          const analysisId = payload.new.id as string;
          const severity = payload.new.severity as string;
          const deadline = payload.new.deadline as string | null;
          const amount = payload.new.amount as string | null;
          const bank_account = payload.new.bank_account as string | null;
          const recipient_name = payload.new.recipient_name as string | null;
          const simple_summary = payload.new.simple_summary as string | null;

          setDocuments((prev) =>
            prev.map((doc) =>
              doc.id === documentId
                ? {
                    ...doc,
                    status: "completed",
                    analyses: {
                      id: analysisId,
                      severity,
                      deadline,
                      amount,
                      bank_account,
                      recipient_name,
                      simple_summary,
                    },
                  }
                : doc
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const toggleSelect = (id: string) => {
    setSelectedDocs((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAll = () => {
    if (selectedDocs.length === documents.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(documents.map((d) => d.id));
    }
  };

  const deleteSelected = async () => {
    if (selectedDocs.length === 0) return;

    const ok = confirm(`${selectedDocs.length} document(s)?`);
    if (!ok) return;

    try {
      // collect for delete
      const docsToDelete = documents.filter((d) => selectedDocs.includes(d.id));

      for (const doc of docsToDelete) {
        // 1) delete analyses
        await supabase.from("analyses").delete().eq("document_id", doc.id);

        // 2) delete storage
        if (doc.file_url !== "text_content") {
          await supabase.storage.from("documents").remove([doc.file_url]);
        }

        // 3) delete document
        await supabase.from("documents").delete().eq("id", doc.id);
      }

      // UI update
      setDocuments((prev) => prev.filter((d) => !selectedDocs.includes(d.id)));
      setSelectedDocs([]);

      toast.success("Selected documents deleted");
    } catch (err) {
      console.error(err);
      toast.error("Bulk delete failed");
    }
  };

  const exportSelected = () => {
    if (selectedDocs.length === 0) return;

    try {
      const docsToExport = documents.filter((d) => selectedDocs.includes(d.id));
      
      // CSV header
      const headers = ["Filename", "Upload date", "Status", "Category", "Severity", "Deadline", "Amount", "Account", "Payee", "Summary"];
      
      // CSV rows
      const rows = docsToExport.map((doc) => [
        doc.filename,
        format(new Date(doc.upload_date), "yyyy-MM-dd"),
        doc.status,
        doc.category || "",
        doc.analyses?.severity || "",
        doc.analyses?.deadline || "",
        doc.analyses?.amount || "",
        doc.analyses?.bank_account || "",
        doc.analyses?.recipient_name || "",
        (doc.analyses?.simple_summary || "").replace(/"/g, '""'), // Escape quotes
      ]);
      
      // Build CSV content
      const csvContent = [
        headers.join(";"),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(";"))
      ].join("\n");
      
      // Add BOM for Excel UTF-8 compatibility
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
      
      // Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `documents_export_${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Exported ${docsToExport.length} document(s)`);
    } catch (err) {
      console.error(err);
      toast.error("Export failed");
    }
  };

  const getSeverityBadge = (severity?: string) => {
    switch (severity) {
      case "urgent":
        return <Badge variant="destructive">Urgent</Badge>;
      case "action_needed":
        return <Badge className="bg-warning text-warning-foreground">Action needed</Badge>;
      default:
        return <Badge variant="secondary">Info</Badge>;
    }
  };

  const getCategoryLabel = (category: string | null) => {
    return category ? formatCategoryLabel(category) : null;
  };

  // Filter and sort documents
  const filteredAndSortedDocuments = useMemo(() => {
    let filtered = [...documents];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((doc) => doc.filename.toLowerCase().includes(query));
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((doc) => doc.status === statusFilter);
    }

    // Severity filter
    if (severityFilter !== "all") {
      filtered = filtered.filter((doc) => doc.analyses?.severity === severityFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((doc) => doc.category === categoryFilter);
    }

    // Tag filter
    if (tagFilter !== "all") {
      filtered = filtered.filter((doc) => doc.tags && doc.tags.includes(tagFilter));
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.upload_date).getTime() - new Date(a.upload_date).getTime();
        case "date-asc":
          return new Date(a.upload_date).getTime() - new Date(b.upload_date).getTime();
        case "deadline-asc":
          if (!a.analyses?.deadline && !b.analyses?.deadline) return 0;
          if (!a.analyses?.deadline) return 1;
          if (!b.analyses?.deadline) return -1;
          return new Date(a.analyses.deadline).getTime() - new Date(b.analyses.deadline).getTime();
        case "severity": {
          const severityOrder = { urgent: 0, action_needed: 1, info: 2 };
          const aSev = a.analyses?.severity || "info";
          const bSev = b.analyses?.severity || "info";
          return (severityOrder[aSev as keyof typeof severityOrder] || 2) - (severityOrder[bSev as keyof typeof severityOrder] || 2);
        }
        default:
          return 0;
      }
    });

    return filtered;
  }, [documents, searchQuery, statusFilter, severityFilter, categoryFilter, tagFilter, sortBy]);

  // Get deadline badge
  const getDeadlineBadge = (deadline: string | null) => {
    if (!deadline) return null;

    const deadlineDate = new Date(deadline);
    const daysUntil = differenceInDays(deadlineDate, new Date());
    const isOverdue = isPast(deadlineDate);

    if (isOverdue) {
      return <Badge variant="destructive" className="ml-2">Overdue ({Math.abs(daysUntil)}d ago)</Badge>;
    } else if (daysUntil <= 7) {
      return <Badge variant="destructive" className="ml-2">{daysUntil} days left</Badge>;
    } else if (daysUntil <= 30) {
      return <Badge className="bg-warning text-warning-foreground ml-2">{daysUntil} days left</Badge>;
    } else {
      return <Badge variant="secondary" className="ml-2">{daysUntil} days left</Badge>;
    }
  };

  // Get all unique tags from all documents
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    documents.forEach((doc) => {
      if (doc.tags && doc.tags.length > 0) {
        doc.tags.forEach((tag) => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [documents]);

  // Open tag edit dialog
  const openTagDialog = (docId: string, currentTags: string[] | null) => {
    setEditingDocId(docId);
    setEditingTags(currentTags ? [...currentTags] : []);
    setNewTagInput("");
    setShowTagDialog(true);
  };

  // Add new tag
  const addTag = () => {
    const trimmed = newTagInput.trim();
    if (trimmed && !editingTags.includes(trimmed)) {
      setEditingTags([...editingTags, trimmed]);
      setNewTagInput("");
    }
  };

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    setEditingTags(editingTags.filter((tag) => tag !== tagToRemove));
  };

  // Save tags
  const saveTags = async () => {
    if (!editingDocId) return;

    try {
      const { error } = await supabase
        .from("documents")
        .update({ tags: editingTags.length > 0 ? editingTags : null })
        .eq("id", editingDocId);

      if (error) throw error;

      // Update local state
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === editingDocId ? { ...doc, tags: editingTags.length > 0 ? editingTags : null } : doc
        )
      );

      setShowTagDialog(false);
      setEditingDocId(null);
      setEditingTags([]);
      toast.success("Tags updated");
    } catch (error) {
      console.error("Error saving tags:", error);
      toast.error("Failed to save tags");
    }
  };

  // Assign category to selected documents
  const assignBulkCategory = async () => {
    if (selectedDocs.length === 0 || !bulkCategory) return;

    try {
      const { error } = await supabase
        .from("documents")
        .update({ category: bulkCategory })
        .in("id", selectedDocs);

      if (error) throw error;

      // Update local state
      setDocuments((prev) =>
        prev.map((doc) =>
          selectedDocs.includes(doc.id) ? { ...doc, category: bulkCategory } : doc
        )
      );

      setShowBulkCategoryDialog(false);
      setBulkCategory("");
      setSelectedDocs([]);
      toast.success(`Updated category for ${selectedDocs.length} document(s)`);
    } catch (error) {
      console.error("Error assigning category:", error);
      toast.error("Failed to assign category");
    }
  };

  // Handle compare action
  const handleCompareClick = (docId: string) => {
    if (!compareDoc1) {
      setCompareDoc1(docId);
      toast.info("Select a second document to compare");
    } else if (compareDoc1 === docId) {
      setCompareDoc1(null);
      toast.info("Comparison cleared");
    } else {
      setCompareDoc2(docId);
      navigate(`/compare?doc1=${compareDoc1}&doc2=${docId}`);
      setCompareDoc1(null);
      setCompareDoc2(null);
    }
  };

  const clearCompareSelection = () => {
    setCompareDoc1(null);
    setCompareDoc2(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 overflow-x-hidden">
      <div className="container mx-auto max-w-6xl space-y-6 min-w-0">
        {/* header */}
        <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold">Document Archive</h1>
              <HelpTooltip 
                content="All your uploaded documents. Search, filter, tag, and compare."
                helpPageAnchor="archive"
              />
            </div>
              <p className="text-muted-foreground mt-2">
                {filteredAndSortedDocuments.length} / {documents.length} document(s)
              </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            {compareDoc1 && (
              <Button
                variant="outline"
                onClick={() => {
                  if (compareDoc2) {
                    navigate(`/compare?doc1=${compareDoc1}&doc2=${compareDoc2}`);
                  } else {
                    clearCompareSelection();
                  }
                }}
              >
                <GitCompare className="mr-2 h-4 w-4" />
                {compareDoc2 ? "Open comparison" : "Clear comparison"}
              </Button>
            )}
            {documents.length > 0 && (
              <>
                <div id="export-accountant" className="scroll-mt-24">
                  <ExportForAccountant documents={documents} />
                </div>
                {selectedDocs.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      onClick={exportSelected}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export ({selectedDocs.length})
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowBulkCategoryDialog(true)}
                    >
                      <FolderOpen className="mr-2 h-4 w-4" />
                      Category ({selectedDocs.length})
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={deleteSelected}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete ({selectedDocs.length})
                    </Button>
                  </>
                )}
              </>
            )}

            <Button onClick={() => navigate("/upload")}>
              <Upload className="mr-2 h-4 w-4" />
              New upload
            </Button>
          </div>
          </div>

          {/* Search and Filters */}
          {documents.length > 0 && (
            <Card className="p-4 min-w-0 w-full">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by filename…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 min-h-[44px]"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="min-h-[44px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>

                {/* Category Filter */}
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    <SelectItem value="adozas">Tax</SelectItem>
                    <SelectItem value="egeszsegugy">Health</SelectItem>
                    <SelectItem value="oktatas">Education</SelectItem>
                    <SelectItem value="szocialis">Social Services</SelectItem>
                    <SelectItem value="kozlekedes">Transportation</SelectItem>
                    <SelectItem value="ingatlan">Real Estate</SelectItem>
                    <SelectItem value="uzlet">Business</SelectItem>
                    <SelectItem value="egyeb">Other</SelectItem>
                  </SelectContent>
                </Select>

                {/* Severity Filter */}
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Urgency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All urgency levels</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="action_needed">Action needed</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>

                {/* Tag Filter */}
                <Select value={tagFilter} onValueChange={setTagFilter}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All tags</SelectItem>
                    {allTags.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {formatTagLabel(tag)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Date (newest first)</SelectItem>
                    <SelectItem value="date-asc">Date (oldest first)</SelectItem>
                    <SelectItem value="deadline-asc">Deadline (soonest first)</SelectItem>
                    <SelectItem value="severity">Urgency</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>
          )}
        </div>

        {documents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
              <p className="text-muted-foreground mb-6">Upload your first document to get started</p>
              <Button onClick={() => navigate("/upload")}>Upload document</Button>
            </CardContent>
          </Card>
        ) : filteredAndSortedDocuments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No results</h3>
              <p className="text-muted-foreground mb-6">Try different search or filters</p>
              <Button variant="outline" onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
                setSeverityFilter("all");
                setCategoryFilter("all");
                setTagFilter("all");
              }}>
                Clear filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {/* select all */}
            <Card className="bg-muted/50 p-3 flex items-center gap-3 cursor-pointer" onClick={selectAll}>
              {selectedDocs.length === filteredAndSortedDocuments.length && filteredAndSortedDocuments.length > 0 ? (
                <CheckSquare className="h-5 w-5 text-primary" />
              ) : (
                <Square className="h-5 w-5 text-muted-foreground" />
              )}
              <p className="font-medium">Select all ({filteredAndSortedDocuments.length})</p>
            </Card>

            {/* Document list */}
            {filteredAndSortedDocuments.map((doc) => {
              const selected = selectedDocs.includes(doc.id);
              const isCompareSelected = compareDoc1 === doc.id || compareDoc2 === doc.id;

              return (
                <Card
                  key={doc.id}
                  className={`hover:shadow-md transition-shadow ${
                    isCompareSelected ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <CardContent className="py-3 sm:py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 overflow-hidden">
                    <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                      <div className="cursor-pointer flex-shrink-0" onClick={() => toggleSelect(doc.id)}>
                        {selected ? (
                          <CheckSquare className="h-6 w-6 text-primary" />
                        ) : (
                          <Square className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                        onClick={() => navigate(`/result/${doc.analyses?.id ?? doc.id}`)}
                      >
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{doc.filename}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span className="whitespace-nowrap">{format(new Date(doc.upload_date), "MMM d, yyyy h:mm a", { locale: getAppDateLocale() })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant={isCompareSelected ? "default" : "ghost"}
                          size="icon"
                          className="h-9 w-9 sm:h-11 sm:w-11 min-h-[36px] min-w-[36px] sm:min-h-[44px] sm:min-w-[44px] touch-manipulation"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (doc.analyses) {
                              handleCompareClick(doc.id);
                            } else {
                              toast.error("This document has not been analyzed yet");
                            }
                          }}
                          title="Add to comparison"
                          disabled={!doc.analyses}
                        >
                          <GitCompare className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 sm:h-11 sm:w-11 min-h-[36px] min-w-[36px] sm:min-h-[44px] sm:min-w-[44px] touch-manipulation"
                          onClick={(e) => {
                            e.stopPropagation();
                            openTagDialog(doc.id, doc.tags);
                          }}
                          title="Edit tags"
                        >
                          <Tag className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0 w-full sm:w-auto min-w-0">
                      {doc.category && (
                        <Badge variant="outline" className="bg-primary/10 shrink-0">
                          {getCategoryLabel(doc.category)}
                        </Badge>
                      )}
                      {doc.tags && doc.tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap min-w-0">
                          {doc.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs max-w-[140px] truncate shrink-0">
                              <Tag className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="truncate">{formatTagLabel(tag)}</span>
                            </Badge>
                          ))}
                          {doc.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs shrink-0 cursor-pointer" onClick={(e) => { e.stopPropagation(); openTagDialog(doc.id, doc.tags); }}>
                              +{doc.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      {doc.analyses && getSeverityBadge(doc.analyses.severity)}
                      {doc.analyses?.deadline && getDeadlineBadge(doc.analyses.deadline)}
                      {doc.status === "processing" && <Badge variant="outline">Processing</Badge>}
                      {doc.related_documents_count && doc.related_documents_count > 0 && (
                        <Badge variant="outline" className="bg-primary/10 shrink-0">
                          <Link2 className="h-3 w-3 mr-1" />
                          {doc.related_documents_count} linked
                        </Badge>
                      )}
                      {isCompareSelected && (
                        <Badge variant="default" className="bg-primary shrink-0">
                          Selected for comparison
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Tag Edit Dialog */}
        <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit tags</DialogTitle>
              <DialogDescription>
                Add or remove tags for this document
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Current tags */}
              <div>
                <label className="text-sm font-medium mb-2 block">Current tags</label>
                {editingTags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tags</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {editingTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-destructive"
                          type="button"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Add new tag */}
              <div>
                <label className="text-sm font-medium mb-2 block">Add new tag</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Tag name…"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <Button type="button" onClick={addTag} size="icon" className="min-h-[44px] min-w-[44px] touch-manipulation">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTagDialog(false)}>
                Cancel
              </Button>
              <Button onClick={saveTags}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Category Dialog */}
        <Dialog open={showBulkCategoryDialog} onOpenChange={setShowBulkCategoryDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign category</DialogTitle>
              <DialogDescription>
                {selectedDocs.length} document(s) category
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select value={bulkCategory} onValueChange={setBulkCategory}>
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Choose category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Remove category</SelectItem>
                    <SelectItem value="adozas">Tax</SelectItem>
                    <SelectItem value="egeszsegugy">Health</SelectItem>
                    <SelectItem value="oktatas">Education</SelectItem>
                    <SelectItem value="szocialis">Social Services</SelectItem>
                    <SelectItem value="kozlekedes">Transportation</SelectItem>
                    <SelectItem value="ingatlan">Real Estate</SelectItem>
                    <SelectItem value="uzlet">Business</SelectItem>
                    <SelectItem value="szamla">Invoice</SelectItem>
                    <SelectItem value="hatosagi_level">Official Notice</SelectItem>
                    <SelectItem value="egyeb">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkCategoryDialog(false)}>
                Cancel
              </Button>
              <Button onClick={assignBulkCategory} disabled={!bulkCategory}>
                Assign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
