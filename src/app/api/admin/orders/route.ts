import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Получить все заказы (только для ADMIN)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const orders = await prisma.order.findMany({
    include: {
      mediator: { select: { id: true, firstName: true, lastName: true, phone: true } },
      master: { select: { id: true, firstName: true, lastName: true, phone: true } },
      announcement: { select: { id: true, title: true } },
      bid: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(orders);
}

// Удалить заказ по id (только для ADMIN)
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'Order id required' }, { status: 400 });
  }
  await prisma.order.delete({ where: { id } });
  return NextResponse.json({ ok: true });
} 