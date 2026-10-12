'use client';

import {useState} from 'react';
import {PenthouseScene} from '@/app/(hotel)/vip/penthouse/penthouse-scene';

export function PenthousePreview() {
  const [expiresAt] = useState(() => new Date(Date.now() + 45 * 60e3).toISOString());
  return <PenthouseScene expiresAt={expiresAt} />;
}
