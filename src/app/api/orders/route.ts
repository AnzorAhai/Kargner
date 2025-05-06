import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Получение заказов мастера
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Determine filter based on role
    const userId = session.user.id;
    const whereClause: any = {};
    if (session.user.role === 'MASTER') {
      whereClause.masterId = userId;
    } else if (session.user.role === 'INTERMEDIARY') {
      whereClause.mediatorId = userId;
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        announcement: {
          include: {
            user: {
              select: { firstName: true, lastName: true, phone: true }
            }
          }
        },
        bid: true,
        master: { select: { firstName: true, lastName: true, phone: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { message: 'Ошибка при получении заказов' },
      { status: 500 }
    );
  }
}

// Обновление статуса заказа и оплата комиссии
export async function PATCH(request: Request) {
  // Authenticate user
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { orderId, status, paymentConfirmed } = await request.json();
  // Handle payment by master
  if (paymentConfirmed) {
    // Find the order with bid info
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { bid: true }
    });
    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    // Cast to any to access scalar fields
    const orderRecord: any = existingOrder;
    // Only master can confirm payment
    if (orderRecord.masterId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const paymentAmount = existingOrder.bid.price;
    // Check master's wallet balance
    const master = await prisma.user.findUnique({ where: { id: session.user.id } });
    // @ts-ignore balance exists in schema
    if (!master || (master as any).balance < paymentAmount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }
    const mediatorShare = paymentAmount * 0.5;
    // Perform transaction: debit master, credit mediator, update order
    const updatedOrder = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: session.user.id }, data: { balance: { decrement: paymentAmount } } });
      // @ts-ignore existingOrder has mediatorId
      await tx.user.update({ where: { id: orderRecord.mediatorId }, data: { balance: { increment: mediatorShare } } });
      return tx.order.update({ where: { id: orderId }, data: { status: 'COMPLETED', commission: 0 } });
    });
    return NextResponse.json(updatedOrder);
  }
  // Handle status updates (e.g., for mediator actions)
  if (!orderId || !status) {
    return NextResponse.json({ error: 'Missing orderId or status' }, { status: 400 });
  }
  try {
    let updatedOrder;
    // If mediator cancels assignment, revert announcement status
    if (status === 'CANCELLED' && session.user.role === 'INTERMEDIARY') {
      // Find existing order to get announcementId
      const existingOrder = await prisma.order.findUnique({ where: { id: orderId } });
      if (!existingOrder) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      // Perform transaction: cancel order and reactivate announcement
      await prisma.$transaction([
        prisma.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } }),
        prisma.announcement.update({ where: { id: existingOrder.announcementId }, data: { status: 'ACTIVE' } })
      ]);
      updatedOrder = await prisma.order.findUnique({ where: { id: orderId } });
    } else {
      updatedOrder = await prisma.order.update({ where: { id: orderId }, data: { status } });
    }
    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating status:', error);
    return NextResponse.json({ error: 'Error updating status' }, { status: 500 });
  }
}

// Создание заказа посредником (выдача заказа мастеру)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }
    const { bidId } = await request.json();
    if (!bidId) {
      return NextResponse.json({ error: 'Не указан bidId' }, { status: 400 });
    }
    // Найти ставку
    const bid = await prisma.bid.findUnique({ where: { id: bidId } });
    if (!bid) {
      return NextResponse.json({ error: 'Ставка не найдена' }, { status: 404 });
    }
    const commission = bid.price * 0.1;
    // Создаем или обновляем заказ по уникальному bidId (upsert)
    const order = await prisma.order.upsert({
      where: { bidId: bid.id },
      create: {
        announcementId: bid.announcementId,
        bidId: bid.id,
        mediatorId: session.user.id,
        masterId: bid.userId,
        commission: commission,
        status: 'PENDING'
      },
      update: {
        status: 'PENDING',
        commission: commission,
        mediatorId: session.user.id,
        masterId: bid.userId
      }
    });
    // Обновляем статус объявления, чтобы скрыть его с главной
    await prisma.announcement.update({
      where: { id: bid.announcementId },
      data: { status: 'CANCELLED' },
    });
    return NextResponse.json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Ошибка при создании заказа' }, { status: 500 });
  }
} 