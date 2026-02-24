import { Link } from "react-router-dom";
import { Calendar, Clock } from "lucide-react";
import PageSection from "@/components/layout/PageSection";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { posts } from "@/lib/posts";

const BlogPage = () => {
  useDocumentTitle("Blog | Matt Wilde");

  return (
    <>
      {" "}
      {/* Main Content */}
      <PageSection centered className="pt-10 pb-6">
        <h1 className="text-3xl font-bold mb-8">Blog</h1>
      </PageSection>
      <PageSection className="max-w-2xl mx-auto py-12">
        <ul className="space-y-4">
          {posts.map((post) => (
            <li key={post.slug} className="group">
              <Link
                to={`/blog/${post.slug}`}
                className="block rounded-lg border border-transparent px-4 py-3 -mx-4 transition-colors hover:border-border hover:bg-muted/40"
              >
                <span className="text-lg font-medium group-hover:text-primary transition-colors">
                  {post.title}
                </span>
                <div className="mt-1 flex gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {post.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {post.readTime}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </PageSection>
    </>
  );
};

export default BlogPage;
