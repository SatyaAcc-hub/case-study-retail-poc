import * as df from 'durable-functions';
import { queryDocuments } from '../shared/cosmosClient';
import { ShopifyData } from '../shared/models';

const today = new Date();
const daysAgo = (n: number) =>
  new Date(today.getTime() - n * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

const MOCK_SHOPIFY: ShopifyData = {
  customerId: 'CUST-000142',
  aov6mTrendPct: -34,
  discountDependencyRatio: 0.78,
  lastPurchaseChannel: 'web',
  recentOrders: [
    { date: daysAgo(47), amount: 52.0, discountCode: 'SAVE20' },
    { date: daysAgo(89), amount: 88.5, discountCode: 'LOYALTY10' },
    { date: daysAgo(142), amount: 134.0, discountCode: null },
  ],
};

df.app.activity('collectShopify', {
  handler: async (customerId: string): Promise<ShopifyData> => {
    const results = await queryDocuments<ShopifyData>(
      'transactions_shopify',
      'SELECT * FROM c WHERE c.customerId = @customerId',
      [{ name: '@customerId', value: customerId }]
    );

    if (results.length > 0) {
      return results[0];
    }

    console.log(`[collectShopify] No Shopify record found for ${customerId}, returning mock data`);
    return { ...MOCK_SHOPIFY, customerId };
  },
});
