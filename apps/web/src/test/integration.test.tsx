/**
 * Frontend Integration Tests
 * Tests API interactions with MSW mocks
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';

// Use MSW for API mocking - don't override global.fetch

describe('API Integration Tests', () => {
    describe('Issues API', () => {
        it('should fetch and display issues', async () => {
            const mockIssues = [
                { id: 'issue_1', title: 'Test Issue 1', severity: 'high' },
                { id: 'issue_2', title: 'Test Issue 2', severity: 'low' },
            ];

            // Override MSW handler for this test
            server.use(
                http.get('http://localhost:3000/issues', () => {
                    return HttpResponse.json({ items: mockIssues, total: 2 });
                })
            );

            const IssuesList = () => {
                const [issues, setIssues] = React.useState<typeof mockIssues>([]);
                const [loading, setLoading] = React.useState(true);

                React.useEffect(() => {
                    fetch('http://localhost:3000/issues')
                        .then(res => res.json())
                        .then(data => {
                            setIssues(data.items);
                            setLoading(false);
                        });
                }, []);

                if (loading) return <div data-testid="loading">Loading...</div>;

                return (
                    <ul data-testid="issues-list">
                        {issues.map(issue => (
                            <li key={issue.id}>{issue.title}</li>
                        ))}
                    </ul>
                );
            };

            render(<IssuesList />);

            await waitFor(() => {
                expect(screen.getByTestId('issues-list')).toBeInTheDocument();
            });

            expect(screen.getByText('Test Issue 1')).toBeInTheDocument();
            expect(screen.getByText('Test Issue 2')).toBeInTheDocument();
        });

        it('should handle API errors gracefully', async () => {
            server.use(
                http.get('http://localhost:3000/issues', () => {
                    return HttpResponse.json({ error: 'Internal server error' }, { status: 500 });
                })
            );

            const ErrorComponent = () => {
                const [error, setError] = React.useState<string | null>(null);

                React.useEffect(() => {
                    fetch('http://localhost:3000/issues')
                        .then(res => {
                            if (!res.ok) throw new Error('Failed to fetch');
                            return res.json();
                        })
                        .catch(err => setError(err.message));
                }, []);

                if (error) return <div role="alert">{error}</div>;
                return <div>Loading...</div>;
            };

            render(<ErrorComponent />);

            await waitFor(() => {
                expect(screen.getByRole('alert')).toHaveTextContent('Failed to fetch');
            });
        });
    });

    describe('Export Functionality', () => {
        it('should trigger export and show progress', async () => {
            server.use(
                http.post('http://localhost:3000/exports', () => {
                    return HttpResponse.json({ id: 'export_1', status: 'pending' });
                })
            );

            const ExportButton = () => {
                const [status, setStatus] = React.useState<string | null>(null);

                const handleExport = async () => {
                    setStatus('starting');
                    const res = await fetch('http://localhost:3000/exports', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'issues', format: 'csv' }),
                    });
                    const data = await res.json();
                    setStatus(data.status);
                };

                return (
                    <div>
                        <button onClick={handleExport} data-testid="export-btn">
                            Export CSV
                        </button>
                        {status && <span data-testid="status">{status}</span>}
                    </div>
                );
            };

            render(<ExportButton />);

            await userEvent.click(screen.getByTestId('export-btn'));

            await waitFor(() => {
                expect(screen.getByTestId('status')).toHaveTextContent('pending');
            });
        });
    });

    describe('Authentication Flow', () => {
        it('should handle login submission', async () => {
            server.use(
                http.post('http://localhost:3000/auth/login', () => {
                    return HttpResponse.json({ token: 'jwt_token', user: { id: 'user_1' } });
                })
            );

            const LoginForm = ({ onSuccess }: { onSuccess: () => void }) => {
                const [email, setEmail] = React.useState('');
                const [password, setPassword] = React.useState('');

                const handleSubmit = async (e: React.FormEvent) => {
                    e.preventDefault();
                    const res = await fetch('http://localhost:3000/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password }),
                    });
                    if (res.ok) onSuccess();
                };

                return (
                    <form onSubmit={handleSubmit}>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            data-testid="email-input"
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            data-testid="password-input"
                        />
                        <button type="submit">Login</button>
                    </form>
                );
            };

            const onSuccess = vi.fn();
            render(<LoginForm onSuccess={onSuccess} />);

            await userEvent.type(screen.getByTestId('email-input'), 'test@example.com');
            await userEvent.type(screen.getByTestId('password-input'), 'password123');
            await userEvent.click(screen.getByRole('button', { name: 'Login' }));

            await waitFor(() => {
                expect(onSuccess).toHaveBeenCalled();
            });
        });

        it('should show error on failed login', async () => {
            server.use(
                http.post('http://localhost:3000/auth/login', () => {
                    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
                })
            );

            const LoginForm = () => {
                const [error, setError] = React.useState<string | null>(null);

                const handleSubmit = async (e: React.FormEvent) => {
                    e.preventDefault();
                    const res = await fetch('http://localhost:3000/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: 'test@example.com', password: 'wrong' }),
                    });
                    if (!res.ok) {
                        const data = await res.json();
                        setError(data.error);
                    }
                };

                return (
                    <form onSubmit={handleSubmit}>
                        <button type="submit">Login</button>
                        {error && <div role="alert">{error}</div>}
                    </form>
                );
            };

            render(<LoginForm />);
            await userEvent.click(screen.getByRole('button', { name: 'Login' }));

            await waitFor(() => {
                expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials');
            });
        });
    });

    describe('Upload Flow', () => {
        it('should handle file upload initiation', async () => {
            server.use(
                http.post('http://localhost:3000/uploads/pdf/start', () => {
                    return HttpResponse.json({
                        uploadId: 'upload_1',
                        presignedUrl: 'https://storage.example.com/upload',
                    });
                })
            );

            const FileUploader = () => {
                const [uploadId, setUploadId] = React.useState<string | null>(null);

                const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const res = await fetch('http://localhost:3000/uploads/pdf/start', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fileName: file.name }),
                    });
                    const data = await res.json();
                    setUploadId(data.uploadId);
                };

                return (
                    <div>
                        <input
                            type="file"
                            onChange={handleFileSelect}
                            data-testid="file-input"
                        />
                        {uploadId && <span data-testid="upload-id">{uploadId}</span>}
                    </div>
                );
            };

            render(<FileUploader />);

            const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
            const input = screen.getByTestId('file-input');

            await userEvent.upload(input, file);

            await waitFor(() => {
                expect(screen.getByTestId('upload-id')).toHaveTextContent('upload_1');
            });
        });
    });
});

describe('State Management', () => {
    describe('Optimistic Updates', () => {
        it('should update UI optimistically then confirm', async () => {
            server.use(
                http.patch('http://localhost:3000/issues/issue_1', () => {
                    return HttpResponse.json({ id: 'issue_1', status: 'resolved' });
                })
            );

            const IssueCard = () => {
                const [status, setStatus] = React.useState('open');
                const [isUpdating, setIsUpdating] = React.useState(false);

                const handleResolve = async () => {
                    const previousStatus = status;
                    setStatus('resolved'); // Optimistic update
                    setIsUpdating(true);

                    try {
                        await fetch('http://localhost:3000/issues/issue_1', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ status: 'resolved' }),
                        });
                    } catch {
                        setStatus(previousStatus); // Rollback on error
                    } finally {
                        setIsUpdating(false);
                    }
                };

                return (
                    <div>
                        <span data-testid="status">{status}</span>
                        <button onClick={handleResolve} disabled={isUpdating}>
                            Resolve
                        </button>
                    </div>
                );
            };

            render(<IssueCard />);

            expect(screen.getByTestId('status')).toHaveTextContent('open');

            await userEvent.click(screen.getByRole('button', { name: 'Resolve' }));

            // Should update immediately (optimistic)
            expect(screen.getByTestId('status')).toHaveTextContent('resolved');
        });
    });

    describe('Pagination', () => {
        it('should load next page of data', async () => {
            let callCount = 0;
            server.use(
                http.get('http://localhost:3000/items', ({ request }) => {
                    const url = new URL(request.url);
                    const page = url.searchParams.get('page') || '1';

                    if (page === '1') {
                        return HttpResponse.json({ items: [{ id: '1' }], total: 2, page: 1 });
                    } else {
                        return HttpResponse.json({ items: [{ id: '2' }], total: 2, page: 2 });
                    }
                })
            );

            const PaginatedList = () => {
                const [items, setItems] = React.useState<{ id: string }[]>([]);
                const [page, setPage] = React.useState(1);

                const loadPage = async (pageNum: number) => {
                    const res = await fetch(`http://localhost:3000/items?page=${pageNum}`);
                    const data = await res.json();
                    setItems(prev => [...prev, ...data.items]);
                    setPage(data.page);
                };

                React.useEffect(() => {
                    loadPage(1);
                }, []);

                return (
                    <div>
                        <ul>
                            {items.map(item => (
                                <li key={item.id} data-testid={`item-${item.id}`}>
                                    Item {item.id}
                                </li>
                            ))}
                        </ul>
                        <button onClick={() => loadPage(page + 1)}>Load More</button>
                    </div>
                );
            };

            render(<PaginatedList />);

            await waitFor(() => {
                expect(screen.getByTestId('item-1')).toBeInTheDocument();
            });

            await userEvent.click(screen.getByRole('button', { name: 'Load More' }));

            await waitFor(() => {
                expect(screen.getByTestId('item-2')).toBeInTheDocument();
            });
        });
    });
});
