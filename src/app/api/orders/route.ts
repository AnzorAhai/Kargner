import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { OrderStatus, User } from '@prisma/client';

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
      return NextResponse.json({ error: 'Forbidden for this role' }, { status: 403 });
    }
    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        announcement: {
          select: {
            id: true,
            title: true,
            description: true,
            address: true,
            imageUrl: true,
            clientName: true,
            clientPhone: true,
            user: {
              select: { firstName: true, lastName: true, phone: true }
            }
          }
        },
        bid: {
          select: { price: true }
        },
        master: {
          select: { id: true, firstName: true, lastName: true, phone: true }
        },
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
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { orderId, status, paymentConfirmed, measuredPrice } = body;

  // Логика для Мастера: обновление цены после замера
  if (typeof measuredPrice === 'number' && orderId && session.user.role === 'MASTER') {
    const orderToUpdate = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!orderToUpdate) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (orderToUpdate.masterId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden: You are not the master for this order' }, { status: 403 });
    }
    if (orderToUpdate.status !== OrderStatus.AWAITING_MEASUREMENT) {
      return NextResponse.json({ error: 'Order is not awaiting measurement' }, { status: 400 });
    }

    try {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          measuredPrice: measuredPrice,
          status: OrderStatus.AWAITING_PAYMENT,
        },
      });
      return NextResponse.json(updatedOrder);
    } catch (error) {
      console.error('Error updating measured price:', error);
      return NextResponse.json({ error: 'Error updating measured price' }, { status: 500 });
    }
  }

  // Существующая логика оплаты (потребует адаптации под новый флоу)
  if (paymentConfirmed && orderId) {
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { bid: true }
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const master = await prisma.user.findUnique({ where: { id: existingOrder.masterId as string } });
    const payingUser = await prisma.user.findUnique({ where: { id: session.user.id }});

    if (!master) return NextResponse.json({ error: 'Master not found' }, { status: 404 });
    if (!payingUser) return NextResponse.json({ error: 'Paying user not found'}, { status: 404});
    
    const paymentAmount = existingOrder.measuredPrice;
    if (typeof paymentAmount !== 'number') {
        return NextResponse.json({ error: 'Measured price not set or invalid' }, { status: 400 });
    }

    if (payingUser.balance < paymentAmount) {
      return NextResponse.json({ error: 'Insufficient balance for paying user' }, { status: 400 });
    }
    
    try {
      const updatedOrder = await prisma.$transaction(async (tx) => {
        await tx.user.update({ 
          where: { id: session.user.id }, 
          data: { balance: { decrement: paymentAmount } } 
        });
        await tx.user.update({ 
          where: { id: existingOrder.masterId as string }, 
          data: { balance: { increment: paymentAmount } } 
        });
        return tx.order.update({ 
          where: { id: orderId }, 
          data: { status: OrderStatus.PENDING_CONFIRMATION, commission: 0 }
        });
      });
      return NextResponse.json(updatedOrder);
    } catch (error) {
        console.error('Payment transaction error:', error);
        return NextResponse.json({ error: 'Payment transaction failed' }, { status: 500 });
    }
  }

  if (status && orderId) {
    try {
      let updatedOrder;
      if (status === OrderStatus.CANCELLED && session.user.role === 'INTERMEDIARY') {
        const existingOrderToCancel = await prisma.order.findUnique({ where: { id: orderId } });
        if (!existingOrderToCancel) {
          return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }
        if (existingOrderToCancel.status === OrderStatus.COMPLETED || existingOrderToCancel.status === OrderStatus.IN_PROGRESS) {
             return NextResponse.json({ error: 'Cannot cancel an order that is in progress or completed' }, { status: 400 });
        }

        await prisma.$transaction([
          prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.CANCELLED } }),
          prisma.announcement.update({ 
            where: { id: existingOrderToCancel.announcementId }, 
            data: { status: 'ACTIVE' }
          })
        ]);
        updatedOrder = await prisma.order.findUnique({ where: { id: orderId } });
      } else {
        updatedOrder = await prisma.order.update({ 
            where: { id: orderId }, 
            data: { status } 
        });
      }
      return NextResponse.json(updatedOrder);
    } catch (error) {
      console.error('Error updating order status:', error);
      return NextResponse.json({ error: 'Error updating order status' }, { status: 500 });
    }
  }
  
  return NextResponse.json({ error: 'Invalid request parameters for PATCH' }, { status: 400 });
}

// Создание заказа посредником (выдача заказа мастеру)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'INTERMEDIARY') {
      return NextResponse.json({ error: 'Необходима авторизация Посредника' }, { status: 401 });
    }

    const { bidId } = await request.json();
    if (!bidId) {
      return NextResponse.json({ error: 'Не указан bidId' }, { status: 400 });
    }

    const bid = await prisma.bid.findUnique({ where: { id: bidId } });
    if (!bid) {
      return NextResponse.json({ error: 'Ставка не найдена' }, { status: 404 });
    }
    if (bid.userId === session.user.id) {
        return NextResponse.json({ error: 'Посредник не может назначить заказ самому себе'}, {status: 400});
    }

    const existingOrderForBid = await prisma.order.findUnique({ where: { bidId } });
    if (existingOrderForBid) {
      return NextResponse.json({ error: 'Заказ для этой ставки уже существует' }, { status: 409 });
    }
    
    const commission = bid.price * 0.1; 

    const order = await prisma.order.create({
      data: {
        announcementId: bid.announcementId,
        bidId: bid.id,
        mediatorId: session.user.id,
        masterId: bid.userId,
        commission: commission,
        status: OrderStatus.AWAITING_MEASUREMENT,
        measuredPrice: null,
      },
    });

    await prisma.announcement.update({
      where: { id: bid.announcementId },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    if (error instanceof Error && error.message.includes("Unique constraint failed")) {
        return NextResponse.json({ error: 'Заказ для этой ставки уже существует (unique constraint).' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Ошибка при создании заказа' }, { status: 500 });
  }
} 