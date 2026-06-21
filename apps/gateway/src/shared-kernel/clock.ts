// Clock injetável — facilita testes determinísticos (sem chamar new Date() solto).
export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export const CLOCK = Symbol('CLOCK');
