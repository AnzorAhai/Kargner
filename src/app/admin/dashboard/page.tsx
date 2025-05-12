'use client';

import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return <div className="p-8 text-center">Загрузка данных пользователя...</div>;
  }

  if (status === 'unauthenticated' || (session && session.user.role !== 'ADMIN')) {
    router.replace('/login'); // Или на главную, или на страницу ошибки доступа
    return <div className="p-8 text-center">Доступ запрещен. Перенаправление...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Панель администратора</h1>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="ml-4 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Выйти
          </button>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Добро пожаловать, Администратор!</h2>
                <p className="text-gray-600">
                  Это основная страница панели администратора. Здесь будут размещены инструменты для управления пользователями, объявлениями, заказами и другими аспектами системы.
                </p>
                {/* Сюда можно будет добавлять ссылки на другие разделы админки */}
                <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {/* Пример карточки-ссылки */}
                    <LinkBlock title="Управление пользователями" href="/admin/users" description="Просмотр и редактирование пользователей" />
                    <LinkBlock title="Управление объявлениями" href="/admin/announcements" description="Модерация и управление объявлениями" />
                    <LinkBlock title="Управление заказами" href="/admin/orders" description="Просмотр и управление заказами" />
                    {/* Можно добавить еще карточки по мере необходимости */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

interface LinkBlockProps {
  title: string;
  href: string;
  description: string;
}

function LinkBlock({ title, href, description }: LinkBlockProps) {
  const router = useRouter();
  return (
    <div 
        onClick={() => router.push(href)} 
        className="bg-gray-50 hover:bg-gray-100 p-6 rounded-lg shadow cursor-pointer transition-all duration-200 ease-in-out transform hover:scale-105"
    >
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
} 