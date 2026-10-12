import type { Engine } from './types';

export class EngineRegistry {
  private byIntent = new Map<string, Engine>();
  private engines = new Map<string, Engine>();

  register(engine: Engine): this {
    if (this.engines.has(engine.id)) throw new Error(`engine ${engine.id} already registered`);
    for (const i of engine.intents) {
      const owner = this.byIntent.get(i);
      if (owner) throw new Error(`intent ${i} already handled by ${owner.id}`);
    }
    this.engines.set(engine.id, engine);
    for (const i of engine.intents) this.byIntent.set(i, engine);
    return this;
  }

  forIntent(intent: string): Engine | undefined {
    return this.byIntent.get(intent);
  }

  list(): { id: string; intents: string[]; consumes: string[]; emits: string[]; tier: number }[] {
    return [...this.engines.values()].map(({ id, intents, consumes, emits, tier }) => ({ id, intents, consumes, emits, tier }));
  }

  consumersOf(eventType: string): Engine[] {
    return [...this.engines.values()].filter((e) => e.consumes.includes(eventType));
  }
}

/** Intents from the old switch not yet ported (all ported as of Wave 1). */
export const LEGACY_INTENTS: readonly string[] = [];
