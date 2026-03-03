import Link from "next/link";

export default function NotFound() {
  return (
    <main className="p-6 md:p-10">
      <div className="max-w-[720px] mx-auto">
        <section className="panel" role="alert" aria-live="assertive">
          <header className="panelHeader">
            <h1 className="text-xl font-semibold">404 – Page Not Found</h1>
            <Link className="btn" href="/">
              ← Home
            </Link>
          </header>
          <div className="panelBody">
            <p className="muted">The page you’re looking for doesn’t exist.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
