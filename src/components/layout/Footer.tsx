const Footer = () => {
  return (
    <footer className="w-full border-t border-border/40 py-4">
      <div className="flex w-full items-center justify-between px-6 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} wildmat.dev</span>
        <div className="flex gap-4">
          <a
            href="https://mail.google.com/mail/?view=cm&fs=1&to=hello@wildmat.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            hello@wildmat.dev
          </a>
          <a
            href="https://github.com/wildemat"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            GitHub
          </a>
          <a
            href="https://linkedin.com/in/wildematt"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            LinkedIn
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
