
import { Sidebar } from '@/components/navigation/sidebar';
import { Header } from '@/components/navigation/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 md:ml-64 transition-all duration-300 ease-out">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
