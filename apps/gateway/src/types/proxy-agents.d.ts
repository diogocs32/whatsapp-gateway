// socks-proxy-agent@10 e https-proxy-agent@9 expõem seus tipos apenas via package.json
// "exports"; sob moduleResolution:"node" (que o projeto usa) o tsc não os encontra —
// embora o Node resolva os pacotes normalmente em runtime. Shims mínimos só com o
// construtor que usamos (o retorno é tratado via `as unknown as Agent` no factory, então
// não precisa estender http.Agent). Como o tsc não acha os tipos reais, não há conflito.
declare module 'socks-proxy-agent' {
  export class SocksProxyAgent {
    constructor(uri: string, options?: Record<string, unknown>);
  }
}

declare module 'https-proxy-agent' {
  export class HttpsProxyAgent {
    constructor(uri: string, options?: Record<string, unknown>);
  }
}
