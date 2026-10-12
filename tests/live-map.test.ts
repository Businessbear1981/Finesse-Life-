import {describe, expect, it} from 'vitest';
import {bboxAround, bboxParam, parseBbox, parseNewEvent, toDot, validLatLng} from '@/lib/live-map';

describe('live map validation', () => {
  it('accepts real coordinates and rejects junk', () => {
    expect(validLatLng(40.74, -73.99)).toEqual({lat: 40.74, lng: -73.99});
    expect(validLatLng(NaN, 0)).toBeNull();
    expect(validLatLng('40', '-73')).toBeNull();
    expect(validLatLng(86, 0)).toBeNull();
    expect(validLatLng(0, 181)).toBeNull();
  });

  it('parses a GeoJSON-order bbox and enforces the span limit', () => {
    expect(parseBbox('-74.02,40.70,-73.93,40.80')).toEqual({minLng: -74.02, minLat: 40.7, maxLng: -73.93, maxLat: 40.8});
    expect(parseBbox(null)).toBeNull();
    expect(parseBbox('1,2,3')).toBeNull();
    expect(parseBbox('-74,40,-73.9,,')).toBeNull();
    expect(parseBbox('-73.9,40.8,-74,40.7')).toBeNull(); // inverted
    expect(parseBbox('-75,40,-73,41')).toBeNull(); // 2° wide
  });

  it('round-trips bboxAround through the query param', () => {
    const b = bboxAround(40.742, -73.99);
    expect(parseBbox(bboxParam(b))).not.toBeNull();
    expect(b.maxLat - b.minLat).toBeCloseTo(0.12);
  });

  it('validates staff events', () => {
    const ok = parseNewEvent({title: ' Rooftop ', lat: 40.7, lng: -73.9, startsAt: '2026-10-14T23:00:00Z', endsAt: '2026-10-15T03:00:00Z'});
    expect(ok).toMatchObject({title: 'Rooftop', venue: null, lat: 40.7});
    expect(parseNewEvent({title: '', lat: 1, lng: 1, startsAt: 'x', endsAt: 'y'})).toEqual({error: 'bad_title'});
    expect(parseNewEvent({title: 'a', lat: 99, lng: 1})).toEqual({error: 'bad_location'});
    expect(parseNewEvent({title: 'a', lat: 1, lng: 1, startsAt: '2026-10-15T03:00:00Z', endsAt: '2026-10-14T23:00:00Z'})).toEqual({error: 'bad_window'});
    expect(parseNewEvent({title: 'a', lat: 1, lng: 1, startsAt: '2026-10-01T00:00:00Z', endsAt: '2026-10-09T00:00:00Z'})).toEqual({error: 'bad_window'});
  });

  it('maps rows to dots, defaulting unknown kinds to neutral', () => {
    expect(toDot({lat: 1, lng: 2, kind: 'f'})).toEqual({lat: 1, lng: 2, kind: 'f'});
    expect(toDot({lat: 1, lng: 2, kind: 'zzz'})).toEqual({lat: 1, lng: 2, kind: 'x'});
    expect(toDot({lat: null, lng: 2, kind: 'm'})).toBeNull();
  });
});
