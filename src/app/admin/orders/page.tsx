'use client';
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Определяем типы для данных заказа, можно вынести в отдельный файл types.ts, если будут использоваться в других местах
interface UserInfo {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

interface AnnouncementInfo {
  id: string;
  title: string;
  user?: UserInfo; // Автор объявления (посредник)
}

interface BidInfo {
  price: number;
  user?: UserInfo; // Мастер, сделавший ставку
}

interface Order {
  id: string;
  status: string;
  commission: number;
  createdAt: string;
  announcement: AnnouncementInfo;
  bid: BidInfo;
  master?: UserInfo | null; // Мастер, назначенный на заказ
  // mediatorId: string; // Посредник (автор объявления) теперь в announcement.user.id
}

export default function AdminOrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'ADMIN') {
      router.replace('/login');
      return;
    }

    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/orders');
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Ошибка при загрузке заказов');
        }
        const data = await res.json();
        setOrders(data);
      } catch (e: any) {
        console.error("Fetch orders error:", e);
        setError(e.message || 'Не удалось загрузить список заказов');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [status, session, router]);

  if (loading) {
    return <div className="p-8 text-center">Загрузка списка заказов...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">Ошибка: {error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Управление заказами</h1>
          <Link href="/admin/dashboard" className="text-sm font-medium text-blue-600 hover:text-blue-500">
            &larr; Назад к панели
          </Link>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {orders.length === 0 ? (
          <p className="text-center text-gray-500">Заказов пока нет.</p>
        ) : (
          <div className="bg-white shadow overflow-x-auto sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Объявление</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Сумма (₽)</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Комиссия (₽)</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Посредник</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Мастер</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
                  {/* <th scope="col" className="relative px-6 py-3"><span className="sr-only">Действия</span></th> */}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <Link href={`/announcements/${order.announcement.id}`} className="text-blue-600 hover:underline">
                        {order.announcement.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.status}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.bid.price.toLocaleString('ru-RU')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.commission.toLocaleString('ru-RU')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.announcement.user?.firstName || 'N/A'} {order.announcement.user?.lastName || ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.master?.firstName || 'N/A'} {order.master?.lastName || ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('ru-RU')}
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"></td> */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
} 