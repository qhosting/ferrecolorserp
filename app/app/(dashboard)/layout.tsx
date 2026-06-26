import { Sidebar } from '@/components/navigation/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar renders itself with fixed positioning on desktop */}
      <Sidebar />
      {/* Main content — ml matches the default expanded sidebar width */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64 transition-all duration-300 ease-out">
        <main className="flex-1 overflow-y-auto bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}
