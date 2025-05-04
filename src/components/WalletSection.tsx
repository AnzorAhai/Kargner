import React from 'react';
import { FaWallet } from 'react-icons/fa';

interface WalletSectionProps {
  balance: number;
}

export default function WalletSection({ balance }: WalletSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 flex items-center">
        <FaWallet className="mr-2 text-gray-700" />Кошелёк
      </h2>
      <div className="text-2xl font-bold text-gray-900 mb-4">
        {balance.toLocaleString('ru-RU')} ₽
      </div>
      <div className="flex space-x-4">
        <button className="flex-1 py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700">
          Пополнить
        </button>
        <button className="flex-1 py-2 px-4 bg-red-600 text-white rounded hover:bg-red-700">
          Вывести
        </button>
      </div>
    </div>
  );
} 