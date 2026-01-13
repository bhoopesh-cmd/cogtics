/**
 * Connector Integration Tests (Phase 4)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  HubSpotConnector,
  QuickBooksConnector,
  DocuSignConnector,
  getHubSpotSchema,
  HUBSPOT_PROPERTIES,
  getQuickBooksSchema,
  getDocuSignSchema,
  mapCompanyToCustomer,
  mapDealToContract,
  mapQBCustomerToCustomer,
  mapQBInvoiceToInvoice,
  mapEnvelopeToContract,
} from '@cogtics/connectors';

describe('Phase 4 Connector Integration Tests', () => {
  describe('HubSpot Connector', () => {
    let connector: HubSpotConnector;

    beforeAll(() => {
      connector = new HubSpotConnector();
    });

    describe('OAuth URL Generation', () => {
      it('should generate valid OAuth URL', () => {
        const url = connector.getAuthUrl({
          clientId: 'test-client-id',
          clientSecret: 'test-secret',
          redirectUri: 'https://example.com/callback',
          state: 'test-state',
        });

        expect(url).toContain('app.hubspot.com/oauth/authorize');
        expect(url).toContain('client_id=test-client-id');
        expect(url).toContain('redirect_uri=');
        expect(url).toContain('state=test-state');
      });

      it('should include default scopes', () => {
        const url = connector.getAuthUrl({
          clientId: 'test-client-id',
          clientSecret: 'test-secret',
          redirectUri: 'https://example.com/callback',
        });

        expect(url).toContain('scope=');
        expect(url).toContain('crm.objects.companies.read');
      });

      it('should support custom scopes', () => {
        const url = connector.getAuthUrl({
          clientId: 'test-client-id',
          clientSecret: 'test-secret',
          redirectUri: 'https://example.com/callback',
          scopes: ['custom.scope'],
        });

        expect(url).toContain('custom.scope');
      });
    });

    describe('Schema Discovery', () => {
      it('should return HubSpot schema', () => {
        const schema = getHubSpotSchema();

        expect(schema.provider).toBe('hubspot');
        expect(schema.objects.length).toBeGreaterThan(0);
        expect(schema.discoveredAt).toBeInstanceOf(Date);
      });

      it('should include companies object', () => {
        const schema = getHubSpotSchema();
        const companies = schema.objects.find(o => o.name === 'companies');

        expect(companies).toBeDefined();
        expect(companies?.supportsIncremental).toBe(true);
        expect(companies?.fields.length).toBeGreaterThan(0);
      });

      it('should include contacts object', () => {
        const schema = getHubSpotSchema();
        const contacts = schema.objects.find(o => o.name === 'contacts');

        expect(contacts).toBeDefined();
      });

      it('should include deals object', () => {
        const schema = getHubSpotSchema();
        const deals = schema.objects.find(o => o.name === 'deals');

        expect(deals).toBeDefined();
      });
    });

    describe('Properties Configuration', () => {
      it('should have properties for companies', () => {
        expect(HUBSPOT_PROPERTIES.companies).toBeDefined();
        expect(HUBSPOT_PROPERTIES.companies).toContain('name');
        expect(HUBSPOT_PROPERTIES.companies).toContain('domain');
      });

      it('should have properties for contacts', () => {
        expect(HUBSPOT_PROPERTIES.contacts).toBeDefined();
        expect(HUBSPOT_PROPERTIES.contacts).toContain('email');
      });

      it('should have properties for deals', () => {
        expect(HUBSPOT_PROPERTIES.deals).toBeDefined();
        expect(HUBSPOT_PROPERTIES.deals).toContain('dealname');
        expect(HUBSPOT_PROPERTIES.deals).toContain('amount');
      });
    });

    describe('Data Mappers', () => {
      it('should map company to customer', () => {
        const company = {
          id: 'comp_123',
          properties: {
            name: 'Acme Inc',
            domain: 'acme.com',
            industry: 'Technology',
            phone: '+1-555-0100',
          },
        };

        const customer = mapCompanyToCustomer(company);

        expect(customer.external_id).toBe('comp_123');
        expect(customer.name).toBe('Acme Inc');
        expect(customer.phone).toBe('+1-555-0100');
        expect(customer.metadata.domain).toBe('acme.com');
      });

      it('should map deal to contract', () => {
        const deal = {
          id: 'deal_456',
          properties: {
            dealname: 'Enterprise Deal',
            amount: '50000',
            dealstage: 'closedwon',
          },
        };

        const contract = mapDealToContract(deal);

        expect(contract.external_id).toBe('deal_456');
        expect(contract.name).toBe('Enterprise Deal');
        expect(contract.value).toBe(50000);
        expect(contract.status).toBe('active');
      });
    });
  });

  describe('QuickBooks Connector', () => {
    let connector: QuickBooksConnector;

    beforeAll(() => {
      connector = new QuickBooksConnector();
    });

    describe('OAuth URL Generation', () => {
      it('should generate valid OAuth URL', () => {
        const url = connector.getAuthUrl({
          clientId: 'test-client-id',
          clientSecret: 'test-secret',
          redirectUri: 'https://example.com/callback',
          state: 'test-state',
        });

        expect(url).toContain('appcenter.intuit.com/connect/oauth2');
        expect(url).toContain('client_id=test-client-id');
        expect(url).toContain('state=test-state');
      });

      it('should support PKCE', () => {
        const url = connector.getAuthUrl({
          clientId: 'test-client-id',
          clientSecret: 'test-secret',
          redirectUri: 'https://example.com/callback',
          codeChallenge: 'challenge123',
          codeChallengeMethod: 'S256',
        });

        expect(url).toContain('code_challenge=challenge123');
        expect(url).toContain('code_challenge_method=S256');
      });
    });

    describe('Schema Discovery', () => {
      it('should return QuickBooks schema', () => {
        const schema = getQuickBooksSchema();

        expect(schema.provider).toBe('quickbooks');
        expect(schema.objects.length).toBeGreaterThan(0);
      });

      it('should include Customer object', () => {
        const schema = getQuickBooksSchema();
        const customer = schema.objects.find(o => o.name === 'Customer');

        expect(customer).toBeDefined();
        expect(customer?.supportsIncremental).toBe(true);
      });

      it('should include Invoice object', () => {
        const schema = getQuickBooksSchema();
        const invoice = schema.objects.find(o => o.name === 'Invoice');

        expect(invoice).toBeDefined();
      });

      it('should include Payment object', () => {
        const schema = getQuickBooksSchema();
        const payment = schema.objects.find(o => o.name === 'Payment');

        expect(payment).toBeDefined();
      });
    });

    describe('Data Mappers', () => {
      it('should map QB customer to canonical customer', () => {
        const qbCustomer = {
          Id: 'cust_123',
          DisplayName: 'John Doe',
          CompanyName: 'Acme Inc',
          PrimaryEmailAddr: { Address: 'john@acme.com' },
          PrimaryPhone: { FreeFormNumber: '+1-555-0100' },
          Active: true,
        };

        const customer = mapQBCustomerToCustomer(qbCustomer);

        expect(customer.external_id).toBe('cust_123');
        expect(customer.name).toBe('Acme Inc');
        expect(customer.email).toBe('john@acme.com');
        expect(customer.status).toBe('active');
      });

      it('should map QB invoice to canonical invoice', () => {
        const qbInvoice = {
          Id: 'inv_456',
          DocNumber: 'INV-001',
          CustomerRef: { value: 'cust_123' },
          TxnDate: '2024-01-15',
          TotalAmt: 1500,
          Balance: 500,
          CurrencyRef: { value: 'USD' },
        };

        const invoice = mapQBInvoiceToInvoice(qbInvoice);

        expect(invoice.external_id).toBe('inv_456');
        expect(invoice.invoice_number).toBe('INV-001');
        expect(invoice.total).toBe(1500);
        expect(invoice.amount_due).toBe(500);
        expect(invoice.status).toBe('partial');
      });
    });
  });

  describe('DocuSign Connector', () => {
    let connector: DocuSignConnector;

    beforeAll(() => {
      connector = new DocuSignConnector();
    });

    describe('OAuth URL Generation', () => {
      it('should generate valid OAuth URL', () => {
        const url = connector.getAuthUrl({
          clientId: 'test-client-id',
          clientSecret: 'test-secret',
          redirectUri: 'https://example.com/callback',
          state: 'test-state',
        });

        expect(url).toContain('account.docusign.com/oauth/auth');
        expect(url).toContain('client_id=test-client-id');
        expect(url).toContain('response_type=code');
      });

      it('should include default scopes', () => {
        const url = connector.getAuthUrl({
          clientId: 'test-client-id',
          clientSecret: 'test-secret',
          redirectUri: 'https://example.com/callback',
        });

        expect(url).toContain('scope=');
        expect(url).toContain('signature');
      });
    });

    describe('Schema Discovery', () => {
      it('should return DocuSign schema', () => {
        const schema = getDocuSignSchema();

        expect(schema.provider).toBe('docusign');
        expect(schema.objects.length).toBeGreaterThan(0);
      });

      it('should include envelopes object', () => {
        const schema = getDocuSignSchema();
        const envelopes = schema.objects.find(o => o.name === 'envelopes');

        expect(envelopes).toBeDefined();
        expect(envelopes?.supportsIncremental).toBe(true);
      });

      it('should include documents object', () => {
        const schema = getDocuSignSchema();
        const documents = schema.objects.find(o => o.name === 'documents');

        expect(documents).toBeDefined();
      });

      it('should include recipients object', () => {
        const schema = getDocuSignSchema();
        const recipients = schema.objects.find(o => o.name === 'recipients');

        expect(recipients).toBeDefined();
      });
    });

    describe('Data Mappers', () => {
      it('should map envelope to contract', () => {
        const envelope = {
          envelopeId: 'env_123',
          status: 'completed',
          emailSubject: 'Enterprise Agreement',
          sentDateTime: '2024-01-10T10:00:00Z',
          completedDateTime: '2024-01-15T14:30:00Z',
          recipients: {
            signers: [{ recipientId: 'r1', email: 'signer@acme.com' }],
          },
          documents: [{ documentId: 'd1', name: 'Contract.pdf' }],
        };

        const contract = mapEnvelopeToContract(envelope);

        expect(contract.external_id).toBe('env_123');
        expect(contract.name).toBe('Enterprise Agreement');
        expect(contract.status).toBe('active');
        expect(contract.metadata.signer_count).toBe(1);
        expect(contract.metadata.document_count).toBe(1);
      });

      it('should map voided envelope status', () => {
        const envelope = {
          envelopeId: 'env_456',
          status: 'voided',
          emailSubject: 'Cancelled Contract',
        };

        const contract = mapEnvelopeToContract(envelope);

        expect(contract.status).toBe('cancelled');
      });

      it('should map pending envelope status', () => {
        const envelope = {
          envelopeId: 'env_789',
          status: 'sent',
          emailSubject: 'Awaiting Signature',
        };

        const contract = mapEnvelopeToContract(envelope);

        expect(contract.status).toBe('pending');
      });
    });
  });

  describe('Connector Registry', () => {
    it('should register HubSpot connector', async () => {
      const { getRegisteredProviders, initializeConnectors } = await import('@cogtics/connectors');
      
      await initializeConnectors({});
      const providers = getRegisteredProviders();

      expect(providers).toContain('hubspot');
    });

    it('should register QuickBooks connector', async () => {
      const { getRegisteredProviders, initializeConnectors } = await import('@cogtics/connectors');
      
      await initializeConnectors({});
      const providers = getRegisteredProviders();

      expect(providers).toContain('quickbooks');
    });

    it('should register DocuSign connector', async () => {
      const { getRegisteredProviders, initializeConnectors } = await import('@cogtics/connectors');
      
      await initializeConnectors({});
      const providers = getRegisteredProviders();

      expect(providers).toContain('docusign');
    });
  });
});
