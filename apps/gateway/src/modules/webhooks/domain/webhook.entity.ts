export class Webhook {
  constructor(
    public readonly id: string,
    public sessionId: string | null,
    public url: string,
    public events: string[],
    public secret: string | null,
    public headers: Record<string, string> | null,
    public enabled: boolean,
    public maxAttempts: number,
    public readonly createdAt: Date,
  ) {}
}
