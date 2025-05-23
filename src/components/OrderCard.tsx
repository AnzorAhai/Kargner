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
  activeTab: string;
}

export default function OrderCard({ 
  order, 
  currentUserRole,
  onStatusChange, 
  onPayCommission, 
  onMeasuredPriceSubmit,
  activeTab
}: OrderCardProps) {
  const { data: session } = useSession();
  const [measuredPriceInput, setMeasuredPriceInput] = useState<string>(order.measuredPrice?.toString() || '');
  const [isSubmittingPrice, setIsSubmittingPrice] = useState(false);

  const isClickable = !(currentUserRole === PrismaRole.MASTER && order.status === OrderStatus.AWAITING_MEASUREMENT);

  const statusLabels: Record<OrderStatus, string> = {
    [OrderStatus.AWAITING_MEASUREMENT]: 'Ожидает замера',
    [OrderStatus.AWAITING_MASTER_COMMISSION]: 'Ожидает оплаты от мастера',
    [OrderStatus.COMPLETED]: 'Завершен',
    [OrderStatus.CANCELLED]: 'Отменен'
  };

  const statusColors: Record<OrderStatus, string> = {
    [OrderStatus.AWAITING_MEASUREMENT]: 'bg-blue-100 text-blue-800',
    [OrderStatus.AWAITING_MASTER_COMMISSION]: 'bg-yellow-100 text-yellow-800',
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

        <div className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
          <FaMapMarkerAlt className="inline mr-2 text-lg text-gray-800" />
          {order.announcement.address}
        </div>

        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {order.announcement.description}
        </p>

        {(currentUserRole === PrismaRole.INTERMEDIARY || (currentUserRole === PrismaRole.MASTER && order.masterId === session?.user?.id)) && (
          <div className="mt-4 border-t pt-4">
            <p className="text-lg font-semibold text-gray-800">Имя клиента: <span className="font-normal">{order.announcement.clientName}</span></p>
            <div className="mt-1 flex items-center text-lg text-gray-800">
              <FaPhone className="mr-2 flex-shrink-0 text-lg" />
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

          {currentUserRole === PrismaRole.INTERMEDIARY && order.status === OrderStatus.AWAITING_MASTER_COMMISSION && order.measuredPrice && (
            <div className="mb-3 p-3 bg-yellow-50 rounded-md border border-yellow-200">
              <p className="text-sm font-semibold text-yellow-700">Ожидается оплата от мастера.</p>
              <p className="text-xs text-yellow-600">
                Общая сумма заказа (от мастера): {order.measuredPrice.toLocaleString('ru-RU')} ₽
              </p>
              <p className="text-xs text-yellow-600">
                Комиссия мастера (10%): {(order.measuredPrice * 0.10).toLocaleString('ru-RU')} ₽
              </p>
              <p className="text-xs font-semibold text-green-600">
                Ваша доля (5%): {(order.measuredPrice * 0.05).toLocaleString('ru-RU')} ₽
              </p>
            </div>
          )}

          {currentUserRole === PrismaRole.MASTER && order.status === OrderStatus.AWAITING_MASTER_COMMISSION && order.measuredPrice && (
            <div className="mb-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                <div className="text-sm text-gray-700 mb-1">
                    Цена после замера: <span className="font-semibold text-lg text-blue-600">{order.measuredPrice.toLocaleString('ru-RU')} ₽</span>
                </div>
                <p className="text-xs text-gray-600">
                  Комиссия платформе (10%): {(order.measuredPrice * 0.10).toLocaleString('ru-RU')} ₽
                </p>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onPayCommission(order.id);
                  }}
                  className="mt-2 w-full py-2 px-4 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  Оплатить комиссию и завершить заказ
                </button>
            </div>
          )}

          {! (currentUserRole === PrismaRole.MASTER && order.status === OrderStatus.AWAITING_MEASUREMENT) &&
           ! (currentUserRole === PrismaRole.INTERMEDIARY && order.status === OrderStatus.AWAITING_MASTER_COMMISSION && order.measuredPrice) &&
           ! (currentUserRole === PrismaRole.MASTER && order.status === OrderStatus.AWAITING_MASTER_COMMISSION && order.measuredPrice) &&
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
      <Link href={`/announcements/${order.announcement.id}?view=order&previousTab=${encodeURIComponent(activeTab)}`} className="block hover:shadow-lg transition-shadow duration-200 h-full">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
} 