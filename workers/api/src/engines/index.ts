import { EngineRegistry } from './registry';
import { profileEngine } from './profile';
import { complianceEngine } from './compliance';

export function defaultRegistry(): EngineRegistry {
  return new EngineRegistry().register(profileEngine).register(complianceEngine);
}
export { EngineRegistry, LEGACY_INTENTS } from './registry';
export type { Engine } from './types';
