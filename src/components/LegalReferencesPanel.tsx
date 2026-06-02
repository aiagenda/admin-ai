import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ExternalLink, Scale, BookOpen, CheckCircle2, AlertTriangle, Lightbulb } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LawReference {
  id: string;
  short_name: string;
  official_title: string;
  source_url: string;
  topics: string[];
  typical_sections: Record<string, string>;
  notes: string | null;
}

interface PlaybookStep {
  order: number;
  title: string;
  description: string;
  deadline_info?: string;
  law_refs?: string[];
}

interface Playbook {
  id: string;
  doc_type: string;
  name: string;
  description: string | null;
  steps: PlaybookStep[];
  related_laws: string[];
  related_forms: string[];
  warnings: string[];
  tips: string[];
}

interface LegalReferencesPanelProps {
  mentionedLaws?: string[] | null;
  detectedTags?: string[] | null;
  detectedCategory?: string | null;
  docType?: string | null;
}

export function LegalReferencesPanel({
  mentionedLaws,
  detectedTags,
  detectedCategory,
  docType,
}: LegalReferencesPanelProps) {
  const [lawReferences, setLawReferences] = useState<LawReference[]>([]);
  const [playbook, setPlaybook] = useState<Playbook | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch law references based on mentioned_laws
        const lawRefs: LawReference[] = [];
        
        if (mentionedLaws && mentionedLaws.length > 0) {
          for (const lawName of mentionedLaws) {
            // Extract just the law name (e.g., "Art." from "Art. 123. §")
            const shortName = lawName.split(/\s+/)[0].replace(/\.$/, "");
            
            const { data } = await supabase.rpc("resolve_law_reference", {
              _name_or_alias: shortName,
            });
            
            if (data && data.length > 0) {
              // Avoid duplicates
              const existing = lawRefs.find((l) => l.id === data[0].id);
              if (!existing) {
                lawRefs.push(data[0] as LawReference);
              }
            }
          }
        }

        // 2. Also fetch laws by topics (implicit laws based on detected_tags)
        if (detectedTags && detectedTags.length > 0) {
          const { data: topicLaws } = await supabase.rpc("get_laws_by_topics", {
            _topics: detectedTags,
          });
          
          if (topicLaws) {
            for (const law of topicLaws) {
              const existing = lawRefs.find((l) => l.id === law.id);
              if (!existing) {
                lawRefs.push(law as LawReference);
              }
            }
          }
        }

        setLawReferences(lawRefs.slice(0, 5)); // Limit to 5 most relevant

        // 3. Fetch matching playbook
        const { data: playbookData } = await supabase.rpc("get_matching_playbook", {
          _category: detectedCategory || null,
          _tags: detectedTags || null,
          _content_keywords: detectedTags || null, // Use tags as keywords too
          _doc_type: docType || null,
        });

        if (playbookData && playbookData.length > 0) {
          // Get the best matching playbook (highest match_score)
          const bestMatch = playbookData[0];
          setPlaybook({
            ...bestMatch,
            steps: bestMatch.steps as PlaybookStep[],
          } as Playbook);

          // Also add related_laws from playbook
          if (bestMatch.related_laws) {
            for (const lawShortName of bestMatch.related_laws) {
              const existing = lawRefs.find((l) => 
                l.short_name.toLowerCase().replace(/\.$/, "") === lawShortName.toLowerCase().replace(/\.$/, "")
              );
              if (!existing) {
                const { data } = await supabase.rpc("resolve_law_reference", {
                  _name_or_alias: lawShortName,
                });
                if (data && data.length > 0) {
                  lawRefs.push(data[0] as LawReference);
                }
              }
            }
            setLawReferences(lawRefs.slice(0, 5));
          }
        }
      } catch (error) {
        console.error("Error fetching legal references:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mentionedLaws, detectedTags, detectedCategory, docType]);

  if (loading) {
    return null; // Don't show loading state, just hide until loaded
  }

  const hasContent = lawReferences.length > 0 || playbook;
  if (!hasContent) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Playbook: Lépésről lépésre útmutató */}
      {playbook && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-primary" />
              {playbook.name}
            </CardTitle>
            {playbook.description && (
              <CardDescription>{playbook.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Warnings */}
            {playbook.warnings && playbook.warnings.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    {playbook.warnings.map((warning, i) => (
                      <p key={i} className="text-sm text-destructive">
                        {warning}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Steps */}
            <Accordion type="single" collapsible className="w-full">
              {playbook.steps.map((step, index) => (
                <AccordionItem key={index} value={`step-${index}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
                        {step.order}
                      </span>
                      <span className="font-medium">{step.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pl-9 space-y-2">
                    <p className="text-muted-foreground">{step.description}</p>
                    {step.deadline_info && (
                      <p className="text-sm text-warning-foreground bg-warning/10 p-2 rounded">
                        ⏰ {step.deadline_info}
                      </p>
                    )}
                    {step.law_refs && step.law_refs.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {step.law_refs.map((ref, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {ref}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {/* Tips */}
            {playbook.tips && playbook.tips.length > 0 && (
              <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    {playbook.tips.map((tip, i) => (
                      <p key={i} className="text-sm text-muted-foreground">
                        {tip}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ellenőrzés: Jogszabály hivatkozások */}
      {lawReferences.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Scale className="h-5 w-5 text-primary" />
              Ellenőrzés – Jogszabályok
            </CardTitle>
            <CardDescription>
              Az alábbi jogszabályokban ellenőrizheted a részleteket
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lawReferences.map((law) => (
                <div
                  key={law.id}
                  className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{law.short_name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          asChild
                        >
                          <a
                            href={law.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            NJT
                          </a>
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {law.official_title}
                      </p>
                      
                      {/* Typical sections to check */}
                      {law.typical_sections && Object.keys(law.typical_sections).length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Mit ellenőrizz:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(law.typical_sections).slice(0, 4).map(([topic, section]) => (
                              <Badge key={topic} variant="secondary" className="text-xs">
                                {topic}: {section}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {law.notes && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          💡 {law.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <p className="text-xs text-muted-foreground mt-4 text-center">
              ⚠️ Mindig a hatályos jogszabályszöveget ellenőrizd az NJT-n
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
