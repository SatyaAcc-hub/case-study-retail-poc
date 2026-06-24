import { CosmosClient } from '@azure/cosmos';
import { config } from './config';

let _client: CosmosClient | null = null;

function getClient(): CosmosClient {
  if (!_client) {
    _client = new CosmosClient({
      endpoint: config.cosmosEndpoint,
      key: config.cosmosKey,
    });
  }
  return _client;
}

export function getContainer(containerId: string) {
  return getClient().database(config.cosmosDatabaseId).container(containerId);
}

export async function upsertDocument(
  containerId: string,
  doc: Record<string, unknown>
): Promise<void> {
  const container = getContainer(containerId);
  await container.items.upsert(doc);
}

export async function getDocument<T>(
  containerId: string,
  id: string,
  partitionKey: string
): Promise<T | null> {
  try {
    const container = getContainer(containerId);
    const { resource } = await container.item(id, partitionKey).read<T>();
    return resource ?? null;
  } catch (err: unknown) {
    const error = err as { code?: number };
    if (error?.code === 404) return null;
    throw err;
  }
}

export async function queryDocuments<T>(
  containerId: string,
  query: string,
  parameters?: Array<{ name: string; value: unknown }>
): Promise<T[]> {
  const container = getContainer(containerId);
  const { resources } = await container.items
    .query<T>({ query, parameters: parameters ?? [] })
    .fetchAll();
  return resources;
}
