import type { Connector, ConnectorProvider, ConnectorConfig } from './types.js';
/**
 * Register a connector implementation
 */
export declare function registerConnector(connector: Connector): void;
/**
 * Get a registered connector by provider
 */
export declare function getConnector(provider: ConnectorProvider): Connector;
/**
 * Check if a connector is registered
 */
export declare function hasConnector(provider: ConnectorProvider): boolean;
/**
 * Get all registered providers
 */
export declare function getRegisteredProviders(): ConnectorProvider[];
/**
 * Initialize all connectors with config
 */
export declare function initializeConnectors(_config: ConnectorConfig): Promise<void>;
//# sourceMappingURL=registry.d.ts.map