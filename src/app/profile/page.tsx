'use client';

import React, { useEffect, useState } from 'react';
import ProfileCard from '@/components/ProfileCard';
import EditProfileForm from '@/components/EditProfileForm';
import WalletSection from '@/components/WalletSection';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  bio?: string;
  avatarUrl?: string;
  phone: string;
  email?: string;
  role: 'MASTER' | 'INTERMEDIARY' | 'ADMIN';
  rating: number;
  ratingCount: number;
  portfolio?: string[];
  balance: number;
}

export default function ProfilePage() {
  const { data: session, status, update: updateSession } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (status === 'loading') return;
      if (status === 'unauthenticated') {
        router.push('/login');
        return;
      }
      try {
        const userId = session?.user.id;
        console.log('Fetching user profile for ID:', userId);
        
        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();
        
        if (!response.ok) {
          console.error('Error response:', data);
          throw new Error(data.error || 'Ошибка при загрузке профиля');
        }
        
        console.log('User data received:', data);
        setUser(data);
      } catch (err) {
        console.error('Error in fetchUserProfile:', err);
        setError(err instanceof Error ? err.message : 'Не удалось загрузить профиль');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [status, session, router]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async (data: {
    firstName: string;
    lastName: string;
    bio?: string;
    email?: string;
  }) => {
    try {
      const userId = session?.user.id;
      if (!userId) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Ошибка при обновлении профиля');

      const updatedUser = await response.json();
      setUser(updatedUser);
      setIsEditing(false);
    } catch (err) {
      setError('Не удалось обновить профиль');
      console.error(err);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleMakeMeAdmin = async () => {
    if (!session?.user?.id) {
      alert('Ошибка: не удалось получить ID пользователя из сессии.');
      return;
    }
    if (!confirm('Вы уверены, что хотите назначить себя администратором? Это действие предназначено для первоначальной настройки.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id, role: 'ADMIN' }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Не удалось обновить роль пользователя.');
      }

      alert('Вы успешно назначены администратором! Пожалуйста, перезагрузите страницу или войдите снова, чтобы изменения вступили в силу.');
      await updateSession({ ...session, user: { ...session.user, role: 'ADMIN' } });
      setUser(prevUser => prevUser ? { ...prevUser, role: 'ADMIN' as User['role'] } : null);
      
    } catch (err: any) {
      alert(`Ошибка: ${err.message}`);
      console.error('Error making self admin:', err);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка профиля...</p>
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

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Мой профиль
          </h1>
          <button
            onClick={() => signOut()}
            className="px-3 py-1 text-sm text-red-600 hover:text-red-500"
          >
            Выйти
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <ProfileCard
            user={user}
            isEditable={true}
            onEdit={handleEdit}
          />
          <WalletSection balance={user.balance} />

          {user && user.role !== 'ADMIN' && session?.user?.id === user.id && (
            <div className="mt-6 p-4 bg-yellow-100 border border-yellow-300 rounded-md">
              <h3 className="text-lg font-semibold text-yellow-800">Временная панель администратора</h3>
              <p className="text-yellow-700 mt-1">Эта кнопка предназначена для первоначальной настройки первого администратора.</p>
              <button
                onClick={handleMakeMeAdmin}
                className="mt-3 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                Сделать меня администратором
              </button>
              <p className="text-xs text-yellow-600 mt-2">После использования, пожалуйста, попросите разработчика удалить эту кнопку.</p>
            </div>
          )}
        </div>
      </main>

      {isEditing && (
        <EditProfileForm
          user={{
            firstName: user.firstName,
            lastName: user.lastName,
            bio: user.bio,
            email: user.email,
          }}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
} 