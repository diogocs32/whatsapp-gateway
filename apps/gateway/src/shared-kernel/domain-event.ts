// Evento de domínio — base para comunicação entre bounded contexts via EventBus (blueprint §4.4).
export interface DomainEvent<P = unknown> {
  readonly name: string;
  readonly occurredAt: Date;
  readonly payload: P;
}
