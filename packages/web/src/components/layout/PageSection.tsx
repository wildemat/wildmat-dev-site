import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageSectionProps {
  children: ReactNode;
  className?: string;
  centered?: boolean;
}

const PageSection = ({
  children,
  className,
  centered = false,
}: PageSectionProps) => {
  return (
    <section
      className={cn(
        "w-full px-6",
        centered && "flex flex-col items-center justify-center text-center",
        className
      )}
    >
      {children}
    </section>
  );
};

export default PageSection;
