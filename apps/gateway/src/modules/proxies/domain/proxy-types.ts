export type ProxyProtocol = 'HTTP' | 'HTTPS' | 'SOCKS4' | 'SOCKS5';
export type ProxySource = 'MANUAL' | 'WEBSHARE';
export type ProxyStatus = 'UNTESTED' | 'ALIVE' | 'DEAD';
export type ProxyMode = 'NONE' | 'SINGLE' | 'RANGE' | 'GLOBAL_ROUND_ROBIN';
export type ProxyStrategy =
  'STICKY' | 'ROUND_ROBIN' | 'LEAST_LATENCY' | 'RANDOM';
