// playwright.config.js
// El recorrido completo en un navegador real (spec, sección 18). Corre aparte de
// `npm test`: `npm run test:e2e`. Levanta el servidor estático de tests/manual/servir.js
// en el puerto 8089 y usa Chromium con micrófono falso para probar el grabador.
import { defineConfig, devices } from '@playwright/test';

const PUERTO = 8089;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 180_000,
  expect: { timeout: 10_000 },
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    locale: 'es-CO',
    permissions: ['microphone'],
    launchOptions: {
      args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
    },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1400, height: 900 } } }],
  webServer: {
    command: `node tests/manual/servir.js ${PUERTO}`,
    url: `http://localhost:${PUERTO}/plataforma/`,
    reuseExistingServer: true,
    timeout: 20_000,
  },
});
