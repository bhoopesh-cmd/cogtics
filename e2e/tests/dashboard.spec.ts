import { test, expect } from '../fixtures/auth';
import { DashboardPage } from '../pages';

test.describe('Dashboard', () => {
  test('loads dashboard with metrics', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();

    // Should show Executive Summary - use first() to avoid strict mode violation
    await expect(
      authenticatedPage.getByRole('link', { name: /Executive Summary/i }).first()
    ).toBeVisible();
  });

  test('displays navigation sidebar', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();

    // Check main nav items exist using link role for more precision
    await expect(authenticatedPage.getByRole('link', { name: /Issues & Risk/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('link', { name: /Contracts/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('link', { name: /Revenue Rec/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('link', { name: /Simulations/i })).toBeVisible();
  });

  test('navigates to issues page', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();

    await dashboard.clickNavItem('Issues & Risk');
    await expect(authenticatedPage).toHaveURL(/\/issues/);
  });

  test('navigates to contracts page', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();

    await dashboard.clickNavItem('Contracts');
    await expect(authenticatedPage).toHaveURL(/\/contracts/);
  });

  test('navigates to uploads page', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();

    await dashboard.clickNavItem('Manual Uploads');
    await expect(authenticatedPage).toHaveURL(/\/uploads/);
  });
});

test.describe('Dashboard - Role-based access', () => {
  test('admin can see all sections', async ({ adminPage }) => {
    const dashboard = new DashboardPage(adminPage);
    await dashboard.goto();

    // Admin should see settings section
    await expect(adminPage.getByText('Settings')).toBeVisible();
    await expect(adminPage.getByText('Integrations')).toBeVisible();
  });

  test('analyst has limited access', async ({ analystPage }) => {
    const dashboard = new DashboardPage(analystPage);
    await dashboard.goto();

    // Analyst should see main navigation
    await expect(analystPage.getByText('Issues & Risk')).toBeVisible();
  });
});
