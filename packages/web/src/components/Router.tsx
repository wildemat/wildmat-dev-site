import { Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { routes } from "@/lib/routes";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: routes.map((route) => ({
      index: route.path === "/",
      path: route.path === "/" ? undefined : route.path.replace(/^\//, ""),
      element: (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
          <route.element />
        </Suspense>
      ),
    })),
  },
]);

const AppRouter = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
