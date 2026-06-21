import { ulid } from 'ulid';

// IDs ordenáveis por tempo (importante para eventos/mensagens — blueprint §10/§17).
export const newId = (): string => ulid();
