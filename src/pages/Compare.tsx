import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, ArrowLeft, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, differenceInDays } from "date-fns";
import { enUS } from "date-fns/locale";

interface DocumentWithAnalysis {
  id: string;
  filename: string;
  upload_date: string;
  analyses: {
    id: string;
    simple_summary: string | null;
    legal_summary: string | null;
    todo_simple: string[] | null;
    deadline: string | null;
    severity: string;
    bank_account: string | null;
    amount: string | null;
    recipient_name: string | null;
  } | null;
}

export default function Compare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [documents, setDocuments] = useState<DocumentWithAnalysis[]>([]);
  const [doc1Id, setDoc1Id] = useState<string>(searchParams.get("doc1") || "");
  const [doc2Id, setDoc2Id] = useState<string>(searchParams.get("doc2") || "");
  const [doc1, setDoc1] = useState<DocumentWithAnalysis | null>(null);
  const [doc2, setDoc2] = useState<DocumentWithAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const fetchDocuments = async () => {
      try {
        const { data: docsData, error: docsError } = await supabase
          .from("documents")
          .select("id, filename, upload_date")
          .eq("user_id", user.id)
          .order("upload_date", { ascending: false });

        if (docsError) throw docsError;

        const docsWithAnalyses = await Promise.all(
          (docsData || []).map(async (doc) => {
            const { data: analysisData } = await supabase
              .from("analyses")
              .select("id, simple_summary, legal_summary, todo_simple, deadline, severity, bank_account, amount, recipient_name")
              .eq("document_id", doc.id)
              .single();

            return {
              ...doc,
              analyses: analysisData,
            };
          })
        );

        const filteredDocs = docsWithAnalyses.filter((doc) => doc.analyses !== null);
        setDocuments(filteredDocs);

        // Set initial documents if IDs are in URL
        const urlDoc1Id = searchParams.get("doc1");
        const urlDoc2Id = searchParams.get("doc2");
        
        if (urlDoc1Id) {
          const found1 = filteredDocs.find((d) => d.id === urlDoc1Id);
          if (found1 && found1.analyses) {
            setDoc1(found1);
            setDoc1Id(urlDoc1Id);
          }
        }
        if (urlDoc2Id) {
          const found2 = filteredDocs.find((d) => d.id === urlDoc2Id);
          if (found2 && found2.analyses) {
            setDoc2(found2);
            setDoc2Id(urlDoc2Id);
          }
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
        toast.error("Error loading documents");
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [user, searchParams]);

  const handleDoc1Change = (id: string) => {
    setDoc1Id(id);
    const found = documents.find((d) => d.id === id);
    setDoc1(found || null);
    updateURL(id, doc2Id);
  };

  const handleDoc2Change = (id: string) => {
    setDoc2Id(id);
    const found = documents.find((d) => d.id === id);
    setDoc2(found || null);
    updateURL(doc1Id, id);
  };

  const updateURL = (id1: string, id2: string) => {
    const params = new URLSearchParams();
    if (id1) params.set("doc1", id1);
    if (id2) params.set("doc2", id2);
    setSearchParams(params);
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

  const compareValues = (val1: string | null, val2: string | null, label: string) => {
    if (val1 === val2) {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm">{label}: {val1 || "None"}</span>
        </div>
      );
    }
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-red-600">
          <XCircle className="h-4 w-4" />
          <span className="text-sm font-medium">{label} — Difference:</span>
        </div>
        <div className="pl-6 space-y-1">
          <div className="text-sm">
            <span className="font-medium">Document 1:</span> {val1 || "None"}
          </div>
          <div className="text-sm">
            <span className="font-medium">Document 2:</span> {val2 || "None"}
          </div>
        </div>
      </div>
    );
  };

  const parseTodoList = (todo: string | string[] | null): string[] => {
    if (!todo) return [];
    if (Array.isArray(todo)) return todo;
    try {
      const parsed = JSON.parse(todo);
      return Array.isArray(parsed) ? parsed : [todo];
    } catch {
      return todo.split("\n").filter((line) => line.trim());
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="container mx-auto max-w-7xl space-y-6">
          <Skeleton className="h-9 w-48" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-80 rounded-lg" />
            <Skeleton className="h-80 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={() => navigate("/archive")} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to archive
            </Button>
            <h1 className="text-3xl font-bold">Document comparison</h1>
            <p className="text-muted-foreground mt-2">
              Select two documents to compare
            </p>
          </div>
        </div>

        {/* Document Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">First document</label>
                <Select value={doc1Id} onValueChange={handleDoc1Change}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a document..." />
                  </SelectTrigger>
                  <SelectContent>
                    {documents.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {doc.filename}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Second document</label>
                <Select value={doc2Id} onValueChange={handleDoc2Change}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a document..." />
                  </SelectTrigger>
                  <SelectContent>
                    {documents.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {doc.filename}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comparison */}
        {doc1 && doc2 && doc1.analyses && doc2.analyses ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Document 1 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{doc1.filename}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/result/${doc1.analyses?.id ?? doc1.id}`)}
                  >
                    View
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(doc1.upload_date), "MMMM d, yyyy h:mm a", { locale: enUS })}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>{getSeverityBadge(doc1.analyses.severity)}</div>

                {doc1.analyses.deadline && (
                  <div>
                    <p className="text-sm font-medium mb-1">Deadline</p>
                    <p className="text-sm">
                      {format(new Date(doc1.analyses.deadline), "MMMM d, yyyy", { locale: enUS })}
                    </p>
                  </div>
                )}

                {doc1.analyses.recipient_name && (
                  <div>
                    <p className="text-sm font-medium mb-1">Recipient</p>
                    <p className="text-sm font-mono">{doc1.analyses.recipient_name}</p>
                  </div>
                )}

                {doc1.analyses.bank_account && (
                  <div>
                    <p className="text-sm font-medium mb-1">Bank account</p>
                    <p className="text-sm font-mono">{doc1.analyses.bank_account}</p>
                  </div>
                )}

                {doc1.analyses.amount && (
                  <div>
                    <p className="text-sm font-medium mb-1">Amount</p>
                    <p className="text-sm font-mono">{doc1.analyses.amount}</p>
                  </div>
                )}

                {doc1.analyses.simple_summary && (
                  <div>
                    <p className="text-sm font-medium mb-2">Plain-English summary</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {doc1.analyses.simple_summary}
                    </p>
                  </div>
                )}

                {doc1.analyses.todo_simple && (
                  <div>
                    <p className="text-sm font-medium mb-2">What you need to do</p>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      {parseTodoList(doc1.analyses.todo_simple).map((todo, i) => (
                        <li key={i}>{todo}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Document 2 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{doc2.filename}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/result/${doc2.analyses?.id ?? doc2.id}`)}
                  >
                    View
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(doc2.upload_date), "MMMM d, yyyy h:mm a", { locale: enUS })}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>{getSeverityBadge(doc2.analyses.severity)}</div>

                {doc2.analyses.deadline && (
                  <div>
                    <p className="text-sm font-medium mb-1">Deadline</p>
                    <p className="text-sm">
                      {format(new Date(doc2.analyses.deadline), "MMMM d, yyyy", { locale: enUS })}
                    </p>
                  </div>
                )}

                {doc2.analyses.recipient_name && (
                  <div>
                    <p className="text-sm font-medium mb-1">Recipient</p>
                    <p className="text-sm font-mono">{doc2.analyses.recipient_name}</p>
                  </div>
                )}

                {doc2.analyses.bank_account && (
                  <div>
                    <p className="text-sm font-medium mb-1">Bank account</p>
                    <p className="text-sm font-mono">{doc2.analyses.bank_account}</p>
                  </div>
                )}

                {doc2.analyses.amount && (
                  <div>
                    <p className="text-sm font-medium mb-1">Amount</p>
                    <p className="text-sm font-mono">{doc2.analyses.amount}</p>
                  </div>
                )}

                {doc2.analyses.simple_summary && (
                  <div>
                    <p className="text-sm font-medium mb-2">Plain-English summary</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {doc2.analyses.simple_summary}
                    </p>
                  </div>
                )}

                {doc2.analyses.todo_simple && (
                  <div>
                    <p className="text-sm font-medium mb-2">What you need to do</p>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      {parseTodoList(doc2.analyses.todo_simple).map((todo, i) => (
                        <li key={i}>{todo}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : doc1Id && doc2Id ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No comparison data</h3>
              <p className="text-muted-foreground">
                At least one of the selected documents has no analysis
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select two documents</h3>
              <p className="text-muted-foreground">
                Choose documents from the dropdowns above to compare
              </p>
            </CardContent>
          </Card>
        )}

        {/* Differences Summary */}
        {doc1 && doc2 && doc1.analyses && doc2.analyses && (
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                Summary of differences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {compareValues(
                doc1.analyses.deadline,
                doc2.analyses.deadline,
                "Deadline"
              )}

              {compareValues(
                doc1.analyses.amount,
                doc2.analyses.amount,
                "Amount"
              )}

              {compareValues(
                doc1.analyses.bank_account,
                doc2.analyses.bank_account,
                "Bank account"
              )}

              {compareValues(
                doc1.analyses.recipient_name,
                doc2.analyses.recipient_name,
                "Recipient"
              )}

              {doc1.analyses.severity !== doc2.analyses.severity && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Severity — Difference:</span>
                  </div>
                  <div className="pl-6 space-y-1">
                    <div className="text-sm">
                      <span className="font-medium">Document 1:</span> {getSeverityBadge(doc1.analyses.severity)}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Document 2:</span> {getSeverityBadge(doc2.analyses.severity)}
                    </div>
                  </div>
                </div>
              )}

              {doc1.analyses.severity === doc2.analyses.severity && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">Severity: Same ({doc1.analyses.severity})</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

