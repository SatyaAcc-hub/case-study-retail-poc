import axios from 'axios'
import type { Campaign, TriggerResponse, ApprovalRequest } from '../types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:7071'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
})

// Response interceptor for unified error handling
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.message ??
      err.response?.data?.error ??
      err.message ??
      'An unexpected error occurred'
    return Promise.reject(new Error(message))
  },
)

/** Fetch all campaigns */
export async function getCampaigns(): Promise<Campaign[]> {
  const { data } = await apiClient.get<Campaign[]>('/api/campaigns')
  return data
}

/** Fetch a single campaign by correlationId */
export async function getCampaign(correlationId: string): Promise<Campaign> {
  const { data } = await apiClient.get<Campaign>(`/api/campaigns/${correlationId}`)
  return data
}

/** Trigger churn detection for a customer */
export async function triggerChurnDetection(customerId: string): Promise<TriggerResponse> {
  const { data } = await apiClient.post<TriggerResponse>('/api/trigger', { customerId })
  return data
}

/** Submit an approval decision */
export async function submitApproval(
  correlationId: string,
  payload: ApprovalRequest,
): Promise<void> {
  await apiClient.post(`/api/approvals/${correlationId}`, payload)
}
