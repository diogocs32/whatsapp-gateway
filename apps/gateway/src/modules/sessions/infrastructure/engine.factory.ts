import { Injectable } from '@nestjs/common';
import type { IEngine } from '../application/engine.port';
import { BaileysEngine } from './baileys/baileys.engine';
import type { BaileysEngineDeps } from './baileys/baileys.engine';
import { WWebJSEngine } from './wwebjs/wwebjs.engine';

// Cria a engine certa por sessão (F8 — engine plugável): WWEBJS (whatsapp-web.js)
// ou BAILEYS (default). Ambas implementam o mesmo contrato IEngine.
@Injectable()
export class EngineFactory {
  create(engineType: string, deps: BaileysEngineDeps): IEngine {
    return engineType === 'WWEBJS'
      ? new WWebJSEngine(deps)
      : new BaileysEngine(deps);
  }
}
