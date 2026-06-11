// Finesse Agent Roster — export all agents from one place

// Scout: item search across Scale, Embassy, and Nova AI
export {scoutByText, scoutByImage} from './scout';
export type {ScoutResult} from './scout';

// Stylist: NIGHTVISION-aware filtering and occasion suggestions
export {filterByStyle, suggestForOccasion} from './stylist';

// OutingPlanner: full registry generation for two members
export {planOuting} from './outing-planner';
export type {OutingPlan} from './outing-planner';

// Procurement: purchase path routing with partner token generation
export {findProcurementPath, generateToken} from './procurement';
export type {ProcurementPath} from './procurement';

// PriceHunter: cross-source price intelligence
export {huntPrice} from './price-hunter';
export type {PriceResult} from './price-hunter';
