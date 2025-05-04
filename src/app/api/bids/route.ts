import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import webpush from '@/lib/webpush';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const announcementId = searchParams.get('announcementId');

  if (!userId && !announcementId) {
    return NextResponse.json({ error: 'Missing userId or announcementId' }, { status: 400 });
  }

  const where: any = {};
  if (userId) where.userId = userId;
  if (announcementId) where.announcementId = announcementId;

  const bids = await prisma.bid.findMany({
    where,
    include: { user: { select: { id: true, firstName: true, lastName: true } } }
  });
  return NextResponse.json(bids);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { announcementId, price } = await req.json();
  if (!announcementId || price == null) {
    return NextResponse.json({ error: 'Missing announcementId or price' }, { status: 400 });
  }

  // Check existing bid by this user
  const existing = await prisma.bid.findFirst({
    where: { userId: session.user.id, announcementId }
  });

  let bid;
  if (existing) {
    bid = await prisma.bid.update({
      where: { id: existing.id },
      data: { price: Number(price) }
    });
  } else {
    bid = await prisma.bid.create({
      data: {
        price: Number(price),
        userId: session.user.id,
        announcementId,
      }
    });
  }

  // Send push notifications to the announcement owner (intermediary)
  (async () => {
    try {
      const announcement = await prisma.announcement.findUnique({ where: { id: announcementId }, select: { userId: true, title: true } });
      if (!announcement) return;
      const subscriptions = await (prisma as any).pushSubscription.findMany({ where: { userId: announcement.userId } });
      const bidder = await prisma.user.findUnique({ where: { id: session.user.id }, select: { firstName: true, lastName: true } });
      if (!bidder) return;
      const payload = JSON.stringify({
        title: 'Новая ставка',
        body: `${bidder.firstName} ${bidder.lastName} предложил ${price} ₽ на "${announcement.title}"`,
        data: { announcementId, bidId: bid.id },
      });
      await Promise.all(
        subscriptions.map((sub: any) => webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys } as any, payload))
      );
    } catch (err) {
      console.error('Error sending push notifications:', err);
    }
  })();

  return NextResponse.json(bid);
} 