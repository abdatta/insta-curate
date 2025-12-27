export function timeAgo(timestamp: string | number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // Less than a week
  if (seconds < 604800) {
    if (seconds < 60) return "just now";
    const minutes = seconds / 60;
    if (minutes < 60) return Math.floor(minutes) + "m ago";
    const hours = minutes / 60;
    if (hours < 24) return Math.floor(hours) + "h ago";
    const days = hours / 24;
    return Math.floor(days) + "d ago";
  }

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  if (year === now.getFullYear()) {
    return `${month} ${day}`;
  } else {
    return `${month} ${day}, ${year}`;
  }
}

export function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function urlBase64ToUint8Array(base64String: string) {
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
