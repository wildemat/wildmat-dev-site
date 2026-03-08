import TestPage from "@/pages/TestPage";
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
const SmsTermsPage = lazy(() => import("@/pages/handshaker/SmsTerms"));
const PrivacyPolicyPage = lazy(() => import("@/pages/handshaker/PrivacyPolicy"));
const SmsConsentPage = lazy(() => import("@/pages/handshaker/SmsConsent"));

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
  {
    path: "/test",
    label: "Test",
    element: TestPage,
    hidden: true,
  },
  {
    path: "/handshaker/sms-terms",
    label: "SMS Terms of Service",
    element: SmsTermsPage,
    hidden: true,
  },
  {
    path: "/handshaker/privacy",
    label: "Privacy Policy",
    element: PrivacyPolicyPage,
    hidden: true,
  },
  {
    path: "/handshaker/sms-consent",
    label: "SMS Consent",
    element: SmsConsentPage,
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
