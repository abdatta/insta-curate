import { useState, useEffect, useCallback } from 'preact/hooks';
import { api } from '../services/api';
import { urlBase64ToUint8Array } from '../utils/formatting';

export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');

  const checkSubscription = useCallback(async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setLoading(false);
        return;
      }

      setPermissionState(Notification.permission);

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      setIsSubscribed(!!subscription);
    } catch (e) {
      console.error('Error checking subscription', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  const subscribe = async () => {
    try {
      setLoading(true);
      
      // Request permission if needed
      if (Notification.permission === 'default') {
        const result = await Notification.requestPermission();
        setPermissionState(result);
        if (result !== 'granted') {
          throw new Error('Permission denied');
        }
      } else if (Notification.permission === 'denied') {
        throw new Error('Permission blocked');
      }

      const vapidKey = await api.getVapidKey();
      const convertedKey = urlBase64ToUint8Array(vapidKey);

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });

      // Send to server
      await api.subscribe(subscription.toJSON());
      
      setIsSubscribed(true);
      console.log('Subscribed successfully');
    } catch (e) {
      console.error('Failed to subscribe', e);
      alert('Failed to enable notifications. check console.');
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
      // NOTE: We don't implement full unsubscribe from backend here for simplicity,
      // as the backend handles 410 Gone automatically. We just unsubscribe locally.
      try {
          setLoading(true);
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
              await subscription.unsubscribe();
              setIsSubscribed(false);
          }
      } catch (e) {
          console.error('Failed to unsubscribe', e);
      } finally {
          setLoading(false);
      }
  };

  return { isSubscribed, subscribe, unsubscribe, loading, permissionState };
}
