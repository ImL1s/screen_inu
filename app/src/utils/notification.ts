/**
 * Notification utility for Screen Inu
 * Provides system notifications and audio feedback
 */

/**
 * Play a subtle success sound
 */
export function playSuccessSound(): void {
    // Use Web Audio API for a subtle beep
    try {
        const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800; // Hz
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
        console.warn('Audio playback failed:', e);
    }
}

/**
 * Show a system notification
 */
export async function showNotification(title: string, body: string): Promise<void> {
    try {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                new Notification(title, { body, icon: '/icons/32x32.png' });
            } else if (Notification.permission !== 'denied') {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    new Notification(title, { body, icon: '/icons/32x32.png' });
                }
            }
        }
    } catch (e) {
        console.warn('Notification failed:', e);
    }
}

/**
 * Combined notification: sound + system notification
 */
export function notifyOcrComplete(textLength: number): void {
    playSuccessSound();

    if (textLength > 0) {
        showNotification('OCR Complete', `Recognized ${textLength} characters`);
    }
}
