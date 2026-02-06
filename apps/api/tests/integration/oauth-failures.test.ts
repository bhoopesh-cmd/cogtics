/**
 * OAuth Failure Handling Tests (D3b)
 * Tests token expiry, revocation, and OAuth error scenarios
 */
import { describe, it, expect, vi } from 'vitest';

describe('OAuth Failure Handling', () => {
    describe('Token Expiry Detection', () => {
        it('should detect expired tokens', () => {
            interface TokenInfo {
                accessToken: string;
                expiresAt: Date;
                refreshToken?: string;
            }

            const isTokenExpired = (token: TokenInfo, bufferMs = 60000): boolean => {
                const now = new Date();
                const expiryWithBuffer = new Date(token.expiresAt.getTime() - bufferMs);
                return now >= expiryWithBuffer;
            };

            const expiredToken: TokenInfo = {
                accessToken: 'expired_token',
                expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
            };

            const validToken: TokenInfo = {
                accessToken: 'valid_token',
                expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
            };

            const almostExpired: TokenInfo = {
                accessToken: 'almost_expired',
                expiresAt: new Date(Date.now() + 30000), // 30 seconds from now
            };

            expect(isTokenExpired(expiredToken)).toBe(true);
            expect(isTokenExpired(validToken)).toBe(false);
            expect(isTokenExpired(almostExpired)).toBe(true); // Within buffer
        });

        it('should calculate time until expiry', () => {
            const getTimeUntilExpiry = (expiresAt: Date): number => {
                return Math.max(0, expiresAt.getTime() - Date.now());
            };

            const futureDate = new Date(Date.now() + 3600000);
            const pastDate = new Date(Date.now() - 3600000);

            expect(getTimeUntilExpiry(futureDate)).toBeGreaterThan(0);
            expect(getTimeUntilExpiry(pastDate)).toBe(0);
        });
    });

    describe('Token Refresh', () => {
        it('should format refresh token request', () => {
            const buildRefreshRequest = (
                clientId: string,
                clientSecret: string,
                refreshToken: string
            ): URLSearchParams => {
                const params = new URLSearchParams();
                params.set('grant_type', 'refresh_token');
                params.set('client_id', clientId);
                params.set('client_secret', clientSecret);
                params.set('refresh_token', refreshToken);
                return params;
            };

            const request = buildRefreshRequest('client_123', 'secret_456', 'refresh_789');

            expect(request.get('grant_type')).toBe('refresh_token');
            expect(request.get('client_id')).toBe('client_123');
            expect(request.get('refresh_token')).toBe('refresh_789');
        });

        it('should handle refresh token errors', () => {
            type RefreshError =
                | 'invalid_grant'
                | 'invalid_client'
                | 'invalid_request'
                | 'server_error';

            const handleRefreshError = (error: RefreshError): {
                action: 'reauth' | 'retry' | 'fail';
                message: string;
            } => {
                switch (error) {
                    case 'invalid_grant':
                        return { action: 'reauth', message: 'Refresh token expired or revoked' };
                    case 'invalid_client':
                        return { action: 'fail', message: 'Invalid client credentials' };
                    case 'invalid_request':
                        return { action: 'fail', message: 'Malformed request' };
                    case 'server_error':
                        return { action: 'retry', message: 'Server temporarily unavailable' };
                }
            };

            expect(handleRefreshError('invalid_grant').action).toBe('reauth');
            expect(handleRefreshError('server_error').action).toBe('retry');
            expect(handleRefreshError('invalid_client').action).toBe('fail');
        });
    });

    describe('Token Revocation', () => {
        it('should detect revoked tokens from API response', () => {
            const isTokenRevoked = (statusCode: number, errorBody?: { error?: string }): boolean => {
                if (statusCode === 401) return true;
                if (statusCode === 403 && errorBody?.error === 'token_revoked') return true;
                return false;
            };

            expect(isTokenRevoked(401)).toBe(true);
            expect(isTokenRevoked(403, { error: 'token_revoked' })).toBe(true);
            expect(isTokenRevoked(403, { error: 'insufficient_scope' })).toBe(false);
            expect(isTokenRevoked(200)).toBe(false);
        });

        it('should clear tokens on revocation', () => {
            interface TokenStore {
                accessToken?: string;
                refreshToken?: string;
                expiresAt?: Date;
            }

            const clearTokens = (store: TokenStore): TokenStore => ({
                accessToken: undefined,
                refreshToken: undefined,
                expiresAt: undefined,
            });

            const store: TokenStore = {
                accessToken: 'token_123',
                refreshToken: 'refresh_456',
                expiresAt: new Date(),
            };

            const cleared = clearTokens(store);

            expect(cleared.accessToken).toBeUndefined();
            expect(cleared.refreshToken).toBeUndefined();
        });
    });

    describe('OAuth Error Codes', () => {
        it('should categorize OAuth errors', () => {
            type OAuthErrorCategory = 'auth' | 'scope' | 'rate_limit' | 'server' | 'unknown';

            const categorizeError = (error: string): OAuthErrorCategory => {
                const errorMap: Record<string, OAuthErrorCategory> = {
                    invalid_grant: 'auth',
                    invalid_token: 'auth',
                    access_denied: 'auth',
                    insufficient_scope: 'scope',
                    invalid_scope: 'scope',
                    rate_limit_exceeded: 'rate_limit',
                    too_many_requests: 'rate_limit',
                    server_error: 'server',
                    temporarily_unavailable: 'server',
                };

                return errorMap[error] || 'unknown';
            };

            expect(categorizeError('invalid_grant')).toBe('auth');
            expect(categorizeError('insufficient_scope')).toBe('scope');
            expect(categorizeError('rate_limit_exceeded')).toBe('rate_limit');
            expect(categorizeError('server_error')).toBe('server');
            expect(categorizeError('some_unknown_error')).toBe('unknown');
        });

        it('should determine retry eligibility', () => {
            const shouldRetry = (
                errorCategory: string,
                attemptCount: number,
                maxRetries: number
            ): boolean => {
                if (attemptCount >= maxRetries) return false;

                const retryableCategories = ['rate_limit', 'server'];
                return retryableCategories.includes(errorCategory);
            };

            expect(shouldRetry('server', 0, 3)).toBe(true);
            expect(shouldRetry('rate_limit', 1, 3)).toBe(true);
            expect(shouldRetry('auth', 0, 3)).toBe(false);
            expect(shouldRetry('server', 3, 3)).toBe(false);
        });
    });

    describe('Connection State Management', () => {
        it('should track connection health', () => {
            type ConnectionStatus = 'connected' | 'disconnected' | 'error' | 'expired';

            interface Connection {
                id: string;
                provider: string;
                status: ConnectionStatus;
                lastSync?: Date;
                error?: string;
            }

            const updateConnectionStatus = (
                connection: Connection,
                status: ConnectionStatus,
                error?: string
            ): Connection => ({
                ...connection,
                status,
                error,
                lastSync: status === 'connected' ? new Date() : connection.lastSync,
            });

            const connection: Connection = {
                id: 'conn_123',
                provider: 'hubspot',
                status: 'connected',
                lastSync: new Date(),
            };

            const errored = updateConnectionStatus(connection, 'error', 'Token expired');

            expect(errored.status).toBe('error');
            expect(errored.error).toBe('Token expired');
        });

        it('should require re-authentication for expired connections', () => {
            const requiresReauth = (status: string, error?: string): boolean => {
                if (status === 'expired') return true;
                if (status === 'error' && error?.toLowerCase().includes('token')) return true;
                return false;
            };

            expect(requiresReauth('expired')).toBe(true);
            expect(requiresReauth('error', 'Token expired')).toBe(true);
            expect(requiresReauth('error', 'Network timeout')).toBe(false);
            expect(requiresReauth('connected')).toBe(false);
        });
    });

    describe('Sync Recovery', () => {
        it('should resume sync from last successful point', () => {
            interface SyncState {
                lastSyncedAt?: Date;
                lastCursor?: string;
                totalSynced: number;
            }

            const resumeSync = (state: SyncState): {
                startFrom: string | undefined;
                incrementalSync: boolean;
            } => ({
                startFrom: state.lastCursor,
                incrementalSync: !!state.lastSyncedAt,
            });

            const partialState: SyncState = {
                lastSyncedAt: new Date(),
                lastCursor: 'cursor_abc',
                totalSynced: 500,
            };

            const freshState: SyncState = {
                totalSynced: 0,
            };

            expect(resumeSync(partialState).incrementalSync).toBe(true);
            expect(resumeSync(partialState).startFrom).toBe('cursor_abc');
            expect(resumeSync(freshState).incrementalSync).toBe(false);
        });

        it('should handle rate limit backoff', () => {
            const calculateBackoff = (
                retryAfterHeader?: string,
                attemptCount = 0
            ): number => {
                // If server tells us when to retry, use that
                if (retryAfterHeader) {
                    const seconds = parseInt(retryAfterHeader, 10);
                    if (!isNaN(seconds)) return seconds * 1000;
                }

                // Otherwise, exponential backoff
                return Math.min(1000 * Math.pow(2, attemptCount), 60000);
            };

            expect(calculateBackoff('5')).toBe(5000);
            expect(calculateBackoff(undefined, 0)).toBe(1000);
            expect(calculateBackoff(undefined, 3)).toBe(8000);
            expect(calculateBackoff(undefined, 10)).toBe(60000); // Capped
        });
    });
});

describe('Provider-Specific OAuth Handling', () => {
    describe('HubSpot OAuth', () => {
        it('should build HubSpot token URL', () => {
            const hubspotTokenUrl = 'https://api.hubapi.com/oauth/v1/token';
            expect(hubspotTokenUrl).toContain('hubapi.com');
        });

        it('should handle HubSpot scope errors', () => {
            const hubspotScopeError = {
                status: 'error',
                message: 'One or more requested scopes are invalid',
                category: 'MISSING_SCOPES',
            };

            expect(hubspotScopeError.category).toBe('MISSING_SCOPES');
        });
    });

    describe('QuickBooks OAuth', () => {
        it('should build QuickBooks token URL', () => {
            const qbTokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
            expect(qbTokenUrl).toContain('intuit.com');
        });

        it('should handle QuickBooks realm ID requirement', () => {
            const validateConnection = (realmId?: string): boolean => {
                return !!realmId && realmId.length > 0;
            };

            expect(validateConnection('123456789')).toBe(true);
            expect(validateConnection(undefined)).toBe(false);
            expect(validateConnection('')).toBe(false);
        });
    });

    describe('DocuSign OAuth', () => {
        it('should build DocuSign token URL', () => {
            const docusignTokenUrl = 'https://account.docusign.com/oauth/token';
            expect(docusignTokenUrl).toContain('docusign.com');
        });

        it('should handle DocuSign consent required error', () => {
            const handleDocuSignError = (error: string): string => {
                if (error === 'consent_required') {
                    return 'User must grant permission again';
                }
                return 'Unknown error';
            };

            expect(handleDocuSignError('consent_required'))
                .toBe('User must grant permission again');
        });
    });
});
