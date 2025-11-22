const App = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="container flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-16 text-center md:px-8 md:py-24">
          <div>
            <h1>wildmat.dev</h1>
          </div>
        </section>
        {/* Footer */}
        <footer className="py-6">
          <div className="container">
            <p>Contact: hello@wildmat.dev</p>
            <p>&copy; {new Date().getFullYear()} wildmat.dev</p>
            <p>All rights reserved.</p>
            <p>
              <a href="https://github.com/wildemat">GitHub</a>
              <a href="https://linkedin.com/in/wildematt">LinkedIn</a>
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;
