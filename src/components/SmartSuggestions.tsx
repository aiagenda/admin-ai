import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Lightbulb, BookOpen, Globe, FileText, Building2, GraduationCap, Heart, Car, Home, Briefcase, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SmartSuggestionsProps {
  category: string | null;
  tags: string[] | null;
  severity?: "info" | "action_needed" | "urgent";
}

interface Suggestion {
  title: string;
  description: string;
  url: string;
  icon: React.ReactNode;
  priority: "high" | "medium" | "low";
}

const categorySuggestions: Record<string, Suggestion[]> = {
  adozas: [
    {
      title: "IRS Online Account",
      description: "View balance, payment history, and tax records",
      url: "https://www.irs.gov/payments/your-online-account",
      icon: <Globe className="h-5 w-5" />,
      priority: "high",
    },
    {
      title: "IRS Direct Pay",
      description: "Pay your tax bill directly from your bank account",
      url: "https://www.irs.gov/payments/direct-pay",
      icon: <FileText className="h-5 w-5" />,
      priority: "high",
    },
    {
      title: "IRS Payment Plans",
      description: "Apply for an installment agreement online",
      url: "https://www.irs.gov/payments/payment-plans-installment-agreements",
      icon: <BookOpen className="h-5 w-5" />,
      priority: "medium",
    },
  ],
  egeszsegugy: [
    {
      title: "Medicare.gov",
      description: "Medicare benefits, coverage, and claims",
      url: "https://www.medicare.gov",
      icon: <Heart className="h-5 w-5" />,
      priority: "high",
    },
    {
      title: "Healthcare.gov",
      description: "Marketplace health insurance plans and enrollment",
      url: "https://www.healthcare.gov",
      icon: <Heart className="h-5 w-5" />,
      priority: "medium",
    },
    {
      title: "Medicaid.gov",
      description: "Medicaid coverage information and eligibility",
      url: "https://www.medicaid.gov",
      icon: <Building2 className="h-5 w-5" />,
      priority: "medium",
    },
  ],
  oktatas: [
    {
      title: "Federal Student Aid",
      description: "FAFSA, student loans, and financial aid",
      url: "https://studentaid.gov",
      icon: <GraduationCap className="h-5 w-5" />,
      priority: "high",
    },
    {
      title: "NSLDS – Loan Lookup",
      description: "Look up federal student loan balances",
      url: "https://nslds.ed.gov",
      icon: <BookOpen className="h-5 w-5" />,
      priority: "medium",
    },
  ],
  szocialis: [
    {
      title: "SSA – My Social Security",
      description: "View Social Security benefits and statements",
      url: "https://www.ssa.gov/myaccount/",
      icon: <Building2 className="h-5 w-5" />,
      priority: "high",
    },
    {
      title: "Benefits.gov",
      description: "Find federal benefit programs you may qualify for",
      url: "https://www.benefits.gov",
      icon: <Globe className="h-5 w-5" />,
      priority: "medium",
    },
  ],
  kozlekedes: [
    {
      title: "DMV.org",
      description: "Driver's license, vehicle registration, and DMV services",
      url: "https://www.dmv.org",
      icon: <Car className="h-5 w-5" />,
      priority: "high",
    },
    {
      title: "FMCSA Safety",
      description: "Federal motor carrier safety information",
      url: "https://www.fmcsa.dot.gov",
      icon: <Building2 className="h-5 w-5" />,
      priority: "low",
    },
  ],
  uzlet: [
    {
      title: "SBA – Small Business Admin",
      description: "Business licenses, loans, and federal programs",
      url: "https://www.sba.gov",
      icon: <Briefcase className="h-5 w-5" />,
      priority: "high",
    },
    {
      title: "IRS Business Center",
      description: "EIN, business taxes, and employer info",
      url: "https://www.irs.gov/businesses",
      icon: <FileText className="h-5 w-5" />,
      priority: "medium",
    },
  ],
  szamla: [
    {
      title: "CFPB – Consumer Finance",
      description: "Credit, debt collection, and billing disputes",
      url: "https://www.consumerfinance.gov",
      icon: <Building2 className="h-5 w-5" />,
      priority: "high",
    },
  ],
  hatosagi_level: [
    {
      title: "USA.gov – Government Help",
      description: "Find the right federal or state agency for your issue",
      url: "https://www.usa.gov/contact-your-government",
      icon: <Globe className="h-5 w-5" />,
      priority: "high",
    },
  ],
  egyeb: [
    {
      title: "USA.gov",
      description: "Official guide to U.S. government services",
      url: "https://www.usa.gov",
      icon: <Globe className="h-5 w-5" />,
      priority: "medium",
    },
  ],
};

const tagBasedSuggestions: Record<string, Suggestion[]> = {
  bank: [
    {
      title: "CFPB – Banking Complaints",
      description: "File a complaint about a bank or financial institution",
      url: "https://www.consumerfinance.gov/complaint/",
      icon: <Building2 className="h-5 w-5" />,
      priority: "medium",
    },
  ],
  payment: [
    {
      title: "IRS Direct Pay",
      description: "Pay tax bills directly from your bank account",
      url: "https://www.irs.gov/payments/direct-pay",
      icon: <FileText className="h-5 w-5" />,
      priority: "low",
    },
  ],
  collections: [
    {
      title: "CFPB – Debt Collection",
      description: "Know your rights and how to dispute collections",
      url: "https://www.consumerfinance.gov/consumer-tools/debt-collection/",
      icon: <FileText className="h-5 w-5" />,
      priority: "high",
    },
  ],
  deadline: [
    {
      title: "IRS – Penalty Relief",
      description: "Learn how to request first-time penalty abatement",
      url: "https://www.irs.gov/payments/penalty-relief",
      icon: <FileText className="h-5 w-5" />,
      priority: "high",
    },
  ],
};


export function SmartSuggestions({ category, tags, severity }: SmartSuggestionsProps) {
  const suggestions: Suggestion[] = [];

  // Add category-based suggestions
  if (category && categorySuggestions[category]) {
    suggestions.push(...categorySuggestions[category]);
  }

  // Add tag-based suggestions
  if (tags && tags.length > 0) {
    for (const tag of tags) {
      const lowerTag = tag.toLowerCase();
      if (tagBasedSuggestions[lowerTag]) {
        suggestions.push(...tagBasedSuggestions[lowerTag]);
      }
    }
  }

  // Remove duplicates based on URL
  const uniqueSuggestions = suggestions.filter(
    (suggestion, index, self) => index === self.findIndex((s) => s.url === suggestion.url)
  );

  // Sort by priority (high first) and limit to 3
  const sortedSuggestions = uniqueSuggestions
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 3);

  // Only show if there are suggestions
  if (sortedSuggestions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          Helpful Links & Resources
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Recommended resources based on your document type
        </p>
      </CardHeader>
      <CardContent>
        {sortedSuggestions.length > 0 ? (
          <div className="space-y-3">
            {sortedSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5 text-primary">
                  {suggestion.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm">{suggestion.title}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {suggestion.description}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={() => window.open(suggestion.url, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Open
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">
              {category || tags?.length ? (
                <>No suggestions available for this document type.</>
              ) : (
                <>Relevant resources will appear here once the document is categorized.</>
              )}
            </p>
            {!category && !tags?.length && (
              <p className="text-xs mt-2 opacity-75">
                Category: {category || "none"} | Tags: {tags?.length || 0}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

