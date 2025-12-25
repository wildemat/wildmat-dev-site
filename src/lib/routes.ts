import { lazy } from "react";

export interface RouteConfig {
  path: string;
  label: string;
  element: React.LazyExoticComponent<React.ComponentType> | React.ComponentType;
}

// Lazy load pages for better performance
const HomePage = lazy(() => import("@/pages/Home"));
const TriviaPage = lazy(() => import("@/pages/Trivia"));

export const routes: RouteConfig[] = [
  {
    path: "/",
    label: "Home",
    element: HomePage,
  },
  {
    path: "/trivia",
    label: "Trivia",
    element: TriviaPage,
  },
];

// Get navigation links sorted alphabetically (excluding home which stays first)
export const getNavLinks = () => {
  const home = routes.find((r) => r.path === "/");
  const others = routes
    .filter((r) => r.path !== "/")
    .sort((a, b) => a.label.localeCompare(b.label));
  
  return home ? [home, ...others] : others;
};

