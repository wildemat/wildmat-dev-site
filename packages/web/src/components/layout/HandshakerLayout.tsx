import { Link, Outlet, useLocation } from "react-router-dom";
import { handshakerRoutes } from "@/lib/routes";
import { cn } from "@/lib/utils";

const HandshakerLayout = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    const fullPath = `/handshaker/${path}`;
    return location.pathname === fullPath;
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-12 items-center justify-between px-6">
          <Link
            to="/handshaker/business"
            className="shrink-0 text-sm font-semibold tracking-tight text-foreground transition-colors hover:text-primary"
          >
            Handshaker
          </Link>

          <nav className="flex items-center gap-1">
            {handshakerRoutes.map((route) => (
              <Link
                key={route.path}
                to={`/handshaker/${route.path}`}
                className={cn(
                  "whitespace-nowrap rounded px-3 py-1.5 text-sm transition-colors",
                  isActive(route.path)
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {route.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
};

export default HandshakerLayout;
