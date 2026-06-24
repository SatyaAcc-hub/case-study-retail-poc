import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { config } from './config';

const client = new BedrockRuntimeClient({ region: config.awsRegion });

export async function invokeModel(
  modelId: string,
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const body: Record<string, unknown> = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  };
  if (systemPrompt) {
    body.system = systemPrompt;
  }

  const command = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(body),
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(Buffer.from(response.body).toString('utf-8')) as {
    content: Array<{ text: string }>;
  };
  return responseBody.content[0].text;
}

export async function invokeModelJson<T>(
  modelId: string,
  prompt: string,
  systemPrompt?: string
): Promise<T> {
  const text = await invokeModel(modelId, prompt, systemPrompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON found in model response: ${text.slice(0, 200)}`);
  return JSON.parse(jsonMatch[0]) as T;
}
