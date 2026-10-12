import { EngineRegistry } from './registry';
import { profileEngine } from './profile';
import { complianceEngine } from './compliance';
import { intelligenceEngines } from './intelligence';

export function defaultRegistry(): EngineRegistry {
  const r = new EngineRegistry().register(profileEngine).register(complianceEngine);
  for (const e of intelligenceEngines) r.register(e);
  return r;
}
export { EngineRegistry, LEGACY_INTENTS } from './registry';
export type { Engine, ModelProvider } from './types';
