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
      const registerAndSubscribe = async () => {
        try {
          // Register the service worker
          await navigator.serviceWorker.register('/service-worker.js');
          console.log('[PushSubscribe] Service worker registration initiated');

          // Wait for the service worker to be active and controlling the page
          const swReg = await navigator.serviceWorker.ready;
          console.log('[PushSubscribe] Service worker ready', swReg);

          // Get existing subscription or subscribe anew
          const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
          const convertedKey = urlBase64ToUint8Array(publicKey);
          const existingSub = await swReg.pushManager.getSubscription();
          const subscription = existingSub || await swReg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedKey,
          });

          // Send subscription details to the server
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subscription),
          });
          console.log('[PushSubscribe] Push subscription sent to server');
        } catch (err) {
          console.error('[PushSubscribe] Failed to register SW or subscribe to push', err);
        }
      };

      // Request permission then register and subscribe
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            registerAndSubscribe();
          }
        });
      } else if (Notification.permission === 'granted') {
        registerAndSubscribe();
      }
    }
  }, []);

  return null;
} 