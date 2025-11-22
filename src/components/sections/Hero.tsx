import { ArrowRight, Github, Linkedin } from 'lucide-react';
import { Button } from '../ui/Button';

const Hero = () => {
  return (
    <section className="container flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-16 text-center md:px-8 md:py-24">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Badge */}
        <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm">
          <span className="mr-2">🚀</span>
          <span className="text-muted-foreground">Welcome to my digital space</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          Hi, I'm <span className="text-primary">Matt Wilde</span>
          <br />
          Full Stack Developer
        </h1>

        {/* Description */}
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl">
          Building modern web applications with React, TypeScript, and Node.js.
          I write about web development, share my projects, and explore new
          technologies.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button size="lg" className="gap-2">
            View My Work
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" className="gap-2">
            Read Blog
          </Button>
        </div>

        {/* Social Links */}
        <div className="flex items-center justify-center gap-4 pt-8">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full p-3 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="GitHub"
          >
            <Github className="h-6 w-6" />
          </a>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full p-3 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="LinkedIn"
          >
            <Linkedin className="h-6 w-6" />
          </a>
        </div>

        {/* Scroll Indicator */}
        <div className="pt-12">
          <div className="animate-bounce">
            <svg
              className="mx-auto h-6 w-6 text-muted-foreground"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;

