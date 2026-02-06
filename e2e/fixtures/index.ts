// Re-export everything from auth fixtures
export * from './auth';

// Also export Playwright's base test and expect for simpler imports
import { test as baseTest, expect as baseExpect } from '@playwright/test';

export { baseTest, baseExpect };
