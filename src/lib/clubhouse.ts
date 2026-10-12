// Clubhouse — the games the house seats, their seat caps (mirrors 20261016_w2_clubhouse.sql) and the
// member copy for the board. Pure; shared by the API routes, the web room and tests. The mobile app
// keeps a mirror in mobile/src/lib/rooms/clubhouse.ts.

export const GAMES = ['poker', 'spades', 'dominoes', 'rummy', 'book'] as const;
export type Game = (typeof GAMES)[number];

export const GAME_INFO: Record<Game, {label: string; maxSeats: number; defaultSeats: number; blurb: string}> = {
  poker: {label: 'Poker', maxSeats: 10, defaultSeats: 6, blurb: 'Texas Hold’em for points'},
  spades: {label: 'Spades', maxSeats: 4, defaultSeats: 4, blurb: 'Partners, books to 500'},
  dominoes: {label: 'Dominoes', maxSeats: 4, defaultSeats: 4, blurb: 'Bones to 150'},
  rummy: {label: 'Rummy', maxSeats: 6, defaultSeats: 2, blurb: 'Gin rummy, best of three'},
  book: {label: 'The Book', maxSeats: 40, defaultSeats: 12, blurb: 'Members’ picks for points — no wagers'},
};

export type ClubTable = {
  id: string;
  game: Game;
  title: string;
  note: string | null;
  starts_at: string;
  seats: number;
  seats_taken: number;
  seated: boolean;
  is_host: boolean;
  host_name: string;
};

/** Database error message → member copy for a join / host attempt. */
export function clubErrorText(code: string | undefined): string {
  switch (code) {
    case 'table_full': return 'That table just filled up. Nothing changed.';
    case 'table_closed': return 'That table has closed. Nothing changed.';
    case 'not_found': return 'That table is no longer on the board.';
    case 'host_limit': return 'You already host five open tables — close one first.';
    case 'bad_start': return 'Pick a start time in the next 90 days.';
    case 'seats_below_taken': return 'More members are seated than that — pick a bigger table.';
    default: return 'The table couldn’t be updated just now. Nothing changed.';
  }
}

/** Map a Postgres error message from the clubhouse triggers to a short code. */
export function clubErrorCode(message: string | undefined): string | null {
  const m = /club_(table_full|table_closed|table_not_found|host_limit|bad_start|seats_below_taken)/.exec(message ?? '');
  if (!m) return null;
  return m[1] === 'table_not_found' ? 'not_found' : m[1];
}

export function seatsLeft(t: Pick<ClubTable, 'seats' | 'seats_taken'>) {
  return Math.max(0, t.seats - t.seats_taken);
}
