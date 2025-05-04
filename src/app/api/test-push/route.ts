import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import webpush from '@/lib/webpush';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const userId = session.user.id;
    // Cast prisma to any to access PushSubscription model if TS types are not up-to-date
    const subscriptions = await (prisma as any).pushSubscription.findMany({ where: { userId } });
    const payload = JSON.stringify({ title: 'Тестовое уведомление', body: 'Это тестовое push-сообщение', data: '/' });
    await Promise.all(
      subscriptions.map((sub: any) => 
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys } as any,
          payload
        )
      )
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error sending test push:', err);
    return NextResponse.json({ error: 'Failed to send test push' }, { status: 500 });
  }
} 