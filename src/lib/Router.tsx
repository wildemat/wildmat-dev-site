import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import HomePage from "@/pages/Home";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
    ],
  },
]);

const AppRouter = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
