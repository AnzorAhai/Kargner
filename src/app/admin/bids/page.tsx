import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Bid {
  id: string;
  price: number;
  description?: string;
  status: string;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; phone: string };
  announcement: { id: string; title: string };
}

export default function AdminBidsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/login');
      return;
    }
    fetchBids();
    // eslint-disable-next-line
  }, [status, session]);

  const fetchBids = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/bids');
      if (!res.ok) throw new Error('Ошибка при загрузке ставок');
      const data = await res.json();
      setBids(data);
    } catch (e) {
      setError('Ошибка при загрузке ставок');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить ставку?')) return;
    try {
      const res = await fetch('/api/admin/bids', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Ошибка при удалении');
      setBids(bids.filter(b => b.id !== id));
    } catch (e) {
      alert('Ошибка при удалении ставки');
    }
  };

  if (loading) return <div className="p-8">Загрузка...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Ставки</h1>
      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            <th className="border px-4 py-2">ID</th>
            <th className="border px-4 py-2">Объявление</th>
            <th className="border px-4 py-2">Пользователь</th>
            <th className="border px-4 py-2">Цена</th>
            <th className="border px-4 py-2">Статус</th>
            <th className="border px-4 py-2">Создана</th>
            <th className="border px-4 py-2">Действия</th>
          </tr>
        </thead>
        <tbody>
          {bids.map(bid => (
            <tr key={bid.id}>
              <td className="border px-4 py-2">{bid.id}</td>
              <td className="border px-4 py-2">{bid.announcement.title}</td>
              <td className="border px-4 py-2">{bid.user.firstName} {bid.user.lastName} ({bid.user.phone})</td>
              <td className="border px-4 py-2">{bid.price}</td>
              <td className="border px-4 py-2">{bid.status}</td>
              <td className="border px-4 py-2">{new Date(bid.createdAt).toLocaleString()}</td>
              <td className="border px-4 py-2">
                <button onClick={() => handleDelete(bid.id)} className="text-red-600 hover:underline">Удалить</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
} 