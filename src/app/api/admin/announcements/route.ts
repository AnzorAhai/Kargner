import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Получить все объявления (только для ADMIN)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const announcements = await prisma.announcement.findMany({
    include: {
      user: { select: { id: true, firstName: true, lastName: true, phone: true } },
      bids: true,
      orders: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(announcements);
}

// Удалить объявление по id (только для ADMIN, с каскадным удалением)
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'Announcement id required' }, { status: 400 });
  }
  // Каскадное удаление: сначала заказы, потом ставки, потом объявление
  await prisma.$transaction([
    prisma.order.deleteMany({ where: { announcementId: id } }),
    prisma.bid.deleteMany({ where: { announcementId: id } }),
    prisma.announcement.delete({ where: { id } }),
  ]);
  return NextResponse.json({ ok: true });
} 