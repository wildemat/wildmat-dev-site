import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import { getNavLinks } from "@/lib/routes";
import { cn } from "@/lib/utils";

const Header = () => {
  const location = useLocation();
  const navLinks = getNavLinks();
  const [visibleCount, setVisibleCount] = useState(navLinks.length);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  // Calculate how many items fit
  useEffect(() => {
    const calculateVisibleItems = () => {
      if (!navRef.current) return;

      const navWidth = navRef.current.offsetWidth;
      const moreButtonWidth = 48; // Space for ellipsis button
      let totalWidth = 0;
      let count = 0;

      for (let i = 0; i < itemsRef.current.length; i++) {
        const item = itemsRef.current[i];
        if (item) {
          const itemWidth = item.offsetWidth + 24; // Add gap
          if (totalWidth + itemWidth + moreButtonWidth < navWidth) {
            totalWidth += itemWidth;
            count++;
          } else {
            break;
          }
        }
      }

      // If all items fit, show all
      if (count === navLinks.length) {
        setVisibleCount(navLinks.length);
      } else {
        setVisibleCount(Math.max(1, count));
      }
    };

    calculateVisibleItems();
    window.addEventListener("resize", calculateVisibleItems);
    return () => window.removeEventListener("resize", calculateVisibleItems);
  }, [navLinks.length]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const visibleLinks = navLinks.slice(0, visibleCount);
  const overflowLinks = navLinks.slice(visibleCount);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <header className="w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-12 items-center justify-between px-6">
        {/* Logo */}
        <Link
          to="/"
          className="shrink-0 text-sm font-semibold tracking-tight text-foreground transition-colors hover:text-primary"
        >
          wildmat.dev
        </Link>

        {/* Navigation */}
        <nav ref={navRef} className="flex flex-1 items-center justify-end gap-1">
          {/* Visible Links */}
          {visibleLinks.map((link, index) => (
            <Link
              key={link.path}
              ref={(el) => { itemsRef.current[index] = el; }}
              to={link.path}
              className={cn(
                "whitespace-nowrap rounded px-3 py-1.5 text-sm transition-colors",
                isActive(link.path)
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}

          {/* Hidden measurement items */}
          {navLinks.slice(visibleCount).map((link, index) => (
            <Link
              key={`measure-${link.path}`}
              ref={(el) => { itemsRef.current[visibleCount + index] = el; }}
              to={link.path}
              className="pointer-events-none absolute opacity-0 whitespace-nowrap px-3 py-1.5 text-sm"
              tabIndex={-1}
              aria-hidden
            >
              {link.label}
            </Link>
          ))}

          {/* Overflow Menu */}
          {overflowLinks.length > 0 && (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded transition-colors",
                  menuOpen
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
                aria-label="More navigation links"
                aria-expanded={menuOpen}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-lg border border-border bg-popover p-1 shadow-lg">
                  {overflowLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "block rounded px-3 py-2 text-sm transition-colors",
                        isActive(link.path)
                          ? "bg-muted font-medium text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
