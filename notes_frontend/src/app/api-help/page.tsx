import Link from "next/link";

export default function ApiHelpPage() {
  return (
    <main className="p-4 md:p-6 lg:p-8">
      <div className="max-w-[920px] mx-auto grid gap-4">
        <header className="panel">
          <div className="panelHeader">
            <h1 className="text-xl font-semibold">API connectivity help</h1>
            <Link className="btn" href="/">
              ← Back
            </Link>
          </div>
          <div className="panelBody">
            <p className="muted">
              This frontend expects a FastAPI backend. Configure{" "}
              <span className="kbd">NEXT_PUBLIC_API_BASE_URL</span> (no trailing slash).
            </p>
          </div>
        </header>

        <section className="panel">
          <div className="panelHeader">
            <h2 className="text-lg font-semibold">Environment</h2>
          </div>
          <div className="panelBody md">
            <pre>
              <code>
{`# .env.local (example)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_API_DEBUG=0`}
              </code>
            </pre>
            <p className="muted">
              Restart the dev server after changing env vars.
            </p>
          </div>
        </section>

        <section className="panel">
          <div className="panelHeader">
            <h2 className="text-lg font-semibold">Expected endpoints</h2>
          </div>
          <div className="panelBody md">
            <ul>
              <li>
                <code>GET /notes</code> (optional query params: <code>q</code>, <code>tag</code>,{" "}
                <code>pinned</code>)
              </li>
              <li>
                <code>POST /notes</code>
              </li>
              <li>
                <code>GET /notes/:id</code>
              </li>
              <li>
                <code>PATCH /notes/:id</code> (preferred) or <code>PUT /notes/:id</code>
              </li>
              <li>
                <code>DELETE /notes/:id</code>
              </li>
              <li>
                <code>GET /tags</code> (optional; UI can derive tags from notes)
              </li>
            </ul>

            <p className="muted">
              If your backend uses different paths, update <code>src/lib/api.ts</code> accordingly.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
