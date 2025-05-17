"use client";

import { useEffect, useState } from 'react';
import { OrderWithRelations, Role, RoleType, OrderStatus, OrderStatusType } from '@/types/order';
import OrderCard from '@/components/OrderCard'; // Assuming OrderCard can be reused
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const OrderHistoryPage = () => {
  const [orders, setOrders] = useState<OrderWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && (session?.user?.role as RoleType) === Role.MASTER) {
      const fetchCompletedOrders = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch('/api/orders');
          if (!response.ok) {
            throw new Error('Не удалось загрузить историю заказов');
          }
          const data = await response.json() as OrderWithRelations[];
          const completedOrders = data.filter(order => order.status === OrderStatus.COMPLETED);
          setOrders(completedOrders);
        } catch (err) {
          console.error(err);
          setError(err instanceof Error ? err.message : 'Произошла ошибка');
        } finally {
          setLoading(false);
        }
      };
      fetchCompletedOrders();
    } else if (status === 'authenticated' && session?.user?.role !== Role.MASTER) {
        router.push('/');
    }
  }, [session, status, router]);

  if (loading || status === 'loading') {
    return <div className="container mx-auto p-4 text-center">Загрузка истории заказов...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-center text-red-500">Ошибка: {error}</div>;
  }

  if (!session?.user || session.user.role !== Role.MASTER) {
    return <div className="container mx-auto p-4 text-center">Доступ запрещен. Эта страница только для Мастеров.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-center">История заказов</h1>
      {orders.length === 0 ? (
        <p className="text-center text-gray-500">У вас пока нет выполненных заказов.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderCard 
              key={order.id} 
              order={order}
              currentUserRole={session.user.role as RoleType}
              onStatusChange={() => { /* No action needed in history */ }}
              onPayCommission={async () => { /* No action needed in history */ }}
              onMeasuredPriceSubmit={async () => { /* No action in history */ }}
              activeTab="history"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderHistoryPage; 