export function PageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-16 items-center border-b bg-white px-4 lg:px-8">
        <h1 className="text-lg font-semibold">{title}</h1>
      </header>
      <div className="p-4 lg:p-8">{children}</div>
    </div>
  );
}
