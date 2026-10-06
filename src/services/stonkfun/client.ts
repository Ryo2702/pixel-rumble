import { StonkFunError } from './errors';

export const STONKFUN_API = 'https://www.stonkfun.xyz/api/public/v1';
const REQUEST_TIMEOUT = 15_000;

export class StonkFunClient {
  constructor(private readonly request: typeof fetch = fetch) {}

  async get<T>(path: string): Promise<T> {
    let response: Response;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    try {
      response = await this.request(`${STONKFUN_API}${path}`, { headers: { Accept: 'application/json' }, signal: controller.signal });
    } catch (error) {
      throw new StonkFunError(error instanceof DOMException && error.name === 'AbortError' ? 'StonkFun request timed out.' : error instanceof Error ? error.message : 'Network request failed.');
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) throw new StonkFunError(`StonkFun request failed: ${response.status}`, response.status);
    try {
      return await response.json() as T;
    } catch {
      throw new StonkFunError('StonkFun returned invalid JSON.');
    }
  }
}

export const stonkFunClient = new StonkFunClient();
