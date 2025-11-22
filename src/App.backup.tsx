import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import Hero from "./components/sections/Hero";
import BlogCard, { type BlogPost } from "./components/blog/BlogCard";

// Sample blog posts data
const blogPosts: BlogPost[] = [
  {
    id: "1",
    title: "Getting Started with React and TypeScript",
    description:
      "Learn how to set up a modern React application with TypeScript, including best practices for type safety and component architecture.",
    category: "React",
    date: "Nov 15, 2025",
    readTime: "5 min read",
    image:
      "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=400&fit=crop",
    tags: ["React", "TypeScript", "Tutorial"],
  },
  {
    id: "2",
    title: "Building a Responsive Design System with Tailwind CSS",
    description:
      "Discover how to create a scalable and maintainable design system using Tailwind CSS and custom components for your web applications.",
    category: "CSS",
    date: "Nov 12, 2025",
    readTime: "8 min read",
    image:
      "https://images.unsplash.com/photo-1507721999472-8ed4421c4af2?w=800&h=400&fit=crop",
    tags: ["Tailwind", "CSS", "Design"],
  },
  {
    id: "3",
    title: "Understanding Sass Architecture with the 7-1 Pattern",
    description:
      "A comprehensive guide to organizing your Sass files using the 7-1 architecture pattern for better maintainability and scalability.",
    category: "Sass",
    date: "Nov 10, 2025",
    readTime: "6 min read",
    image:
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=400&fit=crop",
    tags: ["Sass", "Architecture", "Best Practices"],
  },
  {
    id: "4",
    title: "Modern State Management in React Applications",
    description:
      "Explore different state management solutions in React, from Context API to Zustand, and learn when to use each approach.",
    category: "React",
    date: "Nov 8, 2025",
    readTime: "10 min read",
    image:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=400&fit=crop",
    tags: ["React", "State Management", "JavaScript"],
  },
  {
    id: "5",
    title: "Creating Accessible Web Components",
    description:
      "Learn the fundamentals of web accessibility and how to build inclusive components that work for everyone.",
    category: "Accessibility",
    date: "Nov 5, 2025",
    readTime: "7 min read",
    image:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=400&fit=crop",
    tags: ["Accessibility", "HTML", "Best Practices"],
  },
  {
    id: "6",
    title: "Performance Optimization Techniques for React",
    description:
      "Discover advanced techniques to improve the performance of your React applications, including code splitting and lazy loading.",
    category: "Performance",
    date: "Nov 2, 2025",
    readTime: "12 min read",
    image:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop",
    tags: ["React", "Performance", "Optimization"],
  },
];

function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <Hero />

        {/* Featured Blog Posts Section */}
        <section id="blog" className="bg-muted/50 py-16 md:py-24">
          <div className="container px-4 md:px-8">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
                Latest Blog Posts
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
                Thoughts on web development, design, and technology. Sharing
                what I learn along the way.
              </p>
            </div>

            {/* Blog Grid */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {blogPosts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-16 md:py-24">
          <div className="container px-4 md:px-8">
            <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
              <div className="space-y-6">
                <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                  About Me
                </h2>
                <p className="text-lg text-muted-foreground">
                  I'm a passionate full-stack developer with a focus on creating
                  beautiful, accessible, and performant web applications. With
                  years of experience in modern web technologies, I love sharing
                  my knowledge through writing and open-source contributions.
                </p>
                <p className="text-lg text-muted-foreground">
                  When I'm not coding, you can find me exploring new
                  technologies, contributing to open-source projects, or writing
                  about web development best practices.
                </p>
                <div className="flex gap-4">
                  <div className="rounded-lg border bg-card p-4 text-center">
                    <div className="text-2xl font-bold text-primary">50+</div>
                    <div className="text-sm text-muted-foreground">
                      Projects
                    </div>
                  </div>
                  <div className="rounded-lg border bg-card p-4 text-center">
                    <div className="text-2xl font-bold text-primary">100+</div>
                    <div className="text-sm text-muted-foreground">
                      Blog Posts
                    </div>
                  </div>
                  <div className="rounded-lg border bg-card p-4 text-center">
                    <div className="text-2xl font-bold text-primary">5+</div>
                    <div className="text-sm text-muted-foreground">
                      Years Exp
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                  <img
                    src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&h=600&fit=crop"
                    alt="Developer workspace"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default App;
