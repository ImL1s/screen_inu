import os from 'os';
import path from 'path';
import { spawn, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Track the `tauri-driver` child process
let tauriDriver;

// Determine the correct binary name based on platform
const getBinaryPath = () => {
    const basePath = path.resolve(__dirname, '../src-tauri/target/debug');
    if (process.platform === 'win32') {
        return path.join(basePath, 'screen-inu.exe');
    } else if (process.platform === 'darwin') {
        return path.join(basePath, 'bundle/macos/Screen Inu.app/Contents/MacOS/Screen Inu');
    } else {
        return path.join(basePath, 'screen-inu');
    }
};

export const config = {
    // Connection settings for tauri-driver
    hostname: '127.0.0.1',
    port: 4444,
    path: '/',

    specs: ['./specs/**/*.js'],
    maxInstances: 1,
    capabilities: [
        {
            maxInstances: 1,
            browserName: 'edge', // Required by WDIO, ignored by Tauri
            'tauri:options': {
                application: getBinaryPath(),
            },
        },
    ],
    reporters: ['spec'],
    framework: 'mocha',
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000,
    },

    // Ensure the Rust project is built before running tests
    onPrepare: () => {
        console.log('🔨 Building Tauri app for E2E tests (DEBUG)...');
        // Run specific tauri build command to ensure assets are bundled correctly
        const result = spawnSync('npm', ['run', 'tauri', '--', 'build', '--debug', '--no-bundle'], {
            cwd: path.resolve(__dirname, '..'),
            stdio: 'inherit',
            shell: true,
        });
        if (result.status !== 0) {
            throw new Error('Failed to build Tauri app');
        }
    },

    // Start `tauri-driver` before each session
    beforeSession: () => {
        const tauriDriverPath = process.platform === 'win32'
            ? path.resolve(os.homedir(), '.cargo', 'bin', 'tauri-driver.exe')
            : path.resolve(os.homedir(), '.cargo', 'bin', 'tauri-driver');

        console.log('🚀 Starting tauri-driver...');
        const args = [];
        if (process.platform === 'win32') {
            const driverPath = path.resolve(__dirname, '../../msedgedriver.exe');
            args.push('--native-driver', driverPath);
        }

        tauriDriver = spawn(tauriDriverPath, args, {
            stdio: [null, process.stdout, process.stderr],
        });

        // Give tauri-driver time to start
        return new Promise((resolve) => setTimeout(resolve, 2000));
    },

    // Clean up the `tauri-driver` process after each session
    afterSession: () => {
        console.log('🧹 Stopping tauri-driver...');
        if (tauriDriver) {
            tauriDriver.kill();
        }
    },
};
