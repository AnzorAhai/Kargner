'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaHome, FaPlus, FaClipboardList, FaUser } from 'react-icons/fa';

interface NavigationProps {
  role: 'MASTER' | 'INTERMEDIARY' | null;
}

export default function Navigation({ role }: NavigationProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around items-center h-16">
        <Link 
          href="/" 
          className={`flex flex-col items-center ${pathname === '/' ? 'text-blue-600' : 'text-gray-600'}`}
        >
          <FaHome className="text-xl" />
          <span className="text-xs mt-1">Главная</span>
        </Link>

        <Link 
          href="/orders" 
          className={`flex flex-col items-center ${pathname === '/orders' ? 'text-blue-600' : 'text-gray-600'}`}
        >
          <FaClipboardList className="text-xl" />
          <span className="text-xs mt-1">Заказы</span>
        </Link>

        <Link 
          href="/profile" 
          className={`flex flex-col items-center ${pathname === '/profile' ? 'text-blue-600' : 'text-gray-600'}`}
        >
          <FaUser className="text-xl" />
          <span className="text-xs mt-1">Профиль</span>
        </Link>
      </div>
    </nav>
  );
} 