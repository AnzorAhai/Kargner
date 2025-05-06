'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { BidForm } from '@/components/BidForm';

interface Announcement {
  id: string;
  title: string;
  description: string;
  address: string;
  category: string;
  price: number;
  status: string;
  imageUrl: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    rating: number;
    ratingCount: number;
  };
  bids: { id: string; price: number; user: { id: string; firstName: string; lastName: string } }[];
}

export default function AnnouncementPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const [assigningBidId, setAssigningBidId] = useState<string | null>(null);
  const [assignedMaster, setAssignedMaster] = useState<{ id: string; name: string; orderId: string } | null>(null);

  const fetchAnnouncement = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/announcements/${params.id}`);
      if (!response.ok) {
        throw new Error('Ошибка при загрузке объявления');
      }
      const data = await response.json();
      console.log('Fetched announcement:', data);
      console.log('Session user id:', session?.user?.id);
      console.log('Bids array:', data.bids);
      setAnnouncement(data);
    } catch (err) {
      setError('Не удалось загрузить объявление');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncement();

    // Слушаем push-сообщения для обновления списка ставок
    const handleMessage = (event: any) => {
      if (event.data?.type === 'NEW_BID') {
        fetchAnnouncement();
      }
    };
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    return () => {
      // Убираем слушатель сообщений
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, [params.id]);

  const handleAssign = async (bid: { id: string; price: number; user: { id: string; firstName: string; lastName: string } }) => {
    setAssigningBidId(bid.id);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bidId: bid.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Ошибка при назначении заказа');
      }
      const orderData = await res.json();
      setAssignedMaster({ id: bid.user.id, name: `${bid.user.firstName} ${bid.user.lastName}`, orderId: orderData.id });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAssigningBidId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка объявления...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!announcement) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              {announcement.title}
            </h1>
            <Link
              href="/"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              ← Назад к списку
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="relative h-64">
              <img
                src={announcement.imageUrl}
                alt={announcement.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">
                    Описание
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {announcement.description}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">
                    Адрес
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {announcement.address}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Автор
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {announcement.user.firstName} {announcement.user.lastName}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Рейтинг автора
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {announcement.user.rating} ({announcement.user.ratingCount} отзывов)
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Дата создания
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(announcement.createdAt).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        {/* Блок для мастеров: форма или информация о своей ставке */}
        {session?.user?.role === 'MASTER' && (
          <div className="px-4 py-6 sm:px-0">
            {(() => {
              const myBid = announcement?.bids.find(b => b.user.id === session.user.id);
              return myBid ? (
                <p className="text-green-600">Вы указали {myBid.price} ₽</p>
              ) : (
                <BidForm announcementId={params.id} />
              );
            })()}
          </div>
        )}

        {/* Блок для автора объявления: список всех ставок */}
        {session?.user?.id === announcement?.user.id && (
          <div className="px-4 py-6 sm:px-0">
            <div className="flex items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Список мастеров</h2>
            </div>
            {/* Если мастер назначен, показываем сообщение и кнопку отмены */}
            {assignedMaster ? (
              <div className="flex items-center justify-between bg-green-100 p-4 rounded-lg">
                <span className="text-green-800 font-medium">
                  Исполнитель назначен: {assignedMaster.name}
                </span>
                <button
                  onClick={async () => {
                    try {
                      await fetch('/api/orders', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderId: assignedMaster.orderId, status: 'CANCELLED' })
                      });
                      // Сбросить мок-UI и обновить данные
                      setAssignedMaster(null);
                      fetchAnnouncement();
                    } catch (err: any) {
                      console.error(err);
                      alert(err.message || 'Ошибка отмены заказа');
                    }
                  }}
                  className="text-red-600 hover:underline"
                >
                  Отменить?
                </button>
              </div>
            ) : (
              <div className="bg-white shadow-lg rounded-lg p-6">
                {announcement.bids.length > 0 ? (
                  <div className="space-y-4">
                    {announcement.bids
                      .slice()
                      .sort((a, b) => a.price - b.price)
                      .map(bid => (
                        <div
                          key={bid.id}
                          className="flex justify-between items-center p-4 bg-gray-50 rounded"
                        >
                          <span className="text-gray-900">
                            {bid.user.firstName} {bid.user.lastName}
                          </span>
                          <div className="flex items-center space-x-3">
                            <span className="text-gray-900 font-medium">
                              {bid.price} ₽
                            </span>
                            <button
                              onClick={() => handleAssign(bid)}
                              disabled={assigningBidId === bid.id}
                              className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50"
                            >
                              {assigningBidId === bid.id ? 'Назначение...' : 'Назначить'}
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-gray-900">Ставок ещё нет</p>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
} 