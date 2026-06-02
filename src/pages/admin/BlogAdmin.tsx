import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Plus, Pencil, Trash2, Globe, EyeOff, Eye, Loader2,
  ExternalLink, RefreshCw, FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: string;
  keywords: string;
  market: string;
  is_published: boolean;
  published_at: string | null;
  date_label: string | null;
  badge_text: string | null;
  badge_variant: string;
  created_at: string;
  updated_at: string;
};

const EMPTY_FORM: Omit<BlogPost, "id" | "created_at" | "updated_at" | "published_at"> = {
  title: "",
  slug: "",
  description: "",
  content: "",
  keywords: "",
  market: "us",
  is_published: false,
  date_label: "",
  badge_text: "",
  badge_variant: "secondary",
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export default function BlogAdmin() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("Failed to load posts: " + error.message);
    else setPosts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  function openNew() {
    setForm({ ...EMPTY_FORM });
    setEditingId("new");
    setPreviewMode(false);
  }

  function openEdit(post: BlogPost) {
    setForm({
      title: post.title,
      slug: post.slug,
      description: post.description,
      content: post.content,
      keywords: post.keywords,
      market: post.market,
      is_published: post.is_published,
      date_label: post.date_label ?? "",
      badge_text: post.badge_text ?? "",
      badge_variant: post.badge_variant,
    });
    setEditingId(post.id);
    setPreviewMode(false);
  }

  function handleTitleChange(title: string) {
    setForm((f) => ({
      ...f,
      title,
      slug: editingId === "new" ? slugify(title) : f.slug,
    }));
  }

  async function handleSave(publish?: boolean) {
    if (!form.title.trim() || !form.slug.trim() || !form.content.trim()) {
      toast.error("Title, slug, and content are required.");
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      is_published: publish !== undefined ? publish : form.is_published,
      published_at: (publish !== undefined ? publish : form.is_published)
        ? (posts.find((p) => p.id === editingId)?.published_at ?? new Date().toISOString())
        : null,
      date_label: form.date_label || format(new Date(), "MMMM d, yyyy"),
    };

    let error;
    if (editingId === "new") {
      ({ error } = await supabase.from("blog_posts").insert([payload]));
    } else {
      ({ error } = await supabase.from("blog_posts").update(payload).eq("id", editingId));
    }

    if (error) {
      toast.error("Save failed: " + error.message);
    } else {
      toast.success(payload.is_published ? "Published!" : "Saved as draft.");
      setEditingId(null);
      fetchPosts();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) toast.error("Delete failed: " + error.message);
    else { toast.success("Deleted."); fetchPosts(); }
    setDeleteId(null);
  }

  async function togglePublish(post: BlogPost) {
    const newVal = !post.is_published;
    const { error } = await supabase
      .from("blog_posts")
      .update({ is_published: newVal, published_at: newVal ? new Date().toISOString() : null })
      .eq("id", post.id);
    if (error) toast.error(error.message);
    else { toast.success(newVal ? "Published." : "Unpublished."); fetchPosts(); }
  }

  const paragraphs = form.content.split(/\n{2,}/);

  if (editingId !== null) {
    return (
      <div className="min-h-screen py-8 px-4">
        <div className="container mx-auto max-w-5xl space-y-5">

          {/* Editor header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <h1 className="text-xl font-bold">{editingId === "new" ? "New article" : "Edit article"}</h1>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewMode((p) => !p)}
              >
                {previewMode ? <Pencil className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                {previewMode ? "Edit" : "Preview"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                Save draft
              </Button>
              <Button size="sm" onClick={() => handleSave(true)} disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                <Globe className="h-3.5 w-3.5 mr-1" />
                Publish
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-5 gap-5">

            {/* Main editor / preview */}
            <div className="md:col-span-3 space-y-4">
              {!previewMode ? (
                <>
                  <div>
                    <Label>Title *</Label>
                    <Input
                      className="mt-1 text-base font-medium"
                      placeholder="IRS CP14 Notice: What It Means and What to Do"
                      value={form.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Meta description *</Label>
                    <Textarea
                      className="mt-1 resize-none"
                      rows={2}
                      placeholder="150-160 chars for Google snippet…"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">{form.description.length}/160 chars</p>
                  </div>
                  <div>
                    <Label>Content *</Label>
                    <p className="text-xs text-muted-foreground mb-1">
                      Separate paragraphs with a blank line. Bold headings: <code>**Heading text.** Body text…</code>
                    </p>
                    <Textarea
                      className="mt-1 font-mono text-sm resize-y"
                      rows={20}
                      placeholder={"Opening paragraph…\n\n**Section heading.** Body text continues here…\n\nNext paragraph…"}
                      value={form.content}
                      onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                    />
                  </div>
                </>
              ) : (
                <div className="border rounded-xl p-6 space-y-4 bg-background">
                  <h1 className="text-2xl font-bold leading-tight">{form.title || "Untitled"}</h1>
                  <p className="text-sm text-muted-foreground">{form.date_label || format(new Date(), "MMMM d, yyyy")}</p>
                  <div className="prose prose-sm max-w-none space-y-3">
                    {paragraphs.map((para, i) => {
                      if (para.startsWith("**") && para.includes(".** ")) {
                        const end = para.indexOf(".** ");
                        const heading = para.slice(2, end + 1);
                        const body = para.slice(end + 4);
                        return <p key={i}><strong>{heading}.</strong> {body}</p>;
                      }
                      return <p key={i}>{para}</p>;
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar fields */}
            <div className="md:col-span-2 space-y-4">
              <Card>
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-sm">SEO & metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pb-4">
                  <div>
                    <Label>URL slug *</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs text-muted-foreground shrink-0">/blog/</span>
                      <Input
                        className="font-mono text-xs"
                        value={form.slug}
                        onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Keywords (comma-separated)</Label>
                    <Input
                      className="mt-1 text-xs"
                      placeholder="CP14 notice, IRS balance due…"
                      value={form.keywords}
                      onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Market</Label>
                    <Select value={form.market} onValueChange={(v) => setForm((f) => ({ ...f, market: v }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us">US (English)</SelectItem>
                        <SelectItem value="hu">HU (Hungarian)</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date label</Label>
                    <Input
                      className="mt-1 text-xs"
                      placeholder={format(new Date(), "MMMM d, yyyy")}
                      value={form.date_label ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, date_label: e.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 pt-3">
                  <CardTitle className="text-sm">Blog index badge (optional)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pb-4">
                  <div>
                    <Label>Badge text</Label>
                    <Input
                      className="mt-1 text-xs"
                      placeholder="🔥 Trending 2026"
                      value={form.badge_text ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, badge_text: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Badge style</Label>
                    <Select value={form.badge_variant} onValueChange={(v) => setForm((f) => ({ ...f, badge_variant: v }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="secondary">Secondary (gray)</SelectItem>
                        <SelectItem value="default">Default (blue)</SelectItem>
                        <SelectItem value="destructive">Destructive (red)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/40 rounded-lg">
                <p className="font-medium">Writing tips</p>
                <p>• Aim for 600–1000 words</p>
                <p>• Start with the most important fact</p>
                <p>• Use <code>**Bold.** text</code> for section headings</p>
                <p>• End with a disclaimer: "not tax/legal advice"</p>
                <p>• Put the target keyword in the first paragraph</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Post list view
  return (
    <div className="min-h-screen py-10 px-4">
      <div className="container mx-auto max-w-5xl space-y-6">

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
            </Button>
            <h1 className="text-2xl font-bold">Blog / Article Writer</h1>
            <Badge variant="secondary">{posts.length} posts</Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchPosts} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1.5" />
              New article
            </Button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && posts.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">No articles yet.</p>
              <Button onClick={openNew}><Plus className="h-4 w-4 mr-1.5" />Write your first article</Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {posts.map((post) => (
            <Card key={post.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="py-3 flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{post.title}</p>
                    <Badge variant={post.is_published ? "default" : "secondary"} className="text-xs shrink-0">
                      {post.is_published ? "Published" : "Draft"}
                    </Badge>
                    <Badge variant="outline" className="text-xs shrink-0 uppercase">{post.market}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">/blog/{post.slug}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{post.description}</p>
                  <p className="text-xs text-muted-foreground/60">
                    Updated {format(new Date(post.updated_at), "MMM d, yyyy HH:mm")}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => window.open(`/blog/${post.slug}`, "_blank")}
                    title="Preview"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => togglePublish(post)}
                    title={post.is_published ? "Unpublish" : "Publish"}
                  >
                    {post.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5 text-emerald-600" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => openEdit(post)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(post.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete article?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the article and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
