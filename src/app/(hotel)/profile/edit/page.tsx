'use client';

import {useState, useEffect, useRef} from 'react';
import {useRouter} from 'next/navigation';
import {createClient} from '@/lib/supabase/client';
import Link from 'next/link';

interface ProfileData {
  display_name: string;
  bio: string;
  city: string;
  telegram_handle: string;
  avatar_url: string;
}

export default function EditProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ProfileData>({
    display_name: '',
    bio: '',
    city: '',
    telegram_handle: '',
    avatar_url: '',
  });
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');

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
        .select('display_name, bio, city, telegram_handle, avatar_url')
        .eq('id', user.id)
        .single();

      if (data) {
        setForm({
          display_name: data.display_name ?? '',
          bio: data.bio ?? '',
          city: data.city ?? '',
          telegram_handle: data.telegram_handle ?? '',
          avatar_url: data.avatar_url ?? '',
        });
        setAvatarPreview(data.avatar_url ?? '');
      }
      setLoading(false);
    };
    load();
  }, [supabase, router]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const local = URL.createObjectURL(file);
    setAvatarPreview(local);
    setUploadingAvatar(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'avatar');
      formData.append('userId', userId);

      const res = await fetch('/api/upload', {method: 'POST', body: formData});
      const data = (await res.json()) as {url?: string; error?: string};

      if (!res.ok || !data.url) {
        setError(data.error ?? 'Avatar upload failed.');
        setAvatarPreview(form.avatar_url);
        return;
      }
      setForm((prev) => ({...prev, avatar_url: data.url!}));
      setAvatarPreview(data.url!);
    } catch {
      setError('Avatar upload failed. Try again.');
      setAvatarPreview(form.avatar_url);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (saving || uploadingAvatar) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          display_name: form.display_name.trim() || null,
          bio: form.bio.trim() || null,
          city: form.city.trim() || null,
          telegram_handle: form.telegram_handle.trim() || null,
          avatar_url: form.avatar_url || null,
        }),
      });
      const data = (await res.json()) as {error?: string};

      if (!res.ok) {
        setError(data.error ?? 'Save failed.');
      } else {
        setSuccess('Profile updated.');
        setTimeout(() => router.push('/profile'), 900);
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
    <div
      className="min-h-screen relative overflow-hidden"
      style={{background: '#0A0406'}}
    >
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

      <div className="relative z-10 max-w-lg mx-auto px-5 pt-10 pb-20">
        {/* Header */}
        <div className="text-center mb-10">
          <h1
            className="font-display text-3xl tracking-[0.2em] mb-2"
            style={{color: '#E8C87A', textShadow: '0 0 20px rgba(201,169,97,0.15)'}}
          >
            Edit Profile
          </h1>
          <p
            className="font-label text-[9px] tracking-[0.4em] uppercase"
            style={{color: 'rgba(201,169,97,0.25)'}}
          >
            your details
          </p>
        </div>

        {/* ── Avatar ── */}
        <div className="flex flex-col items-center mb-8">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative w-24 h-24 rounded-full overflow-hidden group mb-3"
            style={{
              border: '2px solid rgba(201,169,97,0.4)',
              background: 'linear-gradient(135deg, #1A0A0D, #2A1020)',
            }}
          >
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarPreview}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span
                className="font-display text-3xl"
                style={{color: 'rgba(201,169,97,0.5)'}}
              >
                +
              </span>
            )}
            {/* Hover overlay */}
            <div
              className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{background: 'rgba(10,4,6,0.7)'}}
            >
              {uploadingAvatar ? (
                <span
                  className="font-label text-[8px] tracking-wider uppercase animate-pulse"
                  style={{color: 'rgba(201,169,97,0.8)'}}
                >
                  uploading
                </span>
              ) : (
                <span
                  className="font-label text-[8px] tracking-wider uppercase"
                  style={{color: 'rgba(201,169,97,0.8)'}}
                >
                  change
                </span>
              )}
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <p
            className="font-body text-xs italic"
            style={{color: 'rgba(244,232,208,0.2)'}}
          >
            tap to change photo
          </p>
        </div>

        {/* ── Form fields ── */}
        <div className="space-y-5">
          {/* Display Name */}
          <div>
            <label
              className="block font-label text-[9px] tracking-[0.3em] uppercase mb-2"
              style={{color: 'rgba(201,169,97,0.4)'}}
            >
              Display Name
            </label>
            <input
              type="text"
              value={form.display_name}
              onChange={(e) => setForm((p) => ({...p, display_name: e.target.value}))}
              placeholder="Your name"
              className="w-full px-4 py-3 font-body text-sm placeholder:opacity-20 focus:outline-none transition-colors"
              style={{
                background: 'rgba(13,8,9,0.8)',
                border: '1px solid rgba(201,169,97,0.12)',
                color: '#F4E8D0',
                caretColor: '#C9A961',
              }}
            />
          </div>

          {/* Bio */}
          <div>
            <label
              className="block font-label text-[9px] tracking-[0.3em] uppercase mb-2"
              style={{color: 'rgba(201,169,97,0.4)'}}
            >
              Bio
              <span
                className="ml-2 font-body normal-case tracking-normal"
                style={{
                  color:
                    form.bio.length > 180
                      ? 'rgba(255,77,125,0.6)'
                      : 'rgba(244,232,208,0.2)',
                }}
              >
                {form.bio.length}/200
              </span>
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => {
                if (e.target.value.length <= 200)
                  setForm((p) => ({...p, bio: e.target.value}));
              }}
              placeholder="A few words about you..."
              rows={3}
              className="w-full px-4 py-3 font-body text-sm placeholder:opacity-20 focus:outline-none resize-none"
              style={{
                background: 'rgba(13,8,9,0.8)',
                border: '1px solid rgba(201,169,97,0.12)',
                color: '#F4E8D0',
                caretColor: '#C9A961',
              }}
            />
          </div>

          {/* City */}
          <div>
            <label
              className="block font-label text-[9px] tracking-[0.3em] uppercase mb-2"
              style={{color: 'rgba(201,169,97,0.4)'}}
            >
              City
            </label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm((p) => ({...p, city: e.target.value}))}
              placeholder="e.g. New York"
              className="w-full px-4 py-3 font-body text-sm placeholder:opacity-20 focus:outline-none"
              style={{
                background: 'rgba(13,8,9,0.8)',
                border: '1px solid rgba(201,169,97,0.12)',
                color: '#F4E8D0',
                caretColor: '#C9A961',
              }}
            />
          </div>

          {/* Telegram Handle */}
          <div>
            <label
              className="block font-label text-[9px] tracking-[0.3em] uppercase mb-2"
              style={{color: 'rgba(201,169,97,0.4)'}}
            >
              Telegram Handle
            </label>
            <div
              className="flex items-center overflow-hidden"
              style={{
                background: 'rgba(13,8,9,0.8)',
                border: '1px solid rgba(201,169,97,0.12)',
              }}
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
                value={form.telegram_handle.replace(/^@/, '')}
                onChange={(e) =>
                  setForm((p) => ({
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

        {/* ── Feedback ── */}
        {error && (
          <p
            className="mt-4 font-body text-sm italic"
            style={{color: 'rgba(255,77,125,0.7)'}}
          >
            {error}
          </p>
        )}
        {success && (
          <p
            className="mt-4 font-body text-sm italic"
            style={{color: 'rgba(201,169,97,0.8)'}}
          >
            {success}
          </p>
        )}

        {/* ── Save button ── */}
        <button
          onClick={handleSave}
          disabled={saving || uploadingAvatar}
          className="w-full mt-8 py-4 font-label text-[10px] tracking-[0.4em] uppercase transition-all duration-300 disabled:opacity-30"
          style={{
            background: saving
              ? 'rgba(201,169,97,0.1)'
              : 'linear-gradient(135deg, #C9A961, #E8C87A)',
            color: saving ? '#C9A961' : '#0A0406',
          }}
        >
          {saving ? 'saving...' : 'Save Changes'}
        </button>

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
