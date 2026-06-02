import { AISearch } from "@/components/AISearch";
import { Badge } from "@/components/ui/badge";
import { Search as SearchIcon, Sparkles, FileText, ClipboardList, Lightbulb } from "lucide-react";
import { HelpTooltip } from "@/components/HelpTooltip";

export default function Search() {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-primary/25">
              <SearchIcon className="h-6 w-6 text-white" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">AI Search</h1>
                <HelpTooltip
                  message="Ask anything about your documents in plain English"
                  link="/help#search"
                />
              </div>
              <p className="text-muted-foreground">
                Ask in natural language — the AI finds documents and forms
              </p>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 opacity-50" />
          <div className="relative p-6">
            <AISearch />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm text-muted-foreground">Try:</span>
          <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80 transition-colors">
            &quot;IRS balance due notices&quot;
          </Badge>
          <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80 transition-colors">
            &quot;payment deadlines&quot;
          </Badge>
          <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80 transition-colors">
            &quot;tax forms&quot;
          </Badge>
          <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80 transition-colors">
            &quot;urgent documents&quot;
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold">Example questions</h3>
                <p className="text-sm text-muted-foreground">Document search</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <span>&quot;Find all IRS letters I received&quot;</span>
              </li>
              <li className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <span>&quot;When was my last deadline notice?&quot;</span>
              </li>
              <li className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <span>&quot;Show tax-related documents&quot;</span>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <ClipboardList className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold">Form search</h3>
                <p className="text-sm text-muted-foreground">Official government forms</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <ClipboardList className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <span>&quot;Which form do I need to file?&quot;</span>
              </li>
              <li className="flex items-start gap-2">
                <ClipboardList className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <span>&quot;IRS tax return forms&quot;</span>
              </li>
              <li className="flex items-start gap-2">
                <ClipboardList className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <span>&quot;Forms I can fill online&quot;</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl border bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold">Tips for better search</h3>
              <p className="text-sm text-muted-foreground">How to ask effectively</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-amber-600 dark:text-amber-400">•</span>
              <span>Use specific topics: &quot;IRS&quot;, &quot;SSA&quot;, &quot;tax&quot;</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-600 dark:text-amber-400">•</span>
              <span>Include dates: &quot;January 2024&quot;</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-600 dark:text-amber-400">•</span>
              <span>Ask naturally, as you would to a person</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-600 dark:text-amber-400">•</span>
              <span>Search covers your documents and form catalog</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
