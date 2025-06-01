import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { OrderStatus, User, Role as PrismaRole } from '@prisma/client-generated';

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
  const { orderId, status, measuredPrice, masterCommissionPaid } = body;

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
    if (measuredPrice <= 0) {
      return NextResponse.json({ error: 'Measured price must be positive' }, { status: 400 });
    }

    try {
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          measuredPrice: measuredPrice,
          status: { set: OrderStatus.AWAITING_MASTER_COMMISSION },
        },
    });
    return NextResponse.json(updatedOrder);
    } catch (error) {
      console.error('Error updating measured price:', error);
      return NextResponse.json({ error: 'Error updating measured price' }, { status: 500 });
    }
  }

  // Новая логика: Мастер оплачивает комиссию
  if (masterCommissionPaid && orderId && session.user.role === 'MASTER') {
    const orderToProcess = await prisma.order.findUnique({
        where: { id: orderId },
    });

    if (!orderToProcess) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    if (orderToProcess.masterId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden: You are not the master for this order' }, { status: 403 });
    }
    if (orderToProcess.status !== OrderStatus.AWAITING_MASTER_COMMISSION) {
        return NextResponse.json({ error: 'Order is not awaiting master commission payment' }, { status: 400 });
    }
    if (typeof orderToProcess.measuredPrice !== 'number' || orderToProcess.measuredPrice <= 0) {
        return NextResponse.json({ error: 'Valid measured price not found for this order' }, { status: 400 });
    }

    const totalCommission = orderToProcess.measuredPrice * 0.10;
    const intermediaryShare = totalCommission / 2;
    // const platformShare = totalCommission - intermediaryShare; // For reference

    const masterUser = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!masterUser) {
        return NextResponse.json({ error: 'Master user not found' }, { status: 404 });
  }
    if (masterUser.balance < totalCommission) {
        return NextResponse.json({ error: 'Insufficient balance for master to pay commission' }, { status: 400 });
    }

    try {
        const updatedOrder = await prisma.$transaction(async (tx) => {
            // Списать комиссию с Мастера
            await tx.user.update({
                where: { id: session.user.id },
                data: { balance: { decrement: totalCommission } },
            });
            // Начислить долю Посреднику
            await tx.user.update({
                where: { id: orderToProcess.mediatorId },
                data: { balance: { increment: intermediaryShare } },
            });
            // Обновить статус Заказа на COMPLETED
            return tx.order.update({
                where: { id: orderId },
                data: { status: { set: OrderStatus.COMPLETED } },
            });
        });
        return NextResponse.json(updatedOrder);
    } catch (error) {
        console.error('Master commission payment transaction error:', error);
        return NextResponse.json({ error: 'Master commission payment transaction failed' }, { status: 500 });
    }
  }

  // Общая логика обновления статуса (например, для отмены)
  if (status && orderId) {
    // Убедимся, что разрешены только определенные переходы статусов, если это необходимо
    // Например, отмена заказа Посредником, если он еще не COMPLETED
    if (status === OrderStatus.CANCELLED && session.user.role === 'INTERMEDIARY') {
      const existingOrderToCancel = await prisma.order.findUnique({ where: { id: orderId } });
      if (!existingOrderToCancel) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      // Разрешить отмену Посредником только если Заказ не выполнен
      if (existingOrderToCancel.status === OrderStatus.COMPLETED) {
           return NextResponse.json({ error: 'Cannot cancel a completed order' }, { status: 400 });
      }
      // При отмене заказа, также делаем объявление снова активным
      try {
          const cancelledOrder = await prisma.$transaction(async (tx) => {
            const updated = await tx.order.update({ 
                where: { id: orderId }, 
                data: { status: { set: OrderStatus.CANCELLED } } 
            });
            await tx.announcement.update({ 
              where: { id: existingOrderToCancel.announcementId }, 
              data: { status: 'ACTIVE' } // Используем Status, а не OrderStatus
            });
            return updated;
          });
          return NextResponse.json(cancelledOrder);
      } catch (error) {
        console.error('Error cancelling order and reactivating announcement:', error);
        return NextResponse.json({ error: 'Error cancelling order' }, { status: 500 });
      }
    } else {
        // Для других прямых изменений статуса (если они вообще нужны и разрешены)
        // Можно добавить больше проверок здесь, кто и какой статус может установить
        try {
            const updatedOrder = await prisma.order.update({ 
                where: { id: orderId }, 
                data: { status: { set: status } } 
            });
    return NextResponse.json(updatedOrder);
  } catch (error) {
            console.error('Error updating order status directly:', error);
            return NextResponse.json({ error: 'Error updating order status' }, { status: 500 });
        }
  }
  }
  
  return NextResponse.json({ error: 'Invalid request parameters for PATCH operation' }, { status: 400 });
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