import type { Connector, ConnectorProvider, ConnectorConfig } from './types.js';

const connectors = new Map<ConnectorProvider, Connector>();

/**
 * Register a connector implementation
 */
export function registerConnector(connector: Connector): void {
  connectors.set(connector.provider, connector);
}

/**
 * Get a registered connector by provider
 */
export function getConnector(provider: ConnectorProvider): Connector {
  const connector = connectors.get(provider);
  if (!connector) {
    throw new Error(`Connector not registered: ${provider}`);
  }
  return connector;
}

/**
 * Check if a connector is registered
 */
export function hasConnector(provider: ConnectorProvider): boolean {
  return connectors.has(provider);
}

/**
 * Get all registered providers
 */
export function getRegisteredProviders(): ConnectorProvider[] {
  return Array.from(connectors.keys());
}

/**
 * Initialize all connectors with config
 */
export async function initializeConnectors(_config: ConnectorConfig): Promise<void> {
  // Import and register connectors
  const { StripeConnector } = await import('./stripe/index.js');
  const { SalesforceConnector } = await import('./salesforce/index.js');
  const { HubSpotConnector } = await import('./hubspot/index.js');
  const { QuickBooksConnector } = await import('./quickbooks/index.js');
  const { DocuSignConnector } = await import('./docusign/index.js');

  registerConnector(new StripeConnector());
  registerConnector(new SalesforceConnector());
  registerConnector(new HubSpotConnector());
  registerConnector(new QuickBooksConnector());
  registerConnector(new DocuSignConnector());
}

