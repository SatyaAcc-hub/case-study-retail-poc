import * as df from 'durable-functions';
import { queryDocuments } from '../shared/cosmosClient';
import { YotpoData } from '../shared/models';

const today = new Date();
const daysAgo = (n: number) =>
  new Date(today.getTime() - n * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

const MOCK_YOTPO: YotpoData = {
  customerId: 'CUST-000142',
  pointsBalance: 1240,
  pointsExpiryDate: daysAgo(-30), // expires in 30 days
  lastRedemptionDate: null,
  weeksSinceRedemption: null,
  tier: 'Gold',
};

df.app.activity('collectYotpo', {
  handler: async (customerId: string): Promise<YotpoData> => {
    const results = await queryDocuments<YotpoData>(
      'loyalty_yotpo',
      'SELECT * FROM c WHERE c.customerId = @customerId',
      [{ name: '@customerId', value: customerId }]
    );

    if (results.length > 0) {
      return results[0];
    }

    console.log(`[collectYotpo] No Yotpo record found for ${customerId}, returning mock data`);
    return { ...MOCK_YOTPO, customerId };
  },
});
