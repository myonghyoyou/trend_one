import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { id, password } = body as { id: unknown; password: unknown };

  if (!id || !password) {
    return NextResponse.json({ resCd: '0001', resMsg: '아이디와 비밀번호를 입력하세요.' });
  }

  if (id !== process.env.LOGIN_ID || password !== process.env.LOGIN_PASSWORD) {
    return NextResponse.json({ resCd: '0001', resMsg: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  }

  const session = await getSession();
  session.isLoggedIn = true;
  session.userId = String(id);
  session.loginAt = new Date().toISOString();
  await session.save();

  return NextResponse.json({ resCd: '0000' });
}