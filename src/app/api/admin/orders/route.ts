import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Получить все заказы (только для ADMIN)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const orders = await prisma.order.findMany({
      include: {
        announcement: {
          include: {
            user: true, // Автор объявления (посредник)
          }
        },
        bid: {
          include: {
            user: true, // Мастер, сделавший ставку
          }
        },
        master: true, // Мастер, назначенный на заказ (может совпадать с bid.user)
        // mediator: true, // Посредник (автор объявления) уже есть в announcement.user
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(orders);

  } catch (error) {
    console.error('[ADMIN_GET_ORDERS_ERROR]', error);
    return NextResponse.json({ error: 'Ошибка при получении списка заказов' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
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