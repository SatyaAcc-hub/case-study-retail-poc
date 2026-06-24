import * as df from 'durable-functions';
import { queryDocuments } from '../shared/cosmosClient';
import { KlaviyoData } from '../shared/models';

const today = new Date();
const daysAgo = (n: number) =>
  new Date(today.getTime() - n * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

const MOCK_KLAVIYO: KlaviyoData = {
  customerId: 'CUST-000142',
  emailsSent90d: 24,
  openRatePct: 8.2,
  clickRatePct: 0.9,
  lastOpenDate: daysAgo(38),
  expiryWarningOpened: false,
  unsubscribed: false,
};

df.app.activity('collectKlaviyo', {
  handler: async (customerId: string): Promise<KlaviyoData> => {
    const results = await queryDocuments<KlaviyoData>(
      'email_klaviyo',
      'SELECT * FROM c WHERE c.customerId = @customerId',
      [{ name: '@customerId', value: customerId }]
    );

    if (results.length > 0) {
      return results[0];
    }

    console.log(`[collectKlaviyo] No Klaviyo record found for ${customerId}, returning mock data`);
    return { ...MOCK_KLAVIYO, customerId };
  },
});
