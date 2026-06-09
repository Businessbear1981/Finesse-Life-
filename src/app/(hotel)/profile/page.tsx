import {redirect} from 'next/navigation';
import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {VipAccessSection} from './vip-access-section';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  city: string | null;
  vibe: string | null;
  is_vip: boolean;
  vip_expires_at: string | null;
  created_at: string;
}

interface Post {
  id: string;
  content: string | null;
  media_urls: string[] | null;
  likes_count: number;
  created_at: string;
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{upgrade?: string}>;
}) {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [profileResult, postsResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('posts')
      .select('id, content, media_urls, likes_count, created_at')
      .eq('author_id', user.id)
      .order('created_at', {ascending: false})
      .limit(24),
  ]);

  const profile = profileResult.data as Profile | null;
  const posts = (postsResult.data ?? []) as Post[];

  if (!profile) redirect('/login');

  const params = await searchParams;
  const showUpgrade = params.upgrade === 'true';

  const memberSince = profile.vip_expires_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', {month: 'long', year: 'numeric'})
    : null;

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{background: '#0A0406'}}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px]"
          style={{
            background:
              'radial-gradient(ellipse at top, rgba(201,169,97,0.06) 0%, transparent 60%)',
          }}
        />
        <div
          className="absolute top-1/3 right-0 w-[300px] h-[300px]"
          style={{
            background:
              'radial-gradient(circle, rgba(74,25,34,0.12) 0%, transparent 60%)',
          }}
        />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-5 pt-10 pb-20">
        {/* ── IDENTITY BLOCK ── */}
        <div className="flex flex-col items-center text-center mb-8">
          {/* Avatar */}
          <div
            className="w-24 h-24 rounded-full overflow-hidden border-2 mb-4 flex items-center justify-center"
            style={{
              borderColor: 'rgba(201,169,97,0.5)',
              boxShadow: '0 0 20px rgba(201,169,97,0.15)',
              background: 'linear-gradient(135deg, #1A0A0D, #2A1020)',
            }}
          >
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={profile.display_name ?? profile.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <span
                className="font-display text-3xl"
                style={{color: 'rgba(201,169,97,0.7)'}}
              >
                {(profile.display_name ?? profile.username)[0].toUpperCase()}
              </span>
            )}
          </div>

          {/* Name + handle */}
          <h1
            className="font-display text-3xl tracking-wide mb-1"
            style={{color: '#E8C87A', textShadow: '0 0 20px rgba(201,169,97,0.2)'}}
          >
            {profile.display_name ?? profile.username}
          </h1>
          <p
            className="font-label text-[10px] tracking-[0.3em] uppercase mb-2"
            style={{color: 'rgba(201,169,97,0.35)'}}
          >
            @{profile.username}
          </p>
          {profile.city && (
            <p
              className="font-body text-sm italic mb-3"
              style={{color: 'rgba(244,232,208,0.3)'}}
            >
              {profile.city}
            </p>
          )}

          {/* Vibe badge */}
          {profile.vibe && (
            <span
              className="inline-block px-4 py-1 font-label text-[9px] tracking-[0.3em] uppercase mb-4"
              style={{
                background: 'rgba(201,169,97,0.08)',
                border: '1px solid rgba(201,169,97,0.25)',
                color: '#C9A961',
              }}
            >
              {profile.vibe}
            </span>
          )}

          {/* Bio */}
          {profile.bio && (
            <p
              className="font-body text-sm leading-relaxed max-w-sm mb-6"
              style={{color: 'rgba(244,232,208,0.55)'}}
            >
              {profile.bio}
            </p>
          )}

          {/* Stats row */}
          <div
            className="flex items-center gap-8 py-4 px-8 border mb-6"
            style={{borderColor: 'rgba(201,169,97,0.1)', background: 'rgba(10,4,6,0.6)'}}
          >
            <div className="text-center">
              <p
                className="font-display text-xl"
                style={{color: '#E8C87A'}}
              >
                {posts.length}
              </p>
              <p
                className="font-label text-[8px] tracking-[0.25em] uppercase"
                style={{color: 'rgba(201,169,97,0.3)'}}
              >
                posts
              </p>
            </div>
            <div
              className="w-px h-8"
              style={{background: 'rgba(201,169,97,0.1)'}}
            />
            <div className="text-center">
              <p
                className="font-display text-xl"
                style={{color: '#E8C87A'}}
              >
                0
              </p>
              <p
                className="font-label text-[8px] tracking-[0.25em] uppercase"
                style={{color: 'rgba(201,169,97,0.3)'}}
              >
                followers
              </p>
            </div>
            <div
              className="w-px h-8"
              style={{background: 'rgba(201,169,97,0.1)'}}
            />
            <div className="text-center">
              <p
                className="font-display text-xl"
                style={{color: '#E8C87A'}}
              >
                0
              </p>
              <p
                className="font-label text-[8px] tracking-[0.25em] uppercase"
                style={{color: 'rgba(201,169,97,0.3)'}}
              >
                following
              </p>
            </div>
          </div>

          {/* Edit profile button */}
          <Link
            href="/profile/edit"
            className="inline-block px-8 py-2.5 font-label text-[9px] tracking-[0.3em] uppercase transition-all duration-300"
            style={{
              border: '1px solid rgba(201,169,97,0.2)',
              color: 'rgba(201,169,97,0.6)',
            }}
            onMouseEnter={undefined}
          >
            Edit Profile
          </Link>
        </div>

        {/* Deco divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px" style={{background: 'rgba(201,169,97,0.08)'}} />
          <div
            className="w-1.5 h-1.5 rotate-45 border"
            style={{borderColor: 'rgba(201,169,97,0.2)'}}
          />
          <div className="flex-1 h-px" style={{background: 'rgba(201,169,97,0.08)'}} />
        </div>

        {/* ── VIP ACCESS SECTION ── */}
        <VipAccessSection
          isVip={profile.is_vip}
          vipExpiresAt={profile.vip_expires_at}
          memberSince={memberSince}
          showUpgrade={showUpgrade}
        />

        {/* Deco divider */}
        {posts.length > 0 && (
          <div className="flex items-center gap-3 mt-8 mb-6">
            <div className="flex-1 h-px" style={{background: 'rgba(201,169,97,0.08)'}} />
            <span
              className="font-label text-[8px] tracking-[0.4em] uppercase"
              style={{color: 'rgba(201,169,97,0.2)'}}
            >
              moments
            </span>
            <div className="flex-1 h-px" style={{background: 'rgba(201,169,97,0.08)'}} />
          </div>
        )}

        {/* ── POSTS GRID ── */}
        {posts.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {posts.map((post) => (
              <div
                key={post.id}
                className="relative aspect-square overflow-hidden group"
                style={{
                  border: '1px solid rgba(201,169,97,0.08)',
                  background: 'rgba(13,8,9,0.8)',
                }}
              >
                {post.media_urls && post.media_urls.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.media_urls[0]}
                    alt="post"
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-3">
                    <p
                      className="font-body text-xs leading-relaxed text-center line-clamp-4"
                      style={{color: 'rgba(244,232,208,0.4)'}}
                    >
                      {post.content}
                    </p>
                  </div>
                )}
                {/* Hover overlay */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
                  style={{background: 'rgba(74,25,34,0.6)'}}
                >
                  <span
                    className="font-label text-[9px] tracking-[0.2em] uppercase"
                    style={{color: 'rgba(201,169,97,0.8)'}}
                  >
                    ♥ {post.likes_count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p
              className="font-body text-sm italic"
              style={{color: 'rgba(244,232,208,0.2)'}}
            >
              no moments yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
