"use client";
export const dynamic = 'force-dynamic';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function PaymentPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow p-6 max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Окно оплаты</h1>
        <p className="mb-2">
          Пожалуйста, обратитесь в офис "Каргнер" для проведения платежа.
        </p>
        <p className="mb-4">
          Телефон для связи: <a href="tel:+79227433512" className="text-blue-600">+7 922 743-35-12</a>
        </p>
        <button
          onClick={() => router.back()}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Назад
        </button>
      </div>
    </div>
  );
} 