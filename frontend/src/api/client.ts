export type Summary = {
  as_of_date: string;
  database_path: string;
  model_status: string;
  data_status: string;
  next_steps: string[];
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';

export async function getSummary(): Promise<Summary> {
  const response = await fetch(`${apiBaseUrl}/api/summary`);

  if (!response.ok) {
    throw new Error(`Failed to load summary: ${response.status}`);
  }

  return response.json();
}
