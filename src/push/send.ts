import webpush from 'web-push';
import { deleteSubscription, getSubscriptions } from '../db/repo';

// initVapid(); // Removed top-level call to avoid early DB access

export async function sendPushNotification(payload: {
  title: string;
  body: string;
  url?: string;
}) {
  const subscriptions = getSubscriptions(); // returns array of sub objects
  console.log(`Sending push to ${subscriptions.length} subscriptions`);

  const notificationPayload = JSON.stringify(payload);

  const promises = subscriptions.map((sub) => {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    return webpush
      .sendNotification(pushSubscription, notificationPayload)
      .catch((err) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`Subscription expired/gone: ${sub.endpoint}`);
          deleteSubscription(sub.endpoint);
        } else {
          console.error(`Error sending push to ${sub.endpoint}`, err);
        }
      });
  });

  await Promise.all(promises);
}
