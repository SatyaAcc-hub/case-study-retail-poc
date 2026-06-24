import * as df from 'durable-functions';
import { queryDocuments } from '../shared/cosmosClient';
import { GaData } from '../shared/models';

const MOCK_GA: GaData = {
  customerId: 'CUST-000142',
  sessions30d: 4,
  sessions30dPrior: 10,
  sessionDeclinePct: -60,
  last3SessionsPages: ['/account/order-history', '/sale', '/checkout/cart'],
  avgSessionDurationSec: 87,
};

df.app.activity('collectGa', {
  handler: async (customerId: string): Promise<GaData> => {
    const results = await queryDocuments<GaData>(
      'analytics_ga',
      'SELECT * FROM c WHERE c.customerId = @customerId',
      [{ name: '@customerId', value: customerId }]
    );

    if (results.length > 0) {
      return results[0];
    }

    console.log(`[collectGa] No GA record found for ${customerId}, returning mock data`);
    return { ...MOCK_GA, customerId };
  },
});
