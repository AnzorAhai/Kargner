'use client';

import { useEffect } from 'react';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushSubscribe() {
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then((swReg) => {
        const subscribeUser = async () => {
          try {
            const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
            const convertedKey = urlBase64ToUint8Array(publicKey);
            const subscription = await swReg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedKey,
            });
            await fetch('/api/push/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(subscription),
            });
            console.log('Push subscription sent to server');
          } catch (err) {
            console.error('Failed to subscribe to push', err);
          }
        };

        if (Notification.permission === 'default') {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              subscribeUser();
            }
          });
        } else if (Notification.permission === 'granted') {
          subscribeUser();
        }
      });
    }
  }, []);

  return null;
} 