import webpush from 'web-push';
import { getSetting, setSetting } from '../db/repo';
import path from 'path';
import fs from 'fs';

const VAPID_FILE = path.join(process.cwd(), 'data', 'vapid.json');

export function initVapid() {
  let publicKey = process.env.VAPID_PUBLIC_KEY;
  let privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

  // Try loading from DB first
  if (!publicKey) {
    publicKey = getSetting('vapid_public_key');
    privateKey = getSetting('vapid_private_key');
  }

  // Then try file
  if (!publicKey && fs.existsSync(VAPID_FILE)) {
    const data = JSON.parse(fs.readFileSync(VAPID_FILE, 'utf-8'));
    publicKey = data.publicKey;
    privateKey = data.privateKey;
  }

  // Generate if missing
  if (!publicKey || !privateKey) {
    console.log('Generating new VAPID keys...');
    const keys = webpush.generateVAPIDKeys();
    publicKey = keys.publicKey;
    privateKey = keys.privateKey;

    // Save to DB
    setSetting('vapid_public_key', publicKey);
    setSetting('vapid_private_key', privateKey);

    // Save to file as backup (optional, but good for restart persistence if DB wiped)
    fs.writeFileSync(VAPID_FILE, JSON.stringify(keys, null, 2));
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  return { publicKey, privateKey };
}

export function getVapidPublicKey() {
  const { publicKey } = initVapid();
  return publicKey;
}
