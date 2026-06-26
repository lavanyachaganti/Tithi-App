import { test, expect } from '@playwright/test';

const baseUrl = 'http://127.0.0.1:5173';

async function registerMockedApiRoutes(page) {
  await page.route('**/api/**', async (route) => {
    const requestUrl = new URL(route.request().url());
    const pathname = requestUrl.pathname;
    const handledEndpoints = [
      '/api/login',
      '/api/register',
      '/api/me',
      '/api/notifications',
      '/api/tithi',
      '/api/panchang/refresh',
      '/api/varjyam/notification',
      '/api/admin/users',
    ];

    if (handledEndpoints.includes(pathname)) {
      await route.continue();
      return;
    }

    throw new Error(`Unmocked API endpoint: ${pathname}`);
  });

  await page.route('**/api/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'mock-token',
        user: {
          name: 'Test User',
          email: 'demo@example.com',
          role: 'user',
          createdAt: '2026-01-01T00:00:00.000Z',
          lastLogin: '2026-06-25T00:00:00.000Z',
        },
      }),
    });
  });

  await page.route('**/api/register', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'mock-token',
        user: {
          name: 'Test User',
          email: 'demo@example.com',
          role: 'user',
          createdAt: '2026-01-01T00:00:00.000Z',
          lastLogin: '2026-06-25T00:00:00.000Z',
        },
      }),
    });
  });

  await page.route('**/api/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          name: 'Test User',
          email: 'demo@example.com',
          role: 'user',
          createdAt: '2026-01-01T00:00:00.000Z',
          lastLogin: '2026-06-25T00:00:00.000Z',
        },
      }),
    });
  });

  await page.route('**/api/notifications', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/tithi**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        tithi: 'Ekadashi',
        startTime: '2026-06-25T10:00:00+05:30',
        endTime: '2026-06-25T11:00:00+05:30',
      }),
    });
  });

  await page.route('**/api/panchang/refresh**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        tithi: { name: 'Ekadashi' },
        varjyam: [{ start: '2026-06-25T10:00:00+05:30', end: '2026-06-25T11:00:00+05:30' }],
      }),
    });
  });

  await page.route('**/api/varjyam/notification**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        varjyam: [{ start: '2026-06-25T10:00:00+05:30', end: '2026-06-25T11:00:00+05:30' }],
      }),
    });
  });

  await page.route('**/api/admin/users**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });
}

async function loginWithMockedResponses(page) {
  await page.goto(baseUrl);

  await page.locator('.guest-actions .primary-button').click();
  await expect(page.locator('.auth-modal-card')).toBeVisible();

  await page.getByPlaceholder('you@example.com').fill('demo@example.com');
  await page.getByPlaceholder('Enter your password').fill('Password123');
  await page.locator('.auth-submit-button').click();

  await expect(page.getByRole('button', { name: 'Test User' })).toBeVisible();
}

test('Open Tithi App', async ({ page }) => {
  await page.goto(baseUrl);
  await expect(page).toHaveURL(`${baseUrl}/`);
});

test('logs in successfully with mocked backend responses', async ({ page }) => {
  let loginRequestCount = 0;

  await registerMockedApiRoutes(page);

  await page.route('**/api/login', async (route) => {
    loginRequestCount += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'mock-token',
        user: {
          name: 'Test User',
          email: 'demo@example.com',
          role: 'user',
          createdAt: '2026-01-01T00:00:00.000Z',
          lastLogin: '2026-06-25T00:00:00.000Z',
        },
      }),
    });
  });

  await loginWithMockedResponses(page);

  expect(loginRequestCount).toBe(1);
});

test('shows mocked Tithi details after login', async ({ page }) => {
  await registerMockedApiRoutes(page);
  await loginWithMockedResponses(page);

  await expect(page.locator('.small-card.tithi-card')).toBeVisible();
  await expect(page.locator('.tithi-name')).toHaveText('Ekadashi');
  await expect(page.locator('.tithi-time-value').first()).toContainText('10:00');
  await expect(page.locator('.tithi-time-value').nth(1)).toContainText('11:00');
});