import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FaMapMarkerAlt, FaPhone } from 'react-icons/fa';
import { useSession } from 'next-auth/react';

interface OrderCardProps {
  order: {
    id: string;
    status: 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED';
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
  };
  onStatusChange: (orderId: string, status: string) => void;
  onPayCommission: (orderId: string) => void;
}

export default function OrderCard({ order, onStatusChange, onPayCommission }: OrderCardProps) {
  const { data: session } = useSession();
  const statusLabels = {
    PENDING: 'В ожидании',
    ACCEPTED: 'Принят',
    COMPLETED: 'Завершен',
    CANCELLED: 'Отменен'
  };

  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    ACCEPTED: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800'
  };

  return (
    <Link href={`/announcements/${order.announcement.id}?view=order`} className="block hover:shadow-lg transition-shadow duration-200">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="relative h-48">
          <img
            src={order.announcement.imageUrl}
            alt={order.announcement.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
        <div className="p-4">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold">{order.announcement.title}</h3>
            <span className={`px-2 py-1 rounded-full text-sm ${statusColors[order.status]}`}>
              {statusLabels[order.status]}
            </span>
          </div>

          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {order.announcement.description}
          </p>

          <div className="flex items-center text-gray-500 text-sm mb-2">
            <FaMapMarkerAlt className="mr-1" />
            <span>{order.announcement.address}</span>
          </div>

          {(session?.user?.id === order.mediatorId || (session?.user?.id === order.masterId && order.masterId)) && (
            <>
              <div className="mt-2 text-sm">
                <p className="font-semibold text-gray-700">Контакт клиента:</p>
                <p className="text-gray-600">Имя: {order.announcement.clientName}</p>
                <div className="flex items-center text-gray-600">
                  <FaPhone className="mr-1 flex-shrink-0" />
                  <span>{order.announcement.clientPhone}</span>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-between items-center mb-4 mt-3">
            <div className="text-sm text-gray-900 font-medium">
              {session?.user?.role === 'INTERMEDIARY' && order.master && (
                <span>Исполнитель: {order.master.firstName} {order.master.lastName}</span>
              )}
            </div>
            <div className="text-lg font-semibold text-green-600">
              {order.bid.price.toLocaleString('ru-RU')} ₽
            </div>
          </div>

          {/* Показываем оплату комиссии только мастеру */}
          {session?.user?.role === 'MASTER' && order.commission > 0 && (
            <div className="mb-4">
              <div className="text-sm text-red-600 mb-2">
                Необходимо оплатить: {order.commission.toLocaleString('ru-RU')} ₽
              </div>
              <button
                onClick={() => onPayCommission(order.id)}
                className="w-full py-2 px-4 text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                Оплатить
              </button>
            </div>
          )}

          {/* Завершить заказ - убрано */}
        </div>
      </div>
    </Link>
  );
} 