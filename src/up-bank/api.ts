import * as App from "-/constants.ts";

export interface PaginatedResponse<T> {
  data: T[];
  links?: { next?: string | null };
}

export async function fetchAll<T>(path: string): Promise<T[]> {
  const resources: T[] = [];
  let url: string | null = App.ApiUrl + path;

  while (url) {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Authorization": "Bearer " + App.ApiToken }
    });

    if (!response.ok) {
      let detail = response.statusText;
      try {
        const error = await response.json() as { errors?: { detail?: string }[] };
        detail = error.errors?.map((item) => item.detail).filter(Boolean).join("; ") || detail;
      } catch {
        // Keep the HTTP status text when the response is not JSON.
      }
      throw new Error(`Up API request failed (${response.status}): ${detail}`);
    }

    const page = await response.json() as PaginatedResponse<T>;
    resources.push(...(page.data || []));
    url = page.links?.next || null;
  }

  return resources;
}
