import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import type { SessionData } from '@/types';

// iron-session 설정. TTL 5400s = 90분.
// secure: production 환경에서만 HTTPS 강제.
export const sessionOptions = {
  cookieName: 'gov-trend-session',
  password: process.env.SESSION_SECRET as string,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 5400,
  },
};

// Route Handler / Server Component에서 현재 세션을 읽는다.
// 슬라이딩 윈도우 구현: API 처리 후 session.save()를 재호출한다.
export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
