import {describe, expect, it} from 'vitest';
import {checkMediaUrls, screenFields, screenText} from '@/lib/moderation';

const reason = (t: string, kind?: 'post' | 'listing' | 'table') => {
  const v = screenText(t, kind);
  return v.verdict === 'reject' ? v.reason : 'ok';
};

describe('screenText', () => {
  it('lets ordinary conversation through', () => {
    for (const t of [
      'Who’s at Lucian tonight? The bar is perfect right now.',
      'Jazz Club late set starts 10:30. Worth it!',
      'Selling my 2019 loafers, size 10, worn twice — $250.',
      'Go die-hard fans of the Hawks, unite!',
      'Spades at midnight · trash talk welcome',
      'The new menu at Nove is a 10/10.',
      'Killed it at the gallery opening last night',
      'Follow the music upstairs.',
      'I’m going to find you a seat at the bar.',
    ]) expect(reason(t), t).toBe('ok');
  });

  it('rejects slurs, including disguised spellings', () => {
    expect(reason('you are a n1gger')).toBe('slur');
    expect(reason('what a f@ggot')).toBe('slur');
    expect(reason('retards everywhere')).toBe('slur');
  });

  it('rejects abuse and self-harm encouragement', () => {
    expect(reason('kys')).toBe('abuse');
    expect(reason('k y s loser')).toBe('abuse');
    expect(reason('just go die!')).toBe('abuse');
    expect(reason('kill yourself')).toBe('abuse');
  });

  it('rejects threats', () => {
    expect(reason("I'm going to hurt you")).toBe('threat');
    expect(reason('i know where you live')).toBe('threat');
    expect(reason('gonna shoot up the club')).toBe('threat');
  });

  it('rejects sexual solicitation', () => {
    expect(reason('send nudes')).toBe('sexual');
    expect(reason('sugar daddy wanted, dm me')).toBe('sexual');
    expect(reason('incall available tonight')).toBe('sexual');
  });

  it('keeps contact details and off-platform handles out of public posts', () => {
    expect(reason('call me 404-555-0123')).toBe('contact');
    expect(reason('email me at ava@example.com')).toBe('contact');
    expect(reason('add me on telegram')).toBe('contact');
    expect(reason('snap: ava.nights')).toBe('contact');
    expect(reason('IG @ava.nights for pics')).toBe('contact');
  });

  it('listings may say "DM me" but never carry phone numbers or emails', () => {
    expect(reason('DM me on instagram for more photos', 'listing')).toBe('ok');
    expect(reason('text 4045550123', 'listing')).toBe('contact');
  });

  it('rejects spam', () => {
    expect(reason('buy now https://a.example.ru and https://b.example.ru')).toBe('spam');
    expect(reason('free money free money free money free money free money free money free money free money')).toBe('spam');
    expect(reason('THIS IS THE BEST DEAL YOU WILL EVER SEE IN YOUR WHOLE ENTIRE LIFE')).toBe('spam');
    expect(reason('aaaaaaaaaaaaaaaaaaaaaa')).toBe('spam');
    expect(reason('Join my table — bit.ly/xyz', 'table')).toBe('spam');
  });

  it('screenFields reports the first rejected field', () => {
    expect(screenFields(['Loafers', 'kys'], 'listing')).toMatchObject({verdict: 'reject', reason: 'abuse'});
    expect(screenFields(['Loafers', null, undefined], 'listing')).toEqual({verdict: 'ok'});
  });
});

describe('checkMediaUrls', () => {
  const base = 'https://media.finesselife.vip';
  const me = '11111111-2222-4333-8444-555555555555';
  const other = '99999999-2222-4333-8444-555555555555';

  it('accepts the member’s own public uploads on our storage', () => {
    const r = checkMediaUrls([`${base}/posts/${me}/1700000000000-abcd1234.jpg`, `${base}/uploads/${me}/1-a.webp`], base, me);
    expect(r).toEqual({ok: true, urls: [`${base}/posts/${me}/1700000000000-abcd1234.jpg`, `${base}/uploads/${me}/1-a.webp`]});
    expect(checkMediaUrls(undefined, base, me)).toEqual({ok: true, urls: []});
    expect(checkMediaUrls([], '', me)).toEqual({ok: true, urls: []});
  });

  it('rejects outside hosts, other members’ files, private folders and tricks', () => {
    for (const u of [
      'https://evil.example.com/posts/x.jpg',
      `${base}.evil.com/posts/${me}/a.jpg`,
      `http://media.finesselife.vip/posts/${me}/a.jpg`,
      `${base}/posts/${other}/a.jpg`,
      `${base}/private-photos/${me}/a.jpg`,
      `${base}/posts/${me}/../${other}/a.jpg`,
      `${base}/posts/${me}/a.jpg?x=1`,
      `${base}/posts/${me}/a.svg`,
      'javascript:alert(1)',
    ]) expect(checkMediaUrls([u], base, me).ok, u).toBe(false);
    expect(checkMediaUrls('https://x', base, me).ok).toBe(false);
    expect(checkMediaUrls([1], base, me).ok).toBe(false);
    expect(checkMediaUrls(Array(5).fill(`${base}/posts/${me}/a.jpg`), base, me).ok).toBe(false);
  });

  it('rejects any media when storage is not configured', () => {
    expect(checkMediaUrls([`${base}/posts/${me}/a.jpg`], '', me).ok).toBe(false);
  });
});
