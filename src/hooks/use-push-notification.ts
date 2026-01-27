import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function usePushNotification() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check if push notifications are supported
    setIsSupported(
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }, []);

  useEffect(() => {
    if (!user || !isSupported) return;

    // Check existing subscription
    checkSubscription();
  }, [user, isSupported]);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      toast.error('A böngésző nem támogatja az értesítéseket');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  const subscribe = async (): Promise<boolean> => {
    if (!user) {
      toast.error('Be kell jelentkezned');
      return false;
    }

    setIsLoading(true);
    try {
      // Request permission
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        toast.error('Az értesítési engedély megtagadva');
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from environment
      const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      
      if (!publicKey) {
        console.error('VAPID_PUBLIC_KEY not found in environment variables');
        console.log('Available env vars:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')));
        toast.error('VAPID kulcs nincs beállítva. Ellenőrizd a .env fájlt és indítsd újra a dev szervert.');
        return false;
      }

      console.log('VAPID Public Key found:', publicKey.substring(0, 20) + '...');

      // Subscribe to push
      let applicationServerKey: Uint8Array;
      try {
        applicationServerKey = urlBase64ToUint8Array(publicKey);
        console.log('Application server key converted successfully');
      } catch (keyError: any) {
        console.error('Error converting VAPID key:', keyError);
        toast.error('Hiba a VAPID kulcs feldolgozása során. Ellenőrizd a kulcs formátumát.');
        return false;
      }

      let subscription: PushSubscription;
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey
        });
        console.log('Push subscription created:', subscription.endpoint.substring(0, 50) + '...');
      } catch (subscribeError: any) {
        console.error('Push subscription error:', subscribeError);
        // Push notifications nem működnek localhost-on HTTPS nélkül (kivéve ha service worker van)
        if (subscribeError.name === 'AbortError' || subscribeError.message?.includes('push service error')) {
          toast.error('Push értesítések csak HTTPS-en vagy localhost-on működnek. Production környezetben próbáld meg.');
        } else {
          toast.error('Hiba a push subscription létrehozása során: ' + (subscribeError.message || 'Ismeretlen hiba'));
        }
        return false;
      }

      // Save subscription to database
      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(subscription.getKey('auth')!)
        }
      };

      const { error: saveError } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionData.endpoint,
          p256dh: subscriptionData.keys.p256dh,
          auth: subscriptionData.keys.auth
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (saveError) throw saveError;

      setIsSubscribed(true);
      toast.success('Push értesítések engedélyezve!');
      return true;
    } catch (error: any) {
      console.error('Error subscribing to push:', error);
      toast.error('Hiba az értesítések engedélyezése során: ' + (error.message || 'Ismeretlen hiba'));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    if (!user) return false;

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Remove from database
        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);

        if (error) throw error;

        setIsSubscribed(false);
        toast.success('Push értesítések kikapcsolva');
        return true;
      }
    } catch (error: any) {
      console.error('Error unsubscribing from push:', error);
      toast.error('Hiba az értesítések kikapcsolása során');
      return false;
    } finally {
      setIsLoading(false);
    }
    return false;
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    requestPermission
  };
}

// Helper functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}
