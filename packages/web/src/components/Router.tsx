import { Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import HandshakerLayout from "@/components/layout/HandshakerLayout";
import { routes, handshakerRoutes } from "@/lib/routes";

const suspenseWrap = (Route: React.ComponentType) => (
  <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
    <Route />
  </Suspense>
);

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: routes.map((route) => ({
      index: route.path === "/",
      path: route.path === "/" ? undefined : route.path.replace(/^\//, ""),
      element: suspenseWrap(route.element),
    })),
  },
  {
    path: "/handshaker",
    element: <HandshakerLayout />,
    children: handshakerRoutes.map((route) => ({
      path: route.path,
      element: suspenseWrap(route.element),
    })),
  },
]);

const AppRouter = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
