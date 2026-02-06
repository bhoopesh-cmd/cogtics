import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/utils';
import { Sidebar } from '../Sidebar';

// Mock the useAuth hook
vi.mock('@/lib/auth/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user_01',
      name: 'Test Admin',
      email: 'admin@cogtics.dev',
      role: 'admin',
    },
    logout: vi.fn(),
  }),
}));

// Mock the API endpoint
vi.mock('@/lib/api/endpoints', () => ({
  getIssueSummary: vi.fn().mockResolvedValue({
    byStatus: {
      open: 5,
      investigating: 3,
      confirmed: 2,
    },
  }),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders navigation items', () => {
    render(<Sidebar />);

    expect(screen.getByText('Executive Summary')).toBeInTheDocument();
    expect(screen.getByText('Data Explorer')).toBeInTheDocument();
    expect(screen.getByText('Manual Uploads')).toBeInTheDocument();
    expect(screen.getByText('Issues & Risk')).toBeInTheDocument();
    expect(screen.getByText('Contracts')).toBeInTheDocument();
    expect(screen.getByText('Revenue Rec')).toBeInTheDocument();
    expect(screen.getByText('Simulations')).toBeInTheDocument();
    expect(screen.getByText('Exports & Audit')).toBeInTheDocument();
  });

  it('renders settings section', () => {
    render(<Sidebar />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Integrations')).toBeInTheDocument();
    expect(screen.getByText('Snapshots')).toBeInTheDocument();
    expect(screen.getByText('Jobs')).toBeInTheDocument();
    expect(screen.getByText('Audit Log')).toBeInTheDocument();
  });

  it('displays user information', () => {
    render(<Sidebar />);

    expect(screen.getByText('Test Admin')).toBeInTheDocument();
    expect(screen.getByText('admin@cogtics.dev')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
  });

  it('renders sign out button', () => {
    render(<Sidebar />);

    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });

  it('has correct navigation links', () => {
    render(<Sidebar />);

    const dashboardLink = screen.getByRole('link', { name: /executive summary/i });
    expect(dashboardLink).toHaveAttribute('href', '/');

    const issuesLink = screen.getByRole('link', { name: /issues & risk/i });
    expect(issuesLink).toHaveAttribute('href', '/issues');

    const contractsLink = screen.getByRole('link', { name: /contracts/i });
    expect(contractsLink).toHaveAttribute('href', '/contracts');
  });
});
