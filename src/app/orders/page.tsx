'use client';

import React, { useEffect, useState } from 'react';
import OrderCard from '@/components/OrderCard';
import { useSession } from 'next-auth/react';

interface Order {
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
}

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(status === 'loading');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

  useEffect(() => {
    if (status === 'authenticated' && session) {
      const fetchOrders = async () => {
        try {
          setLoading(true);
          const response = await fetch(`/api/orders?userId=${session.user.id}`);
          
          if (!response.ok) throw new Error('Ошибка при загрузке заказов');
          
          const data = await response.json();
          setOrders(data);
        } catch (err) {
          setError('Не удалось загрузить заказы');
          console.error(err);
        } finally {
          setLoading(false);
        }
      };

      fetchOrders();
    }
  }, [session, status]);

  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId, status }),
      });

      if (!response.ok) throw new Error('Ошибка при обновлении статуса');

      const updatedOrder = await response.json();
      setOrders(orders.map(order => 
        order.id === orderId ? updatedOrder : order
      ));
    } catch (err) {
      setError('Не удалось обновить статус заказа');
      console.error(err);
    }
  };

  const handlePayCommission = async (orderId: string) => {
    try {
      // TODO: Интеграция с платежной системой
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          orderId, 
          paymentConfirmed: true 
        }),
      });

      if (!response.ok) throw new Error('Ошибка при оплате комиссии');

      const updatedOrder = await response.json();
      setOrders(orders.map(order => 
        order.id === orderId ? updatedOrder : order
      ));
    } catch (err) {
      setError('Не удалось оплатить комиссию');
      console.error(err);
    }
  };

  // Filter orders based on active tab: current = PENDING or ACCEPTED, history = COMPLETED or CANCELLED
  const filteredOrders = orders.filter(order => 
    activeTab === 'current'
      ? order.status === 'PENDING' || order.status === 'ACCEPTED'
      : order.status === 'COMPLETED' || order.status === 'CANCELLED'
  );

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка заказов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 text-black">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-black">
            Мои заказы
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Tabs for switching between Current and History */}
        <div className="mb-4 border-b border-gray-200">
          <nav className="flex w-full">
            <button
              onClick={() => setActiveTab('current')}
              className={`flex-1 text-center py-2 text-sm font-medium border-b-2 ${activeTab === 'current' ? 'border-black text-black' : 'border-transparent text-gray-700 hover:text-black'}`}
            >
              Текущие
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 text-center py-2 text-sm font-medium border-b-2 ${activeTab === 'history' ? 'border-black text-black' : 'border-transparent text-gray-700 hover:text-black'}`}
            >
              История заказов
            </button>
          </nav>
        </div>
        {error && (
          <div className="mb-4 text-red-600 text-center">{error}</div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onStatusChange={handleStatusChange}
              onPayCommission={handlePayCommission}
            />
          ))}
        </div>

        {filteredOrders.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-gray-500">Нет заказов в этом разделе</p>
          </div>
        )}
      </main>
    </div>
  );
} 