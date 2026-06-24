export const config = {
  cosmosEndpoint: process.env.COSMOS_DB_ENDPOINT ?? '',
  cosmosKey: process.env.COSMOS_DB_KEY ?? '',
  cosmosDatabaseId: 'apex-retail-poc',
  awsRegion: process.env.AWS_REGION ?? 'us-east-1',
  bedrockSonnetModel:
    process.env.BEDROCK_SONNET_MODEL ?? 'anthropic.claude-sonnet-4-5-20250929-v1:0',
  bedrockHaikuModel:
    process.env.BEDROCK_HAIKU_MODEL ?? 'anthropic.claude-haiku-4-5-20251001-v1:0',
  approvalBaseUrl: process.env.APPROVAL_BASE_URL ?? 'http://localhost:4280',
};
