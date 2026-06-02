import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History, FileText, Download, Eye, Calendar } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface DocumentVersion {
  id: string;
  document_id: string;
  parent_document_id: string | null;
  version_number: number;
  filename: string;
  file_url: string;
  created_at: string;
  created_by: string | null;
  change_description: string | null;
}

interface DocumentVersionHistoryProps {
  documentId: string;
  currentVersion?: number;
}

export function DocumentVersionHistory({ documentId, currentVersion = 1 }: DocumentVersionHistoryProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const { data, error } = await supabase.rpc("get_document_version_history", {
          p_document_id: documentId,
        });

        if (error) throw error;

        // If no versions in history, check if current document has version info
        if (!data || data.length === 0) {
          const { data: docData } = await supabase
            .from("documents")
            .select("id, filename, file_url, upload_date, version_number, parent_document_id")
            .eq("id", documentId)
            .single();

          if (docData) {
            setVersions([
              {
                id: docData.id,
                document_id: docData.id,
                parent_document_id: docData.parent_document_id,
                version_number: docData.version_number || 1,
                filename: docData.filename,
                file_url: docData.file_url,
                created_at: docData.upload_date,
                created_by: null,
                change_description: null,
              },
            ]);
          }
        } else {
          setVersions(data as DocumentVersion[]);
        }
      } catch (error: any) {
        console.error("Error fetching version history:", error);
        toast.error("Failed to load version history");
      } finally {
        setLoading(false);
      }
    };

    fetchVersions();
  }, [documentId]);

  const handleViewVersion = (version: DocumentVersion) => {
    // Navigate to the document's analysis if it exists
    navigate(`/result/${version.document_id}`);
  };

  const handleDownloadVersion = async (version: DocumentVersion) => {
    try {
      if (version.file_url === "text_content") {
        toast.info("This version has text content only");
        return;
      }

      const { data, error } = await supabase.storage
        .from("documents")
        .download(version.file_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = version.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Version downloaded");
    } catch (error: any) {
      console.error("Error downloading version:", error);
      toast.error("Failed to download version");
    }
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

  if (versions.length <= 1) {
    return null; // Don't show if there's only one version
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <CardTitle>Version History</CardTitle>
        </div>
        <CardDescription>
          {versions.length} version(s)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {versions.map((version, index) => (
            <div
              key={version.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                version.version_number === currentVersion
                  ? "bg-primary/10 border-primary"
                  : "bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{version.filename}</p>
                    <Badge variant={version.version_number === currentVersion ? "default" : "secondary"}>
                      Version {version.version_number}
                      {version.version_number === currentVersion && " (current)"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {format(new Date(version.created_at), "yyyy. MM. dd. HH:mm", { locale: hu })}
                    </span>
                  </div>
                  {version.change_description && (
                    <p className="text-sm text-muted-foreground mt-1">{version.change_description}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleViewVersion(version)}
                  title="View version"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDownloadVersion(version)}
                  title="Download version"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
