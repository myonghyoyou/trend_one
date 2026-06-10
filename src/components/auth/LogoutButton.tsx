'use client';

import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-gray-300 hover:text-white"
    >
      로그아웃
    </button>
  );
}