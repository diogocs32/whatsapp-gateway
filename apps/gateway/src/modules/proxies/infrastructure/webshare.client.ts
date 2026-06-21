import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../bootstrap/config';

// Formato confirmado na API v2 (apidocs.webshare.io/proxy-list/list, acessado 2026-06-20):
// GET https://proxy.webshare.io/api/v2/proxy/list/?mode=direct  +  header `Authorization: Token <key>`.
export interface WebshareProxy {
  id: string; // ex: "d-10513"
  username: string;
  password: string;
  proxy_address: string;
  port: number;
  valid: boolean;
  country_code: string | null;
  city_name: string | null;
}

interface WebshareListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: WebshareProxy[];
}

@Injectable()
export class WebshareClient {
  constructor(private readonly config: ConfigService<Env, true>) {}

  isConfigured(): boolean {
    return Boolean(this.config.get('WEBSHARE_API_KEY', { infer: true }));
  }

  // Pagina todos os proxies (`next` até null). page_size=100 reduz o nº de chamadas.
  async fetchAll(): Promise<WebshareProxy[]> {
    const key = this.config.get('WEBSHARE_API_KEY', { infer: true });
    if (!key) {
      throw new Error('WEBSHARE_API_KEY não configurado');
    }

    const out: WebshareProxy[] = [];
    let url: string | null =
      'https://proxy.webshare.io/api/v2/proxy/list/?mode=direct&page_size=100';

    while (url) {
      const res = await fetch(url, {
        headers: { Authorization: `Token ${key}` },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        throw new Error(`Webshare respondeu HTTP ${res.status}`);
      }
      const data = (await res.json()) as WebshareListResponse;
      out.push(...data.results);
      url = data.next;
    }

    return out;
  }
}
