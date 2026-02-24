// @ts-expect-error -- browser-safe subpath without Node stream dependency
import readingTime from "reading-time/lib/reading-time";

const markdownFiles = import.meta.glob("@/assets/posts/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function getReadTime(slug: string): string {
  const content = markdownFiles[`/src/assets/posts/${slug}.md`];
  if (!content) return "1 min read";
  const { minutes } = readingTime(content);
  return `${Math.max(1, Math.round(minutes))} min read`;
}

export function getMarkdownContent(slug: string): string | undefined {
  return markdownFiles[`/src/assets/posts/${slug}.md`];
}

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  category: string;
  date: string;
  readTime: string;
  tags: string[];
}

interface PostDef {
  slug: string;
  title: string;
  description: string;
  category: string;
  date: string;
  tags: string[];
}

const postDefs: PostDef[] = [
  {
    slug: "escaping",
    title: "Escaping Executive Function",
    description: "Is it finally time to work on my executive functioning?",
    category: "Productivity",
    date: "2026-02-23",
    tags: ["executive function", "productivity", "self-improvement"],
  },
];

export const posts: BlogPostMeta[] = postDefs.map((p) => ({
  ...p,
  readTime: getReadTime(p.slug),
}));

export const getPostBySlug = (slug: string) =>
  posts.find((p) => p.slug === slug);
