'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface BidFormProps {
  announcementId: string;
  initialPrice?: number;
  onSuccess?: () => void;
  bidId?: string;
}

export function BidForm({ announcementId, initialPrice, onSuccess, bidId }: BidFormProps) {
  const router = useRouter();
  const [price, setPrice] = useState(initialPrice?.toString() || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = price.trim();
    // If empty and bidId exists, delete the bid
    if (!trimmed) {
      if (bidId) {
        setLoading(true);
        try {
          const res = await fetch('/api/bids', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bidId })
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Не удалось удалить ставку');
          }
          if (onSuccess) onSuccess(); else window.location.reload();
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      } else {
      setError('Введите цену');
      }
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcementId, price: parseFloat(price) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Не удалось поставить цену');
      }
      const bidData = await res.json();
      // После успешной ставки вызываем колбэк или перезагружаем страницу
      if (onSuccess) {
        onSuccess();
      } else {
      window.location.reload();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-2">
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <input
        type="number"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="Ваша цена"
        className="w-full px-3 py-2 border rounded bg-white text-black"
      />
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Сохранение...' : 'Указать цену'}
      </button>
    </form>
  );
} 