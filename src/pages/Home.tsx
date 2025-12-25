import PageSection from "@/components/layout/PageSection";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const HomePage = () => {
  useDocumentTitle();

  return (
    <PageSection centered className="flex-1 py-16">
      <h1>wildmat.dev</h1>
    </PageSection>
  );
};

export default HomePage;

