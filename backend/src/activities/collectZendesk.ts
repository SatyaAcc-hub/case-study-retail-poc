import * as df from 'durable-functions';
import { queryDocuments } from '../shared/cosmosClient';
import { ZendeskData } from '../shared/models';

const MOCK_ZENDESK: ZendeskData = {
  customerId: 'CUST-000142',
  tickets90d: 2,
  openTickets: 1,
  oldestOpenTicketAgeDays: 12,
  lastTicketTopic: 'Delayed shipment inquiry',
};

df.app.activity('collectZendesk', {
  handler: async (customerId: string): Promise<ZendeskData> => {
    const results = await queryDocuments<ZendeskData>(
      'support_zendesk',
      'SELECT * FROM c WHERE c.customerId = @customerId',
      [{ name: '@customerId', value: customerId }]
    );

    if (results.length > 0) {
      return results[0];
    }

    console.log(`[collectZendesk] No Zendesk record found for ${customerId}, returning mock data`);
    return { ...MOCK_ZENDESK, customerId };
  },
});
