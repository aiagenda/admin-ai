import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageSEO } from "@/components/PageSEO";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { staticListItems, type BlogListItem } from "@/data/blog-static";
import { fetchPublishedBlogList, mergeBlogLists } from "@/lib/blog-api";

export default function BlogIndexPage() {
  const [posts, setPosts] = useState<BlogListItem[]>(() => staticListItems());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const cms = await fetchPublishedBlogList();
      if (!cancelled) {
        setPosts(mergeBlogLists(cms, staticListItems()));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen py-12 px-4">
      <PageSEO pageKey="blog" path="/blog" />
      <div className="container mx-auto max-w-4xl space-y-6">
        <h1 className="text-4xl font-bold">GovLetter Blog</h1>
        <p className="text-muted-foreground">
          Plain-English guides to IRS notices, state tax letters, Social Security mail, and official government correspondence.
        </p>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading articles…
          </div>
        )}

        <div className="grid gap-4">
          {posts.map((post) => (
            <Card key={post.slug} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <CardTitle className="text-xl">
                    <Link className="hover:text-primary" to={`/blog/${post.slug}`}>
                      {post.title}
                    </Link>
                  </CardTitle>
                  {post.badge && (
                    <Badge variant={post.badgeVariant ?? "secondary"} className="shrink-0 text-xs">
                      {post.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{post.date}</p>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{post.excerpt}</p>
                <Link
                  to={`/blog/${post.slug}`}
                  className="inline-block mt-3 text-sm text-primary hover:underline"
                >
                  Read article →
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
