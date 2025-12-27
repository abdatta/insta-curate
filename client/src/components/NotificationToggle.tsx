import { usePushNotifications } from '../hooks/usePushNotifications';
import '../styles/components/NotificationToggle.css';

export function NotificationToggle() {
    const { isSubscribed, subscribe, unsubscribe, loading, permissionState } = usePushNotifications();

    const handleClick = () => {
        if (loading) return;
        if (isSubscribed) {
            unsubscribe();
        } else {
            subscribe();
        }
    };

    if (permissionState === 'denied') {
        return (
            <button class="notif-toggle disabled" title="Notifications blocked via browser settings" disabled>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <line x1="2" y1="2" x2="22" y2="22"></line>
                </svg>
            </button>
        );
    }

    return (
        <button 
            class={`notif-toggle ${isSubscribed ? 'active' : ''}`} 
            onClick={handleClick}
            title={isSubscribed ? 'Disable Notifications' : 'Enable Notifications'}
            disabled={loading}
        >
            {isSubscribed ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
            )}
        </button>
    );
}
