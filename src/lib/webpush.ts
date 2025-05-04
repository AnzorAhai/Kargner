import webpush from 'web-push';

// Configure VAPID keys for web-push
const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (!publicKey || !privateKey) {
  throw new Error('VAPID keys are not defined in environment variables');
}

webpush.setVapidDetails(
  'mailto:info@example.com',
  publicKey,
  privateKey
);

export default webpush; 