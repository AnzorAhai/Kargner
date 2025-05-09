import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Announcement {
  id: string;
  title: string;
  description: string;
  clientName: string;
  clientPhone: string;
  address: string;
  imageUrl?: string;
  status: string;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; phone: string };
}

export default function AdminAnnouncementsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/login');
      return;
    }
    fetchAnnouncements();
    // eslint-disable-next-line
  }, [status, session]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/announcements');
      if (!res.ok) throw new Error('Ошибка при загрузке объявлений');
      const data = await res.json();
      setAnnouncements(data);
    } catch (e) {
      setError('Ошибка при загрузке объявлений');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить объявление?')) return;
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Ошибка при удалении');
      setAnnouncements(announcements.filter(a => a.id !== id));
    } catch (e) {
      alert('Ошибка при удалении объявления');
    }
  };

  if (loading) return <div className="p-8">Загрузка...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Объявления</h1>
      <table className="min-w-full bg-white border">
        <thead>
          <tr>
            <th className="border px-4 py-2">Заголовок</th>
            <th className="border px-4 py-2">Клиент</th>
            <th className="border px-4 py-2">Телефон клиента</th>
            <th className="border px-4 py-2">Пользователь</th>
            <th className="border px-4 py-2">Статус</th>
            <th className="border px-4 py-2">Создано</th>
            <th className="border px-4 py-2">Действия</th>
          </tr>
        </thead>
        <tbody>
          {announcements.map(a => (
            <tr key={a.id}>
              <td className="border px-4 py-2">{a.title}</td>
              <td className="border px-4 py-2">{a.clientName}</td>
              <td className="border px-4 py-2">{a.clientPhone}</td>
              <td className="border px-4 py-2">{a.user.firstName} {a.user.lastName} ({a.user.phone})</td>
              <td className="border px-4 py-2">{a.status}</td>
              <td className="border px-4 py-2">{new Date(a.createdAt).toLocaleString()}</td>
              <td className="border px-4 py-2">
                <button onClick={() => handleDelete(a.id)} className="text-red-600 hover:underline">Удалить</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
} 