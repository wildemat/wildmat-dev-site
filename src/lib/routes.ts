import { lazy } from "react";

export interface RouteConfig {
  path: string;
  label: string;
  element: React.LazyExoticComponent<React.ComponentType> | React.ComponentType;
  hidden?: boolean;
}

const HomePage = lazy(() => import("@/pages/Home"));
const BlogPage = lazy(() => import("@/pages/Blog"));
const BlogPostPage = lazy(() => import("@/pages/BlogPost"));

export const routes: RouteConfig[] = [
  {
    path: "/",
    label: "Home",
    element: HomePage,
  },
  {
    path: "/blog",
    label: "Blog",
    element: BlogPage,
  },
  {
    path: "/blog/:slug",
    label: "Blog Post",
    element: BlogPostPage,
    hidden: true,
  },
];

export const getNavLinks = () => {
  const home = routes.find((r) => r.path === "/");
  const others = routes
    .filter((r) => r.path !== "/" && !r.hidden)
    .sort((a, b) => a.label.localeCompare(b.label));

  return home ? [home, ...others] : others;
};
