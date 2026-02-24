import PageSection from "@/components/layout/PageSection";

export default function TestPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const testParam = urlParams.get("test");
  return (
    <PageSection centered className="flex-1 py-16">
      <h1>Test Page: {testParam}</h1>
    </PageSection>
  );
}
