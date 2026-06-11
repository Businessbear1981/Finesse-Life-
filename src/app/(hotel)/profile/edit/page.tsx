'use client';

import {useState, useEffect, useRef, useCallback} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase/client';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PublicForm {
  display_name: string;
  bio: string;
  city: string;
  vibe: string;
  telegram_handle: string;
  avatar_url: string;
  public_photos: (string | null)[];
  instagram: string;
  twitter: string;
}

interface PrivateForm {
  private_display_name: string;
  private_bio: string;
  private_vibe: string;
  private_avatar_url: string;
  private_photos: (string | null)[];
  has_private_profile: boolean;
}

const VIBES = [
  'Electric',
  'Intimate',
  'Mysterious',
  'Playful',
  'Luxe',
  'Untamed',
];

const EMPTY_PHOTOS = (): (string | null)[] => Array(6).fill(null);

// ─── Sub-components ──────────────────────────────────────────────────────────

function AvatarUpload({
  preview,
  uploading,
  onPick,
  label,
}: {
  preview: string;
  uploading: boolean;
  onPick: () => void;
  label?: string;
}) {
  return (
    <div className="flex flex-col items-center mb-8">
      <button
        type="button"
        onClick={onPick}
        className="relative w-24 h-24 rounded-full overflow-hidden group mb-3 flex items-center justify-center"
        style={{
          border: '2px solid rgba(201,169,97,0.4)',
          background: 'linear-gradient(135deg, #1A0A0D, #2A1020)',
        }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          <span className="font-display text-3xl" style={{color: 'rgba(201,169,97,0.5)'}}>
            +
          </span>
        )}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{background: 'rgba(10,4,6,0.7)'}}
        >
          <span
            className="font-label text-[8px] tracking-wider uppercase"
            style={{color: 'rgba(201,169,97,0.8)'}}
          >
            {uploading ? 'uploading...' : 'change'}
          </span>
        </div>
      </button>
      <p className="font-body text-xs italic" style={{color: 'rgba(244,232,208,0.2)'}}>
        {label ?? 'tap to change photo'}
      </p>
    </div>
  );
}

function PhotoGrid({
  photos,
  uploading,
  onSlotClick,
  onSlotRemove,
}: {
  photos: (string | null)[];
  uploading: number | null; // slot index being uploaded
  onSlotClick: (idx: number) => void;
  onSlotRemove: (idx: number) => void;
}) {
  return (
    <div>
      <label
        className="block font-label text-[9px] tracking-[0.3em] uppercase mb-3"
        style={{color: 'rgba(201,169,97,0.4)'}}
      >
        Photos <span style={{color: 'rgba(244,232,208,0.2)', fontFamily: 'inherit'}}>up to 6</span>
      </label>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((url, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => (url ? onSlotRemove(idx) : onSlotClick(idx))}
            className="relative aspect-square overflow-hidden flex items-center justify-center group"
            style={{
              border: url
                ? '1px solid rgba(201,169,97,0.3)'
                : '1px dashed rgba(201,169,97,0.15)',
              background: 'rgba(13,8,9,0.8)',
            }}
          >
            {uploading === idx ? (
              <span
                className="font-label text-[8px] tracking-widest uppercase animate-pulse"
                style={{color: 'rgba(201,169,97,0.5)'}}
              >
                uploading
              </span>
            ) : url ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`photo ${idx + 1}`} className="w-full h-full object-cover" />
                <div
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{background: 'rgba(10,4,6,0.75)'}}
                >
                  <span
                    className="font-label text-[8px] tracking-widest uppercase"
                    style={{color: 'rgba(255,77,125,0.8)'}}
                  >
                    remove
                  </span>
                </div>
              </>
            ) : (
              <span
                className="font-display text-2xl"
                style={{color: 'rgba(201,169,97,0.2)'}}
              >
                +
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function VibeSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label
        className="block font-label text-[9px] tracking-[0.3em] uppercase mb-3"
        style={{color: 'rgba(201,169,97,0.4)'}}
      >
        Vibe
      </label>
      <div className="grid grid-cols-3 gap-2">
        {VIBES.map((v) => {
          const active = value === v.toLowerCase();
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v.toLowerCase())}
              className="py-2 font-label text-[9px] tracking-[0.25em] uppercase transition-all duration-200"
              style={{
                background: active ? 'rgba(201,169,97,0.15)' : 'rgba(13,8,9,0.8)',
                border: active
                  ? '1px solid rgba(201,169,97,0.5)'
                  : '1px solid rgba(201,169,97,0.1)',
                color: active ? '#C9A961' : 'rgba(244,232,208,0.3)',
              }}
            >
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FieldLabel({children}: {children: React.ReactNode}) {
  return (
    <label
      className="block font-label text-[9px] tracking-[0.3em] uppercase mb-2"
      style={{color: 'rgba(201,169,97,0.4)'}}
    >
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(13,8,9,0.8)',
  border: '1px solid rgba(201,169,97,0.12)',
  color: '#F4E8D0',
  caretColor: '#C9A961',
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  // Tab state
  const [activeTab, setActiveTab] = useState<'public' | 'private'>('public');

  // Auth / meta
  const [userId, setUserId] = useState('');
  const [isVip, setIsVip] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);

  // Public form
  const [pub, setPub] = useState<PublicForm>({
    display_name: '',
    bio: '',
    city: '',
    vibe: '',
    telegram_handle: '',
    avatar_url: '',
    public_photos: EMPTY_PHOTOS(),
    instagram: '',
    twitter: '',
  });
  const [pubAvatarPreview, setPubAvatarPreview] = useState('');
  const [uploadingPubAvatar, setUploadingPubAvatar] = useState(false);
  const [uploadingPubPhoto, setUploadingPubPhoto] = useState<number | null>(null);

  // Private form
  const [priv, setPriv] = useState<PrivateForm>({
    private_display_name: '',
    private_bio: '',
    private_vibe: '',
    private_avatar_url: '',
    private_photos: EMPTY_PHOTOS(),
    has_private_profile: false,
  });
  const [privAvatarPreview, setPrivAvatarPreview] = useState('');
  const [uploadingPrivAvatar, setUploadingPrivAvatar] = useState(false);
  const [uploadingPrivPhoto, setUploadingPrivPhoto] = useState<number | null>(null);
  const [privPreviewMode, setPrivPreviewMode] = useState(false);

  // File input refs
  const pubAvatarRef = useRef<HTMLInputElement>(null);
  const pubPhotoRef = useRef<HTMLInputElement>(null);
  const privAvatarRef = useRef<HTMLInputElement>(null);
  const privPhotoRef = useRef<HTMLInputElement>(null);
  const pendingPhotoSlot = useRef<{target: 'pub' | 'priv'; idx: number} | null>(null);

  // ── Load profile ───────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const {
        data: {user},
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      setUserId(user.id);

      const {data} = await supabase
        .from('profiles')
        .select(
          'display_name, bio, city, vibe, telegram_handle, avatar_url, public_photos, public_links, is_vip, vip_expires_at, private_display_name, private_bio, private_vibe, private_avatar_url, private_photos, has_private_profile',
        )
        .eq('id', user.id)
        .single();

      if (data) {
        const vipActive =
          data.is_vip &&
          (data.vip_expires_at === null || new Date(data.vip_expires_at) > new Date());
        setIsVip(!!vipActive);

        const rawPubPhotos = Array.isArray(data.public_photos) ? data.public_photos : [];
        const pubPhotos: (string | null)[] = Array(6)
          .fill(null)
          .map((_, i) => rawPubPhotos[i] ?? null);

        const links = data.public_links as Record<string, string> | null;

        setPub({
          display_name: data.display_name ?? '',
          bio: data.bio ?? '',
          city: data.city ?? '',
          vibe: data.vibe ?? '',
          telegram_handle: data.telegram_handle ?? '',
          avatar_url: data.avatar_url ?? '',
          public_photos: pubPhotos,
          instagram: links?.instagram ?? '',
          twitter: links?.twitter ?? '',
        });
        setPubAvatarPreview(data.avatar_url ?? '');

        const rawPrivPhotos = Array.isArray(data.private_photos) ? data.private_photos : [];
        const privPhotos: (string | null)[] = Array(6)
          .fill(null)
          .map((_, i) => rawPrivPhotos[i] ?? null);

        setPriv({
          private_display_name: data.private_display_name ?? '',
          private_bio: data.private_bio ?? '',
          private_vibe: data.private_vibe ?? '',
          private_avatar_url: data.private_avatar_url ?? '',
          private_photos: privPhotos,
          has_private_profile: data.has_private_profile ?? false,
        });
        setPrivAvatarPreview(data.private_avatar_url ?? '');
      }
      setLoading(false);
    };
    load();
  }, [supabase, router]);

  // ── Upload helpers ─────────────────────────────────────────────────────────
  const uploadFile = useCallback(
    async (file: File, type: string): Promise<string | null> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      formData.append('userId', userId);
      const res = await fetch('/api/upload', {method: 'POST', body: formData});
      const data = (await res.json()) as {url?: string; error?: string};
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Upload failed.');
        return null;
      }
      return data.url;
    },
    [userId],
  );

  const handlePubAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setPubAvatarPreview(URL.createObjectURL(file));
    setUploadingPubAvatar(true);
    setError('');
    const url = await uploadFile(file, 'avatar');
    if (url) {
      setPub((p) => ({...p, avatar_url: url}));
      setPubAvatarPreview(url);
    } else {
      setPubAvatarPreview(pub.avatar_url);
    }
    setUploadingPubAvatar(false);
  };

  const handlePrivAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setPrivAvatarPreview(URL.createObjectURL(file));
    setUploadingPrivAvatar(true);
    setError('');
    const url = await uploadFile(file, 'private-avatar');
    if (url) {
      setPriv((p) => ({...p, private_avatar_url: url}));
      setPrivAvatarPreview(url);
    } else {
      setPrivAvatarPreview(priv.private_avatar_url);
    }
    setUploadingPrivAvatar(false);
  };

  const handlePhotoChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'pub' | 'priv',
    idx: number,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setError('');

    if (target === 'pub') {
      setUploadingPubPhoto(idx);
      const url = await uploadFile(file, 'photo');
      if (url) {
        setPub((p) => {
          const next = [...p.public_photos];
          next[idx] = url;
          return {...p, public_photos: next};
        });
      }
      setUploadingPubPhoto(null);
    } else {
      setUploadingPrivPhoto(idx);
      const url = await uploadFile(file, 'private-photo');
      if (url) {
        setPriv((p) => {
          const next = [...p.private_photos];
          next[idx] = url;
          return {...p, private_photos: next};
        });
      }
      setUploadingPrivPhoto(null);
    }
  };

  const triggerPhotoSlot = (target: 'pub' | 'priv', idx: number) => {
    pendingPhotoSlot.current = {target, idx};
    if (target === 'pub') pubPhotoRef.current?.click();
    else privPhotoRef.current?.click();
  };

  const removePhoto = (target: 'pub' | 'priv', idx: number) => {
    if (target === 'pub') {
      setPub((p) => {
        const next = [...p.public_photos];
        next[idx] = null;
        return {...p, public_photos: next};
      });
    } else {
      setPriv((p) => {
        const next = [...p.private_photos];
        next[idx] = null;
        return {...p, private_photos: next};
      });
    }
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (saving || uploadingPubAvatar || uploadingPrivAvatar) return;
    setSaving(true);
    setError('');

    let body: Record<string, unknown>;

    if (activeTab === 'public') {
      const links: Record<string, string> = {};
      if (pub.instagram.trim()) links.instagram = pub.instagram.trim().replace(/^@/, '');
      if (pub.twitter.trim()) links.twitter = pub.twitter.trim().replace(/^@/, '');

      body = {
        display_name: pub.display_name.trim() || null,
        bio: pub.bio.trim() || null,
        city: pub.city.trim() || null,
        vibe: pub.vibe || null,
        telegram_handle: pub.telegram_handle.trim() || null,
        avatar_url: pub.avatar_url || null,
        public_photos: pub.public_photos.filter(Boolean),
        public_links: Object.keys(links).length > 0 ? links : null,
      };
    } else {
      body = {
        has_private_profile: priv.has_private_profile,
        private_display_name: priv.private_display_name.trim() || null,
        private_bio: priv.private_bio.trim() || null,
        private_vibe: priv.private_vibe || null,
        private_avatar_url: priv.private_avatar_url || null,
        private_photos: priv.private_photos.filter(Boolean),
      };
    }

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {error?: string};

      if (!res.ok) {
        setError(data.error ?? 'Save failed.');
      } else {
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2200);
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: '#0A0406'}}>
        <span
          className="font-label text-[9px] tracking-[0.3em] uppercase animate-pulse"
          style={{color: 'rgba(201,169,97,0.3)'}}
        >
          loading
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{background: '#0A0406'}}>
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[250px]"
          style={{
            background:
              'radial-gradient(ellipse at top, rgba(201,169,97,0.05) 0%, transparent 60%)',
          }}
        />
      </div>

      {/* Hidden file inputs */}
      <input
        ref={pubAvatarRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePubAvatarChange}
      />
      <input
        ref={privAvatarRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePrivAvatarChange}
      />
      <input
        ref={pubPhotoRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const slot = pendingPhotoSlot.current;
          if (slot?.target === 'pub') handlePhotoChange(e, 'pub', slot.idx);
        }}
      />
      <input
        ref={privPhotoRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const slot = pendingPhotoSlot.current;
          if (slot?.target === 'priv') handlePhotoChange(e, 'priv', slot.idx);
        }}
      />

      <div className="relative z-10 max-w-lg mx-auto px-5 pt-10 pb-24">
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="font-display text-3xl tracking-[0.2em] mb-1"
            style={{color: '#E8C87A', textShadow: '0 0 20px rgba(201,169,97,0.15)'}}
          >
            Profile Builder
          </h1>
          <p
            className="font-label text-[9px] tracking-[0.4em] uppercase"
            style={{color: 'rgba(201,169,97,0.25)'}}
          >
            shape your presence
          </p>
        </div>

        {/* ── Tab switcher ── */}
        <div
          className="flex mb-8"
          style={{borderBottom: '1px solid rgba(201,169,97,0.1)'}}
        >
          {(['public', 'private'] as const).map((tab) => {
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className="relative flex-1 py-3 font-label text-[9px] tracking-[0.35em] uppercase transition-colors duration-200"
                style={{
                  color: active ? '#C9A961' : 'rgba(244,232,208,0.2)',
                  background: 'transparent',
                }}
              >
                {tab === 'private' ? (
                  <>
                    Backstage{' '}
                    <span
                      style={{
                        fontSize: '8px',
                        letterSpacing: '0.15em',
                        color: active ? '#FF4D7D' : 'rgba(255,77,125,0.35)',
                        verticalAlign: 'middle',
                      }}
                    >
                      ✦ VIP
                    </span>
                  </>
                ) : (
                  'Frontstage'
                )}
                {/* Active underline */}
                {active && (
                  <span
                    className="absolute bottom-0 left-0 w-full h-[2px]"
                    style={{background: '#C9A961'}}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* ════════════════════════════════════════════
            PUBLIC TAB
        ════════════════════════════════════════════ */}
        {activeTab === 'public' && (
          <div className="space-y-6">
            {/* Avatar */}
            <AvatarUpload
              preview={pubAvatarPreview}
              uploading={uploadingPubAvatar}
              onPick={() => pubAvatarRef.current?.click()}
              label="tap to change photo"
            />

            {/* Photo grid */}
            <PhotoGrid
              photos={pub.public_photos}
              uploading={uploadingPubPhoto}
              onSlotClick={(idx) => triggerPhotoSlot('pub', idx)}
              onSlotRemove={(idx) => removePhoto('pub', idx)}
            />

            {/* Display name */}
            <div>
              <FieldLabel>Display Name</FieldLabel>
              <input
                type="text"
                value={pub.display_name}
                onChange={(e) => setPub((p) => ({...p, display_name: e.target.value}))}
                placeholder="Your name"
                className="w-full px-4 py-3 font-body text-sm placeholder:opacity-20 focus:outline-none"
                style={inputStyle}
              />
            </div>

            {/* Bio */}
            <div>
              <FieldLabel>
                Bio{' '}
                <span
                  style={{
                    color:
                      pub.bio.length > 180
                        ? 'rgba(255,77,125,0.6)'
                        : 'rgba(244,232,208,0.2)',
                    fontFamily: 'inherit',
                    letterSpacing: 'normal',
                    textTransform: 'none',
                  }}
                >
                  {pub.bio.length}/200
                </span>
              </FieldLabel>
              <textarea
                value={pub.bio}
                onChange={(e) => {
                  if (e.target.value.length <= 200)
                    setPub((p) => ({...p, bio: e.target.value}));
                }}
                placeholder="A few words about you..."
                rows={3}
                className="w-full px-4 py-3 font-body text-sm placeholder:opacity-20 focus:outline-none resize-none"
                style={inputStyle}
              />
            </div>

            {/* City */}
            <div>
              <FieldLabel>City</FieldLabel>
              <input
                type="text"
                value={pub.city}
                onChange={(e) => setPub((p) => ({...p, city: e.target.value}))}
                placeholder="e.g. New York"
                className="w-full px-4 py-3 font-body text-sm placeholder:opacity-20 focus:outline-none"
                style={inputStyle}
              />
            </div>

            {/* Vibe */}
            <VibeSelector
              value={pub.vibe}
              onChange={(v) => setPub((p) => ({...p, vibe: v}))}
            />

            {/* Social links */}
            <div className="space-y-3">
              <FieldLabel>Social Links (optional)</FieldLabel>
              {/* Instagram */}
              <div
                className="flex items-center overflow-hidden"
                style={{...inputStyle, border: '1px solid rgba(201,169,97,0.12)'}}
              >
                <span
                  className="px-3 py-3 font-mono text-xs select-none whitespace-nowrap"
                  style={{
                    color: 'rgba(201,169,97,0.35)',
                    borderRight: '1px solid rgba(201,169,97,0.08)',
                  }}
                >
                  IG @
                </span>
                <input
                  type="text"
                  value={pub.instagram}
                  onChange={(e) =>
                    setPub((p) => ({...p, instagram: e.target.value.replace(/^@/, '')}))
                  }
                  placeholder="yourhandle"
                  className="flex-1 px-3 py-3 bg-transparent font-body text-sm placeholder:opacity-20 focus:outline-none"
                  style={{color: '#F4E8D0', caretColor: '#C9A961'}}
                />
              </div>
              {/* Twitter */}
              <div
                className="flex items-center overflow-hidden"
                style={{...inputStyle, border: '1px solid rgba(201,169,97,0.12)'}}
              >
                <span
                  className="px-3 py-3 font-mono text-xs select-none whitespace-nowrap"
                  style={{
                    color: 'rgba(201,169,97,0.35)',
                    borderRight: '1px solid rgba(201,169,97,0.08)',
                  }}
                >
                  𝕏 @
                </span>
                <input
                  type="text"
                  value={pub.twitter}
                  onChange={(e) =>
                    setPub((p) => ({...p, twitter: e.target.value.replace(/^@/, '')}))
                  }
                  placeholder="yourhandle"
                  className="flex-1 px-3 py-3 bg-transparent font-body text-sm placeholder:opacity-20 focus:outline-none"
                  style={{color: '#F4E8D0', caretColor: '#C9A961'}}
                />
              </div>
            </div>

            {/* Telegram */}
            <div>
              <FieldLabel>Telegram Handle</FieldLabel>
              <div
                className="flex items-center overflow-hidden"
                style={{...inputStyle, border: '1px solid rgba(201,169,97,0.12)'}}
              >
                <span
                  className="px-3 py-3 font-mono text-sm select-none"
                  style={{
                    color: 'rgba(201,169,97,0.35)',
                    borderRight: '1px solid rgba(201,169,97,0.08)',
                  }}
                >
                  @
                </span>
                <input
                  type="text"
                  value={pub.telegram_handle.replace(/^@/, '')}
                  onChange={(e) =>
                    setPub((p) => ({
                      ...p,
                      telegram_handle: e.target.value.replace(/^@/, ''),
                    }))
                  }
                  placeholder="yourusername"
                  className="flex-1 px-3 py-3 bg-transparent font-body text-sm placeholder:opacity-20 focus:outline-none"
                  style={{color: '#F4E8D0', caretColor: '#C9A961'}}
                />
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════
            PRIVATE TAB
        ════════════════════════════════════════════ */}
        {activeTab === 'private' && (
          <div>
            {/* Non-VIP gate */}
            {!isVip ? (
              <div
                className="relative overflow-hidden py-12 px-6 text-center"
                style={{
                  border: '1px solid rgba(255,77,125,0.15)',
                  background: 'rgba(74,25,34,0.08)',
                }}
              >
                {/* blurred ghost content */}
                <div className="absolute inset-0 pointer-events-none" style={{filter: 'blur(6px)', opacity: 0.15}}>
                  <div className="w-16 h-16 rounded-full mx-auto mb-4" style={{background: 'rgba(201,169,97,0.3)'}} />
                  <div className="h-3 w-32 mx-auto mb-2" style={{background: 'rgba(201,169,97,0.2)'}} />
                  <div className="h-2 w-48 mx-auto" style={{background: 'rgba(201,169,97,0.15)'}} />
                </div>

                <span
                  className="relative inline-block px-4 py-1 font-label text-[8px] tracking-[0.35em] uppercase mb-4"
                  style={{
                    background: 'rgba(255,77,125,0.12)',
                    border: '1px solid rgba(255,77,125,0.3)',
                    color: '#FF4D7D',
                  }}
                >
                  VIP Only
                </span>
                <p
                  className="relative font-display text-xl tracking-wide mb-2"
                  style={{color: 'rgba(228,200,122,0.7)'}}
                >
                  Backstage
                </p>
                <p
                  className="relative font-body text-sm italic leading-relaxed"
                  style={{color: 'rgba(244,232,208,0.35)'}}
                >
                  A second private persona — different name, private photos, different energy.
                  Yours to control. Seen only by VIP members you allow in.
                </p>
                <Link
                  href="/profile?upgrade=true"
                  className="relative inline-block mt-6 px-6 py-3 font-label text-[9px] tracking-[0.35em] uppercase transition-all duration-300"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,77,125,0.15), rgba(74,25,34,0.3))',
                    border: '1px solid rgba(255,77,125,0.3)',
                    color: '#FF4D7D',
                  }}
                >
                  Unlock VIP
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Enable toggle */}
                <div
                  className="flex items-center justify-between px-4 py-4"
                  style={{
                    border: '1px solid rgba(201,169,97,0.12)',
                    background: 'rgba(13,8,9,0.6)',
                  }}
                >
                  <div>
                    <p
                      className="font-label text-[9px] tracking-[0.3em] uppercase"
                      style={{color: 'rgba(201,169,97,0.6)'}}
                    >
                      Open Backstage
                    </p>
                    <p
                      className="font-body text-xs italic mt-0.5"
                      style={{color: 'rgba(244,232,208,0.25)'}}
                    >
                      VIP members can find you backstage
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setPriv((p) => ({...p, has_private_profile: !p.has_private_profile}))
                    }
                    className="relative w-12 h-6 transition-all duration-300"
                    style={{
                      background: priv.has_private_profile
                        ? 'rgba(201,169,97,0.3)'
                        : 'rgba(13,8,9,0.9)',
                      border: priv.has_private_profile
                        ? '1px solid rgba(201,169,97,0.5)'
                        : '1px solid rgba(201,169,97,0.2)',
                      borderRadius: '3px',
                    }}
                  >
                    <span
                      className="absolute top-0.5 w-4 h-4 transition-all duration-300"
                      style={{
                        background: priv.has_private_profile ? '#C9A961' : 'rgba(201,169,97,0.3)',
                        left: priv.has_private_profile ? 'calc(100% - 18px)' : '2px',
                      }}
                    />
                  </button>
                </div>

                {/* Private profile fields — only when enabled */}
                {priv.has_private_profile && (
                  <>
                    {/* Preview toggle */}
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => setPrivPreviewMode((v) => !v)}
                        className="font-label text-[8px] tracking-[0.3em] uppercase transition-colors"
                        style={{
                          color: privPreviewMode
                            ? '#C9A961'
                            : 'rgba(201,169,97,0.35)',
                        }}
                      >
                        {privPreviewMode ? '← Edit' : 'Preview VIP View →'}
                      </button>
                    </div>

                    {privPreviewMode ? (
                      /* ── VIP Preview ── */
                      <div
                        className="p-6 space-y-4"
                        style={{
                          border: '1px solid rgba(255,77,125,0.15)',
                          background: 'rgba(74,25,34,0.06)',
                        }}
                      >
                        <p
                          className="font-label text-[8px] tracking-[0.35em] uppercase text-center mb-4"
                          style={{color: 'rgba(255,77,125,0.5)'}}
                        >
                          — VIP Preview —
                        </p>
                        {privAvatarPreview && (
                          <div className="flex justify-center">
                            <div
                              className="w-20 h-20 rounded-full overflow-hidden"
                              style={{border: '2px solid rgba(255,77,125,0.4)'}}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={privAvatarPreview}
                                alt="private avatar"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        )}
                        {priv.private_display_name && (
                          <p
                            className="text-center font-display text-2xl tracking-wide"
                            style={{color: '#E8C87A'}}
                          >
                            {priv.private_display_name}
                          </p>
                        )}
                        {priv.private_vibe && (
                          <div className="flex justify-center">
                            <span
                              className="px-3 py-1 font-label text-[8px] tracking-[0.3em] uppercase"
                              style={{
                                background: 'rgba(255,77,125,0.08)',
                                border: '1px solid rgba(255,77,125,0.2)',
                                color: '#FF4D7D',
                              }}
                            >
                              {priv.private_vibe}
                            </span>
                          </div>
                        )}
                        {priv.private_bio && (
                          <p
                            className="font-body text-sm leading-relaxed text-center"
                            style={{color: 'rgba(244,232,208,0.5)'}}
                          >
                            {priv.private_bio}
                          </p>
                        )}
                        {priv.private_photos.some(Boolean) && (
                          <div className="grid grid-cols-3 gap-1.5 mt-4">
                            {priv.private_photos
                              .filter(Boolean)
                              .map((url, i) =>
                                url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    key={i}
                                    src={url}
                                    alt={`private ${i}`}
                                    className="aspect-square object-cover w-full"
                                    style={{border: '1px solid rgba(255,77,125,0.1)'}}
                                  />
                                ) : null,
                              )}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* ── Private edit fields ── */
                      <>
                        {/* Private avatar */}
                        <AvatarUpload
                          preview={privAvatarPreview}
                          uploading={uploadingPrivAvatar}
                          onPick={() => privAvatarRef.current?.click()}
                          label="private photo (VIP only)"
                        />

                        {/* Private photo grid */}
                        <PhotoGrid
                          photos={priv.private_photos}
                          uploading={uploadingPrivPhoto}
                          onSlotClick={(idx) => triggerPhotoSlot('priv', idx)}
                          onSlotRemove={(idx) => removePhoto('priv', idx)}
                        />

                        {/* Private name */}
                        <div>
                          <FieldLabel>What do they call you in here?</FieldLabel>
                          <input
                            type="text"
                            value={priv.private_display_name}
                            onChange={(e) =>
                              setPriv((p) => ({
                                ...p,
                                private_display_name: e.target.value,
                              }))
                            }
                            placeholder="Alter ego, real name, whatever fits..."
                            className="w-full px-4 py-3 font-body text-sm placeholder:opacity-20 focus:outline-none"
                            style={{
                              ...inputStyle,
                              border: '1px solid rgba(255,77,125,0.12)',
                            }}
                          />
                        </div>

                        {/* Private bio */}
                        <div>
                          <FieldLabel>
                            Private Bio{' '}
                            <span
                              style={{
                                color:
                                  priv.private_bio.length > 360
                                    ? 'rgba(255,77,125,0.6)'
                                    : 'rgba(244,232,208,0.2)',
                                fontFamily: 'inherit',
                                letterSpacing: 'normal',
                                textTransform: 'none',
                              }}
                            >
                              {priv.private_bio.length}/400
                            </span>
                          </FieldLabel>
                          <textarea
                            value={priv.private_bio}
                            onChange={(e) => {
                              if (e.target.value.length <= 400)
                                setPriv((p) => ({...p, private_bio: e.target.value}));
                            }}
                            placeholder="More intimate. More real. More you."
                            rows={4}
                            className="w-full px-4 py-3 font-body text-sm placeholder:opacity-20 focus:outline-none resize-none"
                            style={{
                              ...inputStyle,
                              border: '1px solid rgba(255,77,125,0.12)',
                            }}
                          />
                        </div>

                        {/* Private vibe */}
                        <div>
                          <FieldLabel>Private Vibe</FieldLabel>
                          <div className="grid grid-cols-3 gap-2">
                            {VIBES.map((v) => {
                              const vl = v.toLowerCase();
                              const active = priv.private_vibe === vl;
                              return (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => setPriv((p) => ({...p, private_vibe: vl}))}
                                  className="py-2 font-label text-[9px] tracking-[0.25em] uppercase transition-all duration-200"
                                  style={{
                                    background: active
                                      ? 'rgba(255,77,125,0.1)'
                                      : 'rgba(13,8,9,0.8)',
                                    border: active
                                      ? '1px solid rgba(255,77,125,0.4)'
                                      : '1px solid rgba(201,169,97,0.1)',
                                    color: active
                                      ? '#FF4D7D'
                                      : 'rgba(244,232,208,0.3)',
                                  }}
                                >
                                  {v}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <p
            className="mt-5 font-body text-sm italic"
            style={{color: 'rgba(255,77,125,0.7)'}}
          >
            {error}
          </p>
        )}

        {/* ── Save button ── */}
        {(activeTab === 'public' || isVip) && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || uploadingPubAvatar || uploadingPrivAvatar}
            className="w-full mt-8 py-4 font-label text-[10px] tracking-[0.4em] uppercase transition-all duration-300 disabled:opacity-30"
            style={{
              background: savedFlash
                ? 'rgba(201,169,97,0.15)'
                : saving
                  ? 'rgba(201,169,97,0.1)'
                  : 'linear-gradient(135deg, #C9A961, #E8C87A)',
              color: savedFlash || saving ? '#C9A961' : '#0A0406',
              border: savedFlash ? '1px solid rgba(201,169,97,0.4)' : 'none',
            }}
          >
            {savedFlash ? 'Saved ✓' : saving ? 'saving...' : 'Save Changes'}
          </button>
        )}

        <div className="text-center mt-6">
          <Link
            href="/profile"
            className="font-body text-sm italic transition-colors"
            style={{color: 'rgba(244,232,208,0.2)'}}
          >
            ← back to profile
          </Link>
        </div>
      </div>
    </div>
  );
}
