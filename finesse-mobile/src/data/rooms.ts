import {
  Hotel, Shirt, Briefcase, Gift, Eye, Scissors, Sparkles, ChefHat, Dumbbell,
  Clapperboard, Martini, Wine, Users, FlaskConical, Phone, Monitor, Gamepad2, Plane, TrendingUp, Store, Calendar,
  Lock, Scale, Building2, User, Crown, type LucideIcon,
} from 'lucide-react-native';

export type Room = { id: string; label: string; Icon: LucideIcon; wing: string; line: string; cta: string };
const r = (id: string, label: string, Icon: LucideIcon, wing: string, line: string, cta: string): Room => ({ id, label, Icon, wing, line, cta });

/** Left rail: Style & Shopping (from src/components/finesse-layout.tsx) */
export const RAIL_LEFT: Room[] = [
  r('lobby', 'Lobby', Hotel, 'ARRIVAL', '', ''),
  r('wardrobe', 'Wardrobe', Shirt, 'PRIVATE LIFE', 'Moving rail, editorial look cards, missing-piece intelligence.', 'COMPOSE A LOOK'),
  r('bag', 'Bag', Briefcase, 'PUBLIC FLOOR', 'Honest price desk, source visibility, price history, partner handoff.', 'REVIEW PURCHASE'),
  r('registry', 'Registry', Gift, 'PUBLIC FLOOR', 'Gold-ruled registry, occasion cards, outing-linked wish list.', 'ADD A WISH'),
  r('nightvision', 'NightVision', Eye, 'ORCHESTRATOR', 'Observatory of taste and behavior, explainable signals.', 'REVIEW MY PROFILE'),
  r('stylist', 'Stylist', Scissors, 'PRIVATE LIFE', 'Dressing room with note on mirror, AI shortlist plus human edit.', 'REVIEW THE BOX'),
  r('salon', 'Salon', Sparkles, 'PUBLIC FLOOR', 'Gold-framed appointment cards, soft lamp glow, ritual timeline.', 'CONFIRM APPOINTMENT'),
  r('kitchen', 'Kitchen', ChefHat, 'PRIVATE LIFE', 'Meal plan table, calorie ledger, one order.', 'CONFIRM THE ORDER'),
  r('gym', 'Gym', Dumbbell, 'PRIVATE LIFE', 'Private gym at dawn, set logging, rest timer, recovery light.', 'LOG THE SET'),
];
export const RAIL_LEFT_HIM: Room[] = [
  RAIL_LEFT[0], RAIL_LEFT[1], RAIL_LEFT[2],
  r('perdiem', 'Per Diem', Calendar, 'PRIVATE LIFE', 'Daily ritual, soft schedule, preparation journey.', 'COMPOSE TODAY'),
  RAIL_LEFT[4],
  r('market', 'Market', Store, 'PUBLIC FLOOR', 'Partner market, disclosed offers, honest prices.', 'BROWSE'),
  r('clubhouse', 'Game Room', Gamepad2, 'PUBLIC FLOOR', 'Club tables, circles, event boards.', 'JOIN A TABLE'),
  RAIL_LEFT[7], RAIL_LEFT[8],
];

/** Right rail: Experience & Intel */
export const RAIL_RIGHT: Room[] = [
  r('archive', 'Scrapbook', Clapperboard, 'PRIVATE LIFE', 'Cinematic memory vault, chapters, seasons, private media timeline.', 'OPEN A SEASON'),
  r('lounge', 'Lounge', Martini, 'PUBLIC FLOOR', 'Quiet hotel lounge, presence cards, close-circle updates.', 'SAY HELLO'),
  r('entourage', 'Entourage', Users, 'PRIVATE LIFE', 'Private relationship dossier, gifting context, quiet reminders.', 'PLAN FOR SOMEONE'),
  r('lab', 'Lab', FlaskConical, 'ORCHESTRATOR', 'Darkroom with one red light, job queue, approval gate.', 'CREATE AND APPROVE'),
  r('switchboard', 'Switchboard', Phone, 'ARRIVAL', 'Operator room, provider health lights, consent ledger, revoke controls.', 'CONNECT OR REVOKE'),
  r('backstage', 'Lair', Monitor, 'ORCHESTRATOR', 'Private dressing room, mirror, visibility toggles.', 'EDIT WHAT OTHERS SEE'),
  r('clubhouse', 'Game Room', Gamepad2, 'PUBLIC FLOOR', 'Club tables, circles, event boards, live-room entry.', 'JOIN A TABLE'),
  r('departures', 'Depart', Plane, 'ARRIVAL', 'Boarding pass in gold foil, composed itinerary, live weather.', 'COMPOSE A DEPARTURE'),
];
export const RAIL_RIGHT_HIM: Room[] = [
  RAIL_RIGHT[0], { ...RAIL_RIGHT[1], Icon: Wine }, RAIL_RIGHT[2], RAIL_RIGHT[3], RAIL_RIGHT[4], RAIL_RIGHT[5],
  r('carpe-diem', 'Carpe Diem', TrendingUp, 'PRIVATE LIFE', 'Sharper amber track, performance brief, portfolio.', "OPEN TODAY'S BRIEF"),
  RAIL_RIGHT[7],
];

/** Bottom dock: Commerce. Centre = Nova on/off. */
export const DOCK_LEFT: Room[] = [
  r('vault', 'Vault', Lock, 'ORCHESTRATOR', 'Visible safe, ledger drawers, rebate balance, transparent state labels.', 'VIEW BALANCE'),
  r('scale', 'Scale', Scale, 'PUBLIC FLOOR', 'Ticker that moves down, threshold ladder, group-buy demand meter.', 'JOIN CAMPAIGN'),
];
export const DOCK_RIGHT: Room[] = [
  r('exchange', 'Exchange', TrendingUp, 'PUBLIC FLOOR', 'Consignment desk, provenance, offer envelopes.', 'LIST AN ITEM'),
  r('embassy', 'Embassy', Building2, 'ARRIVAL', 'Brand desk, disclosed offers, partner dossier.', 'REVIEW AN OFFER'),
];

export const EXTRA: Room[] = [
  r('closet', 'The Closet', Shirt, 'PRIVATE LIFE', 'Inside-lit closet, turning rack, weekly rotation, missing piece callout.', 'APPROVE THE WEEK'),
  r('profile', 'This Is You', User, 'PRIVATE LIFE', 'Portrait room. Your stats, how others see you, your traffic.', 'EDIT WHAT OTHERS SEE'),
  r('vip', 'VIP Room', Crown, 'ORCHESTRATOR', 'The inner room. Private channel, human escalation, the lift.', 'OPEN PRIVATE CHANNEL'),
];

const ALL = [...RAIL_LEFT, ...RAIL_LEFT_HIM, ...RAIL_RIGHT, ...RAIL_RIGHT_HIM, ...DOCK_LEFT, ...DOCK_RIGHT, ...EXTRA];
export const findRoom = (id: string) => ALL.find((x) => x.id === id);

/** id → route */
export const routeFor = (id: string) =>
  id === 'lobby' ? '/lobby' : id === 'closet' ? '/closet' : id === 'profile' ? '/profile' : id === 'vip' ? '/vip' : `/room/${id}`;
