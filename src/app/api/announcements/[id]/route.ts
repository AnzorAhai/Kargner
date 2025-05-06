import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Get current session to know the userId
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Fetch announcement details (without all bids)
    const announcement = await prisma.announcement.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } }
      }
    });
    if (!announcement) {
      const res = NextResponse.json({ error: 'Объявление не найдено' }, { status: 404 });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }
    // Fetch only this user's bids for this announcement
    const userBids = await prisma.bid.findMany({
      where: { announcementId: params.id, userId: session.user.id },
      include: { user: { select: { id: true, firstName: true, lastName: true } } }
    });
    const res = NextResponse.json({ ...announcement, bids: userBids });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (error) {
    console.error('Error fetching announcement:', error);
    return NextResponse.json(
      { error: 'Ошибка при получении объявления' },
      { status: 500 }
    );
  }
} 