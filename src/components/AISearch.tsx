import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Search, FileText, ExternalLink, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface SearchResult {
  type: "document" | "analysis" | "form";
  id: string;
  title: string;
  description?: string;
  url?: string;
  metadata?: Record<string, any>;
}

interface SearchResponse {
  success: boolean;
  intent?: string;
  entities?: Record<string, any>;
  results?: SearchResult[];
  response?: string;
  count?: number;
  error?: string;
}

export function AISearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [response, setResponse] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<Array<{ query: string; response: string; results: SearchResult[] }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = async () => {
    if (!query.trim() || !user) return;

    setSearching(true);
    setResults([]);
    setResponse(null);

    try {
      // Get function URL
      const functionUrl =
        import.meta.env.VITE_SUPABASE_FUNCTION_URL ||
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

      const response = await fetch(`${functionUrl}/ai-search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}`,
        },
        body: JSON.stringify({
          query: query.trim(),
          user_id: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data: SearchResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Search failed");
      }

      // Filter results based on AI response - if AI says no results, don't show irrelevant ones
      const aiResponse = data.response?.toLowerCase() || "";
      const hasNoResults = 
        aiResponse.includes("nem találtam") || 
        aiResponse.includes("nincs") || 
        aiResponse.includes("nincsenek") ||
        aiResponse.includes("nincs találat");

      // If AI explicitly says no results, only show results if they're truly relevant
      if (hasNoResults && data.results && data.results.length > 0) {
        // Check if results match the query intent
        const intent = data.intent;
        const entities = data.entities || {};
        
        // If searching by deadline but got upload date results, filter them out
        if (intent === "search_by_deadline") {
          const relevantResults = data.results.filter((r: SearchResult) => {
            // Only show if it has deadline metadata
            return r.metadata?.deadline;
          });
          setResults(relevantResults);
        } else {
          // For other intents, show all results
          setResults(data.results);
        }
      } else {
        setResults(data.results || []);
      }
      
      setResponse(data.response || null);

      // Add to history
      if (data.results && data.response) {
        setSearchHistory((prev) => [
          { query: query.trim(), response: data.response!, results: data.results || [] },
          ...prev.slice(0, 9), // Keep last 10 searches
        ]);
      }
    } catch (error: any) {
      console.error("Search error:", error);
      toast.error("Keresési hiba: " + (error.message || "Ismeretlen hiba"));
    } finally {
      setSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case "document":
        return <FileText className="h-4 w-4" />;
      case "form":
        return <ExternalLink className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getResultTypeLabel = (type: string) => {
    switch (type) {
      case "document":
        return "Dokumentum";
      case "form":
        return "Űrlap";
      default:
        return "Eredmény";
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            AI Keresés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Kérdezz bármit... pl. 'Volt-e már ilyen dokumentummal dolgunk?', 'Keresse meg az összes NAV-tól kapott levelet'"
              className="flex-1"
              disabled={searching}
            />
            <Button onClick={handleSearch} disabled={searching || !query.trim() || !user}>
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          {!user && (
            <p className="text-sm text-muted-foreground mt-2">
              Be kell jelentkezned a kereséshez.
            </p>
          )}
        </CardContent>
      </Card>

      {/* AI Response */}
      {response && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Válasz
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-line">{response}</p>
          </CardContent>
        </Card>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Találatok ({results.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={`${result.type}-${result.id}-${index}`}
                  className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => {
                    if (result.url) {
                      navigate(result.url);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getResultIcon(result.type)}
                        <Badge variant="outline" className="text-xs">
                          {getResultTypeLabel(result.type)}
                        </Badge>
                      </div>
                      <h4 className="font-semibold mb-1">{result.title}</h4>
                      {result.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {result.description}
                        </p>
                      )}
                      {result.metadata && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {result.metadata.category && (
                            <Badge variant="secondary" className="text-xs">
                              {result.metadata.category}
                            </Badge>
                          )}
                          {result.metadata.severity && (
                            <Badge
                              variant={
                                result.metadata.severity === "urgent"
                                  ? "destructive"
                                  : result.metadata.severity === "action_needed"
                                    ? "default"
                                    : "secondary"
                              }
                              className="text-xs"
                            >
                              {result.metadata.severity === "urgent"
                                ? "Sürgős"
                                : result.metadata.severity === "action_needed"
                                  ? "Intézkedés szükséges"
                                  : "Információ"}
                            </Badge>
                          )}
                          {result.metadata.deadline && (
                            <Badge variant="outline" className="text-xs">
                              Határidő: {new Date(result.metadata.deadline).toLocaleDateString("hu-HU")}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    {result.url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(result.url!);
                        }}
                      >
                        Megnyitás
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search History */}
      {searchHistory.length > 0 && results.length === 0 && !searching && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Korábbi keresések</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {searchHistory.slice(0, 5).map((item, index) => (
                <div
                  key={index}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setQuery(item.query);
                    setResults(item.results);
                    setResponse(item.response);
                  }}
                >
                  <p className="text-sm font-medium">{item.query}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.results.length} találat
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

