import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Order {
  id: string;
  status: string;
  commission: number;
  createdAt: string;
  mediator: { id: string; firstName: string; lastName: string; phone: string };
  master?: { id: string; firstName: string; lastName: string; phone: string };
  announcement: { id: string; title: string };
}

export default function AdminOrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/login');
      return;
    }
    fetchOrders();
    // eslint-disable-next-line
  }, [status, session]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/orders');
      if (!res.ok) throw new Error('Ошибка при загрузке заказов');
      const data = await res.json();
      setOrders(data);
    } catch (e) {
      setError('Ошибка при загрузке заказов');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить заказ?')) return;
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Ошибка при удалении');
      setOrders(orders.filter(o => o.id !== id));
    } catch (e) {
      alert('Ошибка при удалении заказа');
    }
  };

  if (loading) return <div className="p-8">Загрузка...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Заказы</h1>
      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            <th className="border px-4 py-2">ID</th>
            <th className="border px-4 py-2">Объявление</th>
            <th className="border px-4 py-2">Посредник</th>
            <th className="border px-4 py-2">Мастер</th>
            <th className="border px-4 py-2">Статус</th>
            <th className="border px-4 py-2">Комиссия</th>
            <th className="border px-4 py-2">Создан</th>
            <th className="border px-4 py-2">Действия</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.id}>
              <td className="border px-4 py-2">{order.id}</td>
              <td className="border px-4 py-2">{order.announcement.title}</td>
              <td className="border px-4 py-2">{order.mediator.firstName} {order.mediator.lastName} ({order.mediator.phone})</td>
              <td className="border px-4 py-2">{order.master ? `${order.master.firstName} ${order.master.lastName} (${order.master.phone})` : '-'}</td>
              <td className="border px-4 py-2">{order.status}</td>
              <td className="border px-4 py-2">{order.commission}</td>
              <td className="border px-4 py-2">{new Date(order.createdAt).toLocaleString()}</td>
              <td className="border px-4 py-2">
                <button onClick={() => handleDelete(order.id)} className="text-red-600 hover:underline">Удалить</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
} 