import { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import Footer from "./Footer";

interface LayoutProps {
  children?: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col">
        {children ?? <Outlet />}
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
