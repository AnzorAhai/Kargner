'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { AnnouncementCard } from '@/components/announcement-card';

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
    firstName: string;
    lastName: string;
    rating: number;
  };
  minBidPrice: number | null;
  currentUserBidPrice: number | null;
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add category filter state and compute filteredAnnouncements
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const filteredAnnouncements = selectedCategory 
    ? announcements.filter(a => a.category === selectedCategory) 
    : announcements;

  // Load saved category filter for masters
  useEffect(() => {
    if (session?.user?.role === 'MASTER') {
      const saved = localStorage.getItem('selectedCategory');
      if (saved !== null) {
        setSelectedCategory(saved);
      }
    }
  }, [session]);

  // Save category filter change for masters
  useEffect(() => {
    if (session?.user?.role === 'MASTER') {
      localStorage.setItem('selectedCategory', selectedCategory);
    }
  }, [selectedCategory, session]);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        console.log('Fetching announcements from client...');
        const response = await fetch('/api/announcements');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Ошибка при загрузке объявлений');
        }
        const data = await response.json();
        console.log('Received announcements:', data);
        setAnnouncements(data);
      } catch (err) {
        console.error('Error in fetchAnnouncements:', err);
        setError(err instanceof Error ? err.message : 'Не удалось загрузить объявления');
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка объявлений...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Доска объявлений
          </h1>
          {session?.user?.role === 'INTERMEDIARY' && (
            <Link
              href="/announcements/create"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Создать объявление
            </Link>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Dropdown filter for categories */}
        <div className="px-4 sm:px-0 mb-4">
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Категория</label>
          <select
            id="category"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">Все категории</option>
            <option value="Ковка">Ковка</option>
            <option value="Укладка плитки">Укладка плитки</option>
            <option value="Алмазная резка">Алмазная резка</option>
          </select>
        </div>

        <div className="px-4 py-6 sm:px-0">
          {filteredAnnouncements.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">{selectedCategory ? `Объявлений категории "${selectedCategory}" нет` : 'Объявлений пока нет'}</p>
              {session?.user?.role === 'INTERMEDIARY' && (
                <Link
                  href="/announcements/create"
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Создать объявление
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAnnouncements.map((announcement) => (
                <Link
                  key={announcement.id}
                  href={`/announcements/${announcement.id}`}
                  className="block hover:shadow-lg transition-shadow duration-200 rounded-lg"
                >
                  <AnnouncementCard announcement={announcement} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 