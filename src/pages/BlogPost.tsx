import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Calendar, Clock, ArrowLeft } from "lucide-react";
import PageSection from "@/components/layout/PageSection";
import { Badge } from "@/components/ui/Badge";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { getPostBySlug, getMarkdownContent } from "@/lib/posts";

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPostBySlug(slug) : undefined;
  const content = slug ? getMarkdownContent(slug) : undefined;

  useDocumentTitle(post ? `${post.title} | Matt Wilde` : "Blog | Matt Wilde");

  if (!post) {
    return (
      <PageSection className="max-w-2xl mx-auto py-12">
        <p className="text-muted-foreground">Post not found.</p>
        <Link
          to="/blog"
          className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to blog
        </Link>
      </PageSection>
    );
  }

  return (
    <PageSection className="py-12 lg:px-[25%]">
      <Link
        to="/blog"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to blog
      </Link>

      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold">{post.title}</h1>
        <p className="mt-2 text-muted-foreground">{post.description}</p>
        <div className="mt-3 flex justify-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {post.date}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {post.readTime}
          </span>
        </div>
      </header>

      {content ? (
        <article className="prose prose-neutral dark:prose-invert max-w-none text-left">
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      ) : (
        <p className="text-muted-foreground">Content not found.</p>
      )}

      <footer className="mt-10 border-t pt-6">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge>{post.category}</Badge>
          {post.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </footer>
    </PageSection>
  );
};

export default BlogPostPage;
