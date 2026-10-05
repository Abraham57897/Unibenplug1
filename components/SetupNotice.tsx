export default function SetupNotice({ title = 'Database not set up yet', detail }: { title?: string; detail?: string }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <p className="text-2xl font-extrabold tracking-tight text-brand">UnibenPlug</p>
      <div className="card mt-4 p-6">
        <h1 className="text-xl font-extrabold text-gray-900">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          UnibenPlug needs a Supabase project. Once the keys are set, run{' '}
          <code className="rounded bg-field px-1">supabase/schema.sql</code> once against the database, then reload this page.
        </p>
        {detail && <p className="mt-4 rounded-lg bg-field p-2 font-mono text-xs text-gray-500">{detail}</p>}
      </div>
    </main>
  );
}
