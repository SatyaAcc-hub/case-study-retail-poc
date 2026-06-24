import * as df from 'durable-functions';
import { queryDocuments } from '../shared/cosmosClient';
import { CrmData } from '../shared/models';

const MOCK_CRM: CrmData = {
  customerId: 'CUST-000142',
  customerName: 'Sarah Mitchell',
  accountStatus: 'active',
  engagementScore: 72,
  lastPurchaseDate: new Date(Date.now() - 47 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  customerTier: 'Gold',
  lifetimeValue: 3842.5,
};

df.app.activity('collectCrm', {
  handler: async (customerId: string): Promise<CrmData> => {
    const results = await queryDocuments<CrmData>(
      'crm_salesforce',
      'SELECT * FROM c WHERE c.customerId = @customerId',
      [{ name: '@customerId', value: customerId }]
    );

    if (results.length > 0) {
      return results[0];
    }

    // Return mock data for demo/POC when record not found
    console.log(`[collectCrm] No CRM record found for ${customerId}, returning mock data`);
    return { ...MOCK_CRM, customerId };
  },
});
