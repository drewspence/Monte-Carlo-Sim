export default function Home() {
  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-7xl grid-cols-1 gap-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[280px_1fr] md:p-6">
        <aside className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Monte Carlo Sim
            </p>
            <h1 className="mt-2 text-xl font-semibold">Control Panel</h1>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium">Simulation Settings</p>
              <p className="mt-1 text-sm text-slate-500">
                Add inputs and run controls here.
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium">Scenarios</p>
              <p className="mt-1 text-sm text-slate-500">
                Manage assumptions and test cases.
              </p>
            </div>
          </div>
        </aside>

        <main className="rounded-xl border border-slate-200 p-6">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">Workspace</h2>
            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500">
              Base Layout
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
              <h3 className="text-base font-medium">Results Area</h3>
              <p className="mt-2 text-sm text-slate-500">
                Charts, output tables, and stats can live here.
              </p>
            </section>
            <section className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
              <h3 className="text-base font-medium">Notes</h3>
              <p className="mt-2 text-sm text-slate-500">
                Space for assumptions, logs, or run summaries.
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
