import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import LogoutButton from '@/components/auth/LogoutButton';
import DashboardContent from '@/components/dashboard/DashboardContent';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center flex-shrink-0">
        <h1 className="text-base font-semibold">정압기 트렌드 관리 시스템</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400">{session.userId}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <DashboardContent />
      </main>
    </div>
  );
}