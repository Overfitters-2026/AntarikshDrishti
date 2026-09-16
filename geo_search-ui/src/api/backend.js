import axios from 'axios'

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
})

export async function getHotspots() {
  const { data } = await client.get('/hotspots')
  if (!Array.isArray(data)) throw new Error('Invalid hotspots response')
  return data
}

export async function updateStatus(id, status) {
  const { data } = await client.post(`/hotspots/${id}/status`, { status })
  return data
}
