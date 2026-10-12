import { EngineRegistry } from './registry';
import { profileEngine } from './profile';
import { complianceEngine } from './compliance';
import { intelligenceEngines } from './intelligence';
import { scaleEngine } from '../scale/engine';
import { shopperEngine } from './shopper';
import { nightvisionEngine } from './nightvision';
import { learningEngine } from './learning';

export function defaultRegistry(): EngineRegistry {
  const r = new EngineRegistry().register(profileEngine).register(complianceEngine);
  for (const e of [...intelligenceEngines, scaleEngine, shopperEngine, nightvisionEngine, learningEngine]) r.register(e);
  return r;
}
export { EngineRegistry, LEGACY_INTENTS } from './registry';
export type { Engine, ModelProvider } from './types';
