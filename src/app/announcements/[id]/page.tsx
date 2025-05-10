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
  const router = useRouter();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assigningBidId, setAssigningBidId] = useState<string | null>(null);
  const [publicState, setPublicState] = useState<{ id: string; name: string; orderId: string } | null>(null);
  const [isEditingBid, setIsEditingBid] = useState(false);
  const [bidsData, setBidsData] = useState<Announcement['bids']>([]);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const fetchAnnouncement = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/announcements/${params.id}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Ошибка при загрузке объявления');
      }
      const data = await response.json();
      console.log('Fetched announcement:', data);
      console.log('Session user id:', session?.user?.id);
      console.log('Bids array:', data.bids);
      setAnnouncement(data);
      const bidsRes = await fetch(`/api/bids?announcementId=${params.id}`, { cache: 'no-store' });
      if (bidsRes.ok) {
        const bids = await bidsRes.json();
        setBidsData(bids);
      }
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
      setPublicState({ id: bid.user.id, name: `${bid.user.firstName} ${bid.user.lastName}`, orderId: orderData.id });
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
            <div className="flex items-center space-x-4">
              {session?.user?.id === announcement.user.id && (
                <>
                  <Link
                    href={`/announcements/${params.id}/edit`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Редактировать
                  </Link>
                  <button
                    onClick={async () => {
                      if (confirm('Удалить объявление? Это действие необратимо.')) {
                        try {
                          const res = await fetch(`/api/announcements/${params.id}`, { method: 'DELETE' });
                          if (!res.ok) {
                            const err = await res.json();
                            throw new Error(err.error || err.message);
                          }
                          router.push('/');
                        } catch (e: any) {
                          alert(e.message || 'Ошибка при удалении объявления');
                        }
                      }
                    }}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Удалить
                  </button>
                </>
              )}
              <Link
                href="/"
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                ← Назад к списку
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">

        {/* Блок для автора объявления: список всех ставок */}
        {session?.user?.id === announcement?.user.id && (
          <div className="px-4 py-6 sm:px-0">
            <div className="flex items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Список мастеров</h2>
            </div>
            {/* Если мастер назначен, показываем сообщение и кнопку отмены */}
            {publicState ? (
              <div className="flex items-center justify-between bg-green-100 p-4 rounded-lg">
                <span className="text-green-800 font-medium">
                  Исполнитель назначен: {publicState.name}
                </span>
                <button
                  onClick={async () => {
                    try {
                      await fetch('/api/orders', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderId: publicState.orderId, status: 'CANCELLED' })
                      });
                      // Сбросить мок-UI и обновить данные
                      setPublicState(null);
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
                {bidsData.length > 0 ? (
                  <div className="space-y-4">
                    {bidsData
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

        {/* Отображение минимальной текущей ставки */}
        {(session?.user?.role === 'MASTER' || session?.user?.id === announcement?.user.id) && bidsData && (
          <div className="px-4 pt-6 pb-2 sm:px-0 text-sm text-gray-700">
            {bidsData.length > 0 ? (
              <p>
                Минимальная текущая ставка: <span className="font-semibold">{Math.min(...bidsData.map(b => b.price))} ₽</span>
              </p>
            ) : (
              <p>Ставок на это объявление пока нет.</p>
            )}
          </div>
        )}

        {/* Блок для мастеров: форма или информация о своей ставке - ПЕРЕМЕЩЕН ВВЕРХ */}
        {session?.user?.role === 'MASTER' && (
          <div className="px-4 pt-2 pb-6 sm:px-0">
            {(() => {
              const myBid = bidsData.find(b => b.user.id === session.user.id);
              
              if (!myBid || isEditingBid) {
                return (
                  <BidForm
                    announcementId={params.id}
                    initialPrice={myBid?.price}
                    bidId={myBid?.id}
                    onSuccess={() => {
                      setIsEditingBid(false);
                      fetchAnnouncement();
                    }}
                  />
                );
              }

              // Определяем, лидирует ли ставка мастера
              let isLeadingBid = false;
              let message = '';
              let textColor = 'text-green-600'; // По умолчанию зеленый

              if (bidsData && bidsData.length > 0) {
                const minPrice = Math.min(...bidsData.map(b => b.price));
                if (myBid.price === minPrice) {
                  isLeadingBid = true;
                  message = 'Ваша ставка лидирует';
                  // textColor остается 'text-green-600'
                } else {
                  message = 'Вашу ставку перебили!';
                  textColor = 'text-red-600';
                }
              } else if (bidsData && bidsData.length === 0 && myBid) {
                // Если ставок других нет, а моя есть - я лидирую
                isLeadingBid = true;
                message = 'Ваша ставка лидирует';
                 // textColor остается 'text-green-600'
              }
              
              // Show current bid with edit button
              return (
                <div className="flex items-center space-x-2">
                  <span className={textColor}>Вы указали {myBid.price} ₽. {message}</span>
                  <button
                    onClick={() => setIsEditingBid(true)}
                    className="text-sm text-blue-600 hover:underline ml-2"
                  >
                    Изменить цену?
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        {/* Блок с деталями объявления */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="relative h-64 cursor-pointer" onClick={() => setIsImageModalOpen(true)}>
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

        {/* Модальное окно для изображения */}
        {isImageModalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={() => setIsImageModalOpen(false)}
          >
            <div
              className="relative bg-white p-2 rounded-lg shadow-xl max-w-full max-h-full overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={announcement.imageUrl}
                alt={announcement.title}
                className="block max-w-full max-h-[90vh] object-contain"
              />
              <button
                onClick={() => setIsImageModalOpen(false)}
                className="absolute top-2 right-2 text-white bg-gray-800 hover:bg-gray-700 rounded-full p-2 text-xl leading-none"
                aria-label="Закрыть"
              >
                &times;
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
} 