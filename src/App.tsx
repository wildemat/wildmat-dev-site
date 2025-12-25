import Layout from "./components/layout/Layout";
import PageSection from "./components/layout/PageSection";

const App = () => {
  return (
    <Layout>
      <PageSection centered className="flex-1 py-16">
        <h1>wildmat.dev</h1>
      </PageSection>
    </Layout>
  );
};

export default App;
