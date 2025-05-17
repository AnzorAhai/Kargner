import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FaMapMarkerAlt, FaPhone } from 'react-icons/fa';
import { useSession } from 'next-auth/react';
import { OrderStatus, Role as PrismaRole } from '@prisma/client-generated';

interface Order {
  id: string;
  status: OrderStatus;
  measuredPrice?: number | null;
  commission: number;
  announcement: {
    id: string;
    title: string;
    description: string;
    address: string;
    imageUrl: string;
    clientName: string;
    clientPhone: string;
    user: {
      firstName: string;
      lastName: string;
      phone: string;
    };
  };
  bid: {
    price: number;
  };
  masterId?: string | null;
  mediatorId: string;
  master?: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
  } | null;
}

interface OrderCardProps {
  order: Order;
  currentUserRole?: PrismaRole;
  onStatusChange: (orderId: string, newStatus: OrderStatus) => void;
  onPayCommission: (orderId: string) => Promise<void>;
  onMeasuredPriceSubmit: (orderId: string, price: number) => Promise<void>;
}

export default function OrderCard({ 
  order, 
  currentUserRole,
  onStatusChange, 
  onPayCommission, 
  onMeasuredPriceSubmit 
}: OrderCardProps) {
  const { data: session } = useSession();
  const [measuredPriceInput, setMeasuredPriceInput] = useState<string>(order.measuredPrice?.toString() || '');
  const [isSubmittingPrice, setIsSubmittingPrice] = useState(false);

  const isClickable = !(currentUserRole === PrismaRole.MASTER && order.status === OrderStatus.AWAITING_MEASUREMENT);

  const statusLabels: Record<OrderStatus, string> = {
    [OrderStatus.AWAITING_MEASUREMENT]: 'Ожидает замера',
    [OrderStatus.AWAITING_PAYMENT]: 'Ожидает оплаты',
    [OrderStatus.PENDING_CONFIRMATION]: 'Ожидает подтверждения',
    [OrderStatus.IN_PROGRESS]: 'В работе',
    [OrderStatus.COMPLETED]: 'Завершен',
    [OrderStatus.CANCELLED]: 'Отменен'
  };

  const statusColors: Record<OrderStatus, string> = {
    [OrderStatus.AWAITING_MEASUREMENT]: 'bg-blue-100 text-blue-800',
    [OrderStatus.AWAITING_PAYMENT]: 'bg-orange-100 text-orange-800',
    [OrderStatus.PENDING_CONFIRMATION]: 'bg-indigo-100 text-indigo-800',
    [OrderStatus.IN_PROGRESS]: 'bg-purple-100 text-purple-800',
    [OrderStatus.COMPLETED]: 'bg-green-100 text-green-800',
    [OrderStatus.CANCELLED]: 'bg-red-100 text-red-800'
  };

  const handleInternalPriceSubmit = async () => {
    const price = parseFloat(measuredPriceInput);
    if (isNaN(price) || price <= 0) {
      alert('Пожалуйста, введите корректную цену.');
      return;
    }
    setIsSubmittingPrice(true);
    await onMeasuredPriceSubmit(order.id, price);
    setIsSubmittingPrice(false);
  };

  const cardContent = (
    <div className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col h-full">
      <div className="relative h-48">
        <img
          src={order.announcement.imageUrl}
          alt={order.announcement.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold truncate">{order.announcement.title}</h3>
          {order.status && statusLabels[order.status] && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
              {statusLabels[order.status]}
            </span>
          )}
        </div>

        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {order.announcement.description}
        </p>

        <div className="text-xs text-gray-500 mb-1">
          <FaMapMarkerAlt className="inline mr-1" />
          {order.announcement.address}
        </div>

        {(currentUserRole === PrismaRole.INTERMEDIARY || (currentUserRole === PrismaRole.MASTER && order.masterId === session?.user?.id)) && (
          <div className="mt-2 text-xs border-t pt-2">
            <p className="font-semibold text-gray-700">Контакт клиента:</p>
            <p className="text-gray-600">Имя: {order.announcement.clientName}</p>
            <div className="flex items-center text-gray-600">
              <FaPhone className="mr-1 flex-shrink-0" />
              <span>{order.announcement.clientPhone}</span>
            </div>
          </div>
        )}
        
        <div className="mt-auto pt-3">
          {currentUserRole === PrismaRole.MASTER && order.status === OrderStatus.AWAITING_MEASUREMENT && (
            <div className="mb-3">
              <label htmlFor={`measuredPrice-${order.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                Цена после замера (₽):
              </label>
              <input 
                type="number"
                id={`measuredPrice-${order.id}`}
                value={measuredPriceInput}
                onChange={(e) => setMeasuredPriceInput(e.target.value)}
                placeholder="Введите цену"
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                disabled={isSubmittingPrice}
              />
              <button
                onClick={handleInternalPriceSubmit}
                disabled={isSubmittingPrice || !measuredPriceInput}
                className="mt-2 w-full py-2 px-4 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmittingPrice ? 'Отправка...' : 'Отправить цену'}
              </button>
            </div>
          )}

          {currentUserRole === PrismaRole.INTERMEDIARY && order.status === OrderStatus.AWAITING_PAYMENT && order.measuredPrice && (
            <div className="mb-3">
              <div className="text-sm text-gray-700 mb-1">
                Цена от мастера: <span className="font-semibold text-lg">{order.measuredPrice.toLocaleString('ru-RU')} ₽</span>
              </div>
              <button
                onClick={() => onPayCommission(order.id)}
                className="w-full py-2 px-4 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                Оплатить (Мастеру: {order.measuredPrice.toLocaleString('ru-RU')} ₽)
              </button>
            </div>
          )}

          {currentUserRole === PrismaRole.MASTER && order.status === OrderStatus.AWAITING_PAYMENT && order.measuredPrice && (
            <div className="mb-3">
                <div className="text-sm text-gray-700 mb-1">
                    Предложенная вами цена: <span className="font-semibold text-lg text-blue-600">{order.measuredPrice.toLocaleString('ru-RU')} ₽</span>
                </div>
                <p className="text-xs text-gray-500">Ожидается оплата от заказчика (Посредника).</p>
            </div>
          )}

          {! (currentUserRole === PrismaRole.MASTER && order.status === OrderStatus.AWAITING_MEASUREMENT) &&
           ! (currentUserRole === PrismaRole.INTERMEDIARY && order.status === OrderStatus.AWAITING_PAYMENT && order.measuredPrice) &&
            <div className="flex justify-between items-center">
                <div className="text-lg font-semibold text-gray-800">
                {order.measuredPrice ? `${order.measuredPrice.toLocaleString('ru-RU')} ₽ (фикс.)` : `${order.bid.price.toLocaleString('ru-RU')} ₽ (предв.)`}
                </div>
            </div>
          }
        </div>
      </div>
    </div>
  );

  if (isClickable) {
    return (
      <Link href={`/announcements/${order.announcement.id}?view=order`} className="block hover:shadow-lg transition-shadow duration-200 h-full">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
} 