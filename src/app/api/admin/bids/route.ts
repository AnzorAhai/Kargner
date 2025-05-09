import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Получить все ставки (только для ADMIN)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const bids = await prisma.bid.findMany({
    include: {
      user: { select: { id: true, firstName: true, lastName: true, phone: true } },
      announcement: { select: { id: true, title: true } },
      order: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(bids);
}

// Удалить ставку по id (только для ADMIN)
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'Bid id required' }, { status: 400 });
  }
  await prisma.bid.delete({ where: { id } });
  return NextResponse.json({ ok: true });
} 