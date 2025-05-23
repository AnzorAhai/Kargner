"use client";
export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import OrderCard from '@/components/OrderCard';
import { useSession } from 'next-auth/react';
import { OrderStatus, Role as PrismaRole } from '@prisma/client-generated';
import { useRouter } from 'next/navigation';

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

type MasterTab = 'measurements' | 'current_master';
type IntermediaryTab = 'awaiting_measurement_intermediary' | 'awaiting_master_commission_intermediary';
type ActiveTabType = MasterTab | IntermediaryTab;

export default function OrdersPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [activeTab, setActiveTab] = useState<ActiveTabType | null>(null);
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(sessionStatus === 'loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const currentRole = session?.user?.role as PrismaRole | undefined;
    let tabFromUrl: ActiveTabType | null = null;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      tabFromUrl = params.get('tab') as ActiveTabType | null;
    }
    const masterTabs: ActiveTabType[] = ['measurements', 'current_master'];
    const intermediaryTabs: ActiveTabType[] = ['awaiting_measurement_intermediary', 'awaiting_master_commission_intermediary'];
    const defaultTab = currentRole === PrismaRole.MASTER ? 'measurements' : 'awaiting_measurement_intermediary';
    if (tabFromUrl) {
      const validTabs = currentRole === PrismaRole.MASTER ? masterTabs : intermediaryTabs;
      if (validTabs.includes(tabFromUrl)) {
        setActiveTab(tabFromUrl);
      } else {
        setActiveTab(defaultTab);
      }
    } else if (sessionStatus === 'authenticated' && currentRole && activeTab !== defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [session, sessionStatus]);

  useEffect(() => {
    if (sessionStatus === 'authenticated' && session && activeTab) {
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

  const handlePayCommission = async (orderId: string): Promise<void> => {
    router.push(`/payment?orderId=${orderId}`);
  };

  const filteredOrders = orders.filter(order => {
    if (!activeTab) return false;

    const userRole = session?.user?.role as PrismaRole | undefined;

    if (userRole === PrismaRole.MASTER) {
      if (activeTab === 'measurements') return order.status === OrderStatus.AWAITING_MEASUREMENT;
      if (activeTab === 'current_master') return order.status === OrderStatus.AWAITING_MASTER_COMMISSION;
    } else if (userRole === PrismaRole.INTERMEDIARY) {
      if (activeTab === 'awaiting_measurement_intermediary') return order.status === OrderStatus.AWAITING_MEASUREMENT;
      if (activeTab === 'awaiting_master_commission_intermediary') return order.status === OrderStatus.AWAITING_MASTER_COMMISSION;
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
    let currentActiveTab = activeTab;
    if (!currentActiveTab) {
        currentActiveTab = userRole === PrismaRole.MASTER ? 'measurements' : 'awaiting_measurement_intermediary';
    }

    if (userRole === PrismaRole.MASTER) {
      const masterTabs: { key: MasterTab; label: string }[] = [
        { key: 'measurements', label: 'Замеры' },
        { key: 'current_master', label: 'Ожидает вашей оплаты' },
      ];
      return masterTabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={`flex-1 text-center py-2 text-sm font-medium border-b-2 ${currentActiveTab === tab.key ? 'border-black text-black' : 'border-transparent text-gray-700 hover:text-black'}`}
        >
          {tab.label}
        </button>
      ));
    } else if (userRole === PrismaRole.INTERMEDIARY) {
      const intermediaryTabs: { key: IntermediaryTab; label: string }[] = [
        { key: 'awaiting_measurement_intermediary', label: 'На замерах' },
        { key: 'awaiting_master_commission_intermediary', label: 'Ожидает оплаты от мастера' },
      ];
      return intermediaryTabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={`flex-1 text-center py-2 text-sm font-medium border-b-2 ${currentActiveTab === tab.key ? 'border-black text-black' : 'border-transparent text-gray-700 hover:text-black'}`}
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
              activeTab={activeTab ?? (session?.user?.role === PrismaRole.MASTER ? 'measurements' : 'awaiting_measurement_intermediary')}
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