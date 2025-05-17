'use client';

import React, { useEffect, useState } from 'react';
import OrderCard from '@/components/OrderCard';
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

type MasterTab = 'measurements' | 'current_master' | 'history_master';
type IntermediaryTab = 'current_intermediary' | 'history_intermediary';
type ActiveTabType = MasterTab | IntermediaryTab;

export default function OrdersPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(sessionStatus === 'loading');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTabType | null>(null);

  useEffect(() => {
    if (sessionStatus === 'authenticated' && session) {
      if (!activeTab) {
        setActiveTab(session.user.role === 'MASTER' ? 'measurements' : 'current_intermediary');
      }
      
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
    } else if (sessionStatus === 'unauthenticated') {
      setLoading(false);
    }
  }, [session, sessionStatus, activeTab]);

  const handleMeasuredPriceSubmit = async (orderId: string, price: number) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, measuredPrice: price }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Ошибка при обновлении цены');
      }
      const updatedOrder = await response.json();
      setOrders(orders.map(order => order.id === orderId ? { ...order, ...updatedOrder } : order));
    } catch (err: any) {
      setError(err.message || 'Не удалось обновить цену');
      console.error(err);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId, status: newStatus }),
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

  const filteredOrders = orders.filter(order => {
    if (!activeTab) return false;

    const userRole = session?.user?.role as PrismaRole | undefined;

    if (userRole === PrismaRole.MASTER) {
      const currentMasterStatuses: OrderStatus[] = [
        OrderStatus.AWAITING_PAYMENT, 
        OrderStatus.PENDING_CONFIRMATION, 
        OrderStatus.IN_PROGRESS
      ];
      const historyMasterStatuses: OrderStatus[] = [OrderStatus.COMPLETED, OrderStatus.CANCELLED];

      if (activeTab === 'measurements') return order.status === OrderStatus.AWAITING_MEASUREMENT;
      if (activeTab === 'current_master') return currentMasterStatuses.includes(order.status);
      if (activeTab === 'history_master') return historyMasterStatuses.includes(order.status);
    } else if (userRole === PrismaRole.INTERMEDIARY) {
      const currentIntermediaryStatuses: OrderStatus[] = [
        OrderStatus.AWAITING_PAYMENT, 
        OrderStatus.PENDING_CONFIRMATION, 
        OrderStatus.IN_PROGRESS,          
        OrderStatus.AWAITING_MEASUREMENT  
      ];
      const historyIntermediaryStatuses: OrderStatus[] = [OrderStatus.COMPLETED, OrderStatus.CANCELLED];

      if (activeTab === 'current_intermediary') return currentIntermediaryStatuses.includes(order.status);
      if (activeTab === 'history_intermediary') return historyIntermediaryStatuses.includes(order.status);
    }
    return false;
  });

  if (sessionStatus === 'loading' || loading || !activeTab) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка заказов...</p>
        </div>
      </div>
    );
  }

  const renderTabs = () => {
    if (!session?.user) return null;

    const userRole = session.user.role as PrismaRole;

    if (userRole === PrismaRole.MASTER) {
      const masterTabs: { key: MasterTab; label: string }[] = [
        { key: 'measurements', label: 'Замеры' },
        { key: 'current_master', label: 'Текущие' },
        { key: 'history_master', label: 'История' },
      ];
      return masterTabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={`flex-1 text-center py-2 text-sm font-medium border-b-2 ${activeTab === tab.key ? 'border-black text-black' : 'border-transparent text-gray-700 hover:text-black'}`}
        >
          {tab.label}
        </button>
      ));
    } else if (userRole === PrismaRole.INTERMEDIARY) {
      const intermediaryTabs: { key: IntermediaryTab; label: string }[] = [
        { key: 'current_intermediary', label: 'Текущие' },
        { key: 'history_intermediary', label: 'История' },
      ];
      return intermediaryTabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={`flex-1 text-center py-2 text-sm font-medium border-b-2 ${activeTab === tab.key ? 'border-black text-black' : 'border-transparent text-gray-700 hover:text-black'}`}
        >
          {tab.label}
        </button>
      ));
    }
    return null;
  };

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
        <div className="mb-4 border-b border-gray-200">
          <nav className="flex w-full">
            {renderTabs()}
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
              currentUserRole={session?.user?.role as PrismaRole | undefined}
              onStatusChange={handleStatusChange}
              onPayCommission={handlePayCommission}
              onMeasuredPriceSubmit={handleMeasuredPriceSubmit}
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