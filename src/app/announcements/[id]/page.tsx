'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  clientName: string;
  clientPhone: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    rating: number;
    ratingCount: number;
  };
  bids: { id: string; price: number; user: { id: string; firstName: string; lastName: string } }[];
}

function AnnouncementPageComponent({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewMode = searchParams.get('view');

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assigningBidId, setAssigningBidId] = useState<string | null>(null);
  const [publicState, setPublicState] = useState<{ id: string; name: string; orderId: string } | null>(null);
  const [isEditingBid, setIsEditingBid] = useState(false);
  const [bidsData, setBidsData] = useState<Announcement['bids']>([]);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const isOrderViewForMaster = session?.user?.role === 'MASTER' && viewMode === 'order';

  const fetchAnnouncement = async () => {
    setLoading(true);
    try {
      // Fetch announcement details (now includes user's specific bids if any, or all if owner)
      const response = await fetch(`/api/announcements/${params.id}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Ошибка при загрузке объявления');
      }
      const data = await response.json();
      console.log('Fetched announcement data for details page:', data);
      setAnnouncement(data);

      // Fetch all bids separately for min/max calculations and for intermediary view
      const allBidsResponse = await fetch(`/api/bids?announcementId=${params.id}`, { cache: 'no-store' });
      if (allBidsResponse.ok) {
        const allBidsData = await allBidsResponse.json();
        setBidsData(allBidsData);
      } else {
        console.error("Failed to fetch all bids");
        setBidsData(data.bids || []); // Fallback to bids from announcement if any
      }

    } catch (err) {
      setError('Не удалось загрузить объявление');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (status === 'authenticated' || status === 'unauthenticated') {
        fetchAnnouncement();
    }

    const handleMessage = (event: any) => {
      if (event.data?.type === 'NEW_BID' || event.data?.type === 'BID_DELETED') {
        fetchAnnouncement();
      }
    };
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    return () => {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, status]); // Re-fetch if session status changes

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
      fetchAnnouncement(); // Refresh data
    } catch (err: any) {
      alert(err.message);
    } finally {
      setAssigningBidId(null);
    }
  };
  
  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Вы уверены, что хотите отменить назначение мастера? Это действие также отменит заказ.')) return;
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderId, status: 'CANCELLED' })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Ошибка отмены заказа');
      }
      setPublicState(null);
      fetchAnnouncement(); // Refresh data
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Ошибка отмены заказа');
    }
  };


  if (loading || status === 'loading') {
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
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Объявление не найдено.</p></div>;
  }
  
  const myBid = session?.user?.id ? bidsData.find(b => b.user.id === session.user.id) : undefined;
  const minPrice = bidsData.length > 0 ? Math.min(...bidsData.map(b => b.price)) : Infinity;


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
                href={isOrderViewForMaster ? "/orders" : "/"} // Возврат на страницу заказов если пришли оттуда
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                {isOrderViewForMaster ? "← Назад к заказам" : "← Назад к списку"}
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
            {publicState ? (
              <div className="flex items-center justify-between bg-green-100 p-4 rounded-lg">
                <span className="text-green-800 font-medium">
                  Исполнитель назначен: {publicState.name}
                </span>
                <button 
                  onClick={() => handleDeleteOrder(publicState.orderId)} 
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


        {/* Блок для мастера: информация о его ставке или форма для ставки - НЕ ПОКАЗЫВАЕМ ЕСЛИ ПРОСМОТР ЗАКАЗА */}
        {session?.user?.role === 'MASTER' && !isOrderViewForMaster && (
          <div className="mt-6 px-4 sm:px-0">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Ваша ставка</h2>
            <div className="bg-white shadow-lg rounded-lg p-6">
              {bidsData.length > 0 && (
                <div className="mb-4 text-sm text-gray-700">
                  Минимальная текущая ставка: <span className="font-semibold">{minPrice} ₽</span>
                </div>
              )}
              {bidsData.length === 0 && (
                 <div className="mb-4 text-sm text-gray-700">Ставок пока нет.</div>
              )}

              {myBid ? (
                <p className="text-gray-700 font-semibold mb-3">
                  Вы указали {myBid.price} ₽.
                </p>
              ) : (
                <p className="text-gray-600 mb-3">Вы еще не указали цену для этого объявления.</p>
              )}
              
              <BidForm 
                announcementId={params.id} 
                initialPrice={myBid?.price} // Передаем initialPrice
                bidId={myBid?.id} // Передаем bidId
                onSuccess={() => { // Переименовываем onBidSubmitted в onSuccess для соответствия BidForm
                  fetchAnnouncement(); 
                  setIsEditingBid(false); 
                }}
                // isEditing и setIsEditing управляются внутри BidForm, если не переданы как props для сброса внешнего состояния
              />
            </div>
          </div>
        )}

        <div className={`mt-8 bg-white shadow-lg rounded-lg overflow-hidden ${session?.user?.id === announcement?.user.id ? 'pt-0' : 'pt-6' }`}>
          <div className="px-4 py-5 sm:px-6">
            <div className="flex flex-col md:flex-row">
              <div className="md:w-1/2 pr-0 md:pr-8 mb-4 md:mb-0">
                {announcement.imageUrl && (
                  <div className="relative aspect-w-16 aspect-h-9 mb-6 rounded-lg overflow-hidden shadow-md cursor-pointer" onClick={() => setIsImageModalOpen(true)}>
                    <img
                      src={announcement.imageUrl}
                      alt={announcement.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                )}
                {/* Информация о клиенте - отображается всегда, если есть */} 
                <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Данные клиента</h3>
                    <p className="text-sm text-gray-600">Имя: {announcement.clientName}</p>
                    <p className="text-sm text-gray-600">Телефон: {announcement.clientPhone}</p>
                </div>
              </div>

              <div className="md:w-1/2">
                <div className="border-t border-gray-200 px-0 py-5 sm:px-0">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">
                        Описание
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
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
                    {session?.user?.role === 'ADMIN' && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">
                          Автор объявления
                        </dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {announcement.user.firstName} {announcement.user.lastName}
                        </dd>
                      </div>
                    )}
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
          </div>
        </div>
        
        {isImageModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={() => setIsImageModalOpen(false)}>
            <div className="relative max-w-3xl max-h-[80vh]" onClick={(e) => e.stopPropagation()}> 
              <img src={announcement.imageUrl} alt={announcement.title} className="max-w-full max-h-full object-contain rounded-lg" />
              <button 
                onClick={() => setIsImageModalOpen(false)} 
                className="absolute top-2 right-2 text-white bg-gray-800 bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
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

export default function AnnouncementPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Загрузка...</p></div>}> 
      <AnnouncementPageComponent params={params} />
    </Suspense>
  );
} 