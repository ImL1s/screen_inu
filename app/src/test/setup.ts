import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock Tauri APIs for frontend testing
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/webviewWindow', () => ({
    getCurrentWebviewWindow: vi.fn(() => ({
        hide: vi.fn(),
        show: vi.fn(),
        setFullscreen: vi.fn(),
        setFocus: vi.fn(),
    })),
}));

vi.mock('@tauri-apps/plugin-global-shortcut', () => ({
    register: vi.fn(),
    unregister: vi.fn(),
}));

// Mock fetch for translation API tests
vi.stubGlobal('fetch', vi.fn());
