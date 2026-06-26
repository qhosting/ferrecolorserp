import { Sidebar } from '@/components/navigation/sidebar';

export default function ClientesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 md:ml-64 transition-all duration-300 ease-out">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
