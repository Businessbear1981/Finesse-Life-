import {redirect} from 'next/navigation';
import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {VipAccessSection} from './vip-access-section';
import {ProfileTabs} from './profile-tabs';

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
  public_photos: string[] | null;
  public_links: {instagram?: string; twitter?: string} | null;
  has_private_profile: boolean;
  private_display_name: string | null;
  private_avatar_url: string | null;
  private_bio: string | null;
  private_vibe: string | null;
  private_photos: string[] | null;
}

interface Post {
  id: string;
  content: string | null;
  media_urls: string[] | null;
  likes_count: number;
  created_at: string;
}

function isVipActive(profile: Pick<Profile, 'is_vip' | 'vip_expires_at'>): boolean {
  return (
    profile.is_vip &&
    (profile.vip_expires_at === null || new Date(profile.vip_expires_at) > new Date())
  );
}

// ─── Shared UI pieces ─────────────────────────────────────────────────────────

function DecoLine() {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px" style={{background: 'rgba(201,169,97,0.08)'}} />
      <div
        className="w-1.5 h-1.5 rotate-45 border"
        style={{borderColor: 'rgba(201,169,97,0.2)'}}
      />
      <div className="flex-1 h-px" style={{background: 'rgba(201,169,97,0.08)'}} />
    </div>
  );
}

function VibeBadge({vibe, pink}: {vibe: string; pink?: boolean}) {
  return (
    <span
      className="inline-block px-4 py-1 font-label text-[9px] tracking-[0.3em] uppercase mb-4"
      style={{
        background: pink ? 'rgba(255,77,125,0.08)' : 'rgba(201,169,97,0.08)',
        border: pink
          ? '1px solid rgba(255,77,125,0.2)'
          : '1px solid rgba(201,169,97,0.25)',
        color: pink ? '#FF4D7D' : '#C9A961',
      }}
    >
      {vibe}
    </span>
  );
}

function AvatarCircle({
  url,
  name,
  pink,
}: {
  url: string | null;
  name: string;
  pink?: boolean;
}) {
  return (
    <div
      className="w-24 h-24 rounded-full overflow-hidden border-2 mb-4 flex items-center justify-center"
      style={{
        borderColor: pink ? 'rgba(255,77,125,0.4)' : 'rgba(201,169,97,0.5)',
        boxShadow: pink
          ? '0 0 20px rgba(255,77,125,0.1)'
          : '0 0 20px rgba(201,169,97,0.15)',
        background: 'linear-gradient(135deg, #1A0A0D, #2A1020)',
      }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span
          className="font-display text-3xl"
          style={{color: pink ? 'rgba(255,77,125,0.7)' : 'rgba(201,169,97,0.7)'}}
        >
          {name[0]?.toUpperCase()}
        </span>
      )}
    </div>
  );
}

function PhotoGrid({photos, pink}: {photos: string[]; pink?: boolean}) {
  if (photos.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-2 mt-4">
      {photos.map((url, i) => (
        <div
          key={i}
          className="aspect-square overflow-hidden"
          style={{border: pink ? '1px solid rgba(255,77,125,0.1)' : '1px solid rgba(201,169,97,0.08)'}}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`photo ${i + 1}`} className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{upgrade?: string; u?: string}>;
}) {
  const supabase = await createClient();
  const {
    data: {user},
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const params = await searchParams;

  // Determine whose profile to show: ?u=username → someone else, else own
  const targetUsername = params.u ?? null;

  const [viewerProfileResult, targetProfileResult, postsResult] = await Promise.all([
    // Viewer's own profile (for VIP check)
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    // Target profile
    targetUsername
      ? supabase.from('profiles').select('*').eq('username', targetUsername).single()
      : supabase.from('profiles').select('*').eq('id', user.id).single(),
    // Posts from the target (we'll know the ID after)
    Promise.resolve({data: [] as Post[]}),
  ]);

  const viewerProfile = viewerProfileResult.data as Profile | null;
  if (!viewerProfile) redirect('/login');

  const targetProfile = targetProfileResult.data as Profile | null;
  if (!targetProfile) redirect('/');

  const isOwnProfile = targetProfile.id === user.id;
  const viewerIsVip = isVipActive(viewerProfile);
  const targetHasPrivate = targetProfile.has_private_profile;
  const canSeePrivate = viewerIsVip && targetHasPrivate;

  // Fetch posts for the target user
  const {data: posts} = await supabase
    .from('posts')
    .select('id, content, media_urls, likes_count, created_at')
    .eq('author_id', targetProfile.id)
    .order('created_at', {ascending: false})
    .limit(24);

  const postList = (posts ?? []) as Post[];

  const memberSince = targetProfile.vip_expires_at
    ? new Date(targetProfile.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : null;

  const showUpgrade = params.upgrade === 'true';

  // ─── Shared public identity block ────────────────────────────────────────

  const publicBlock = (
    <>
      {/* Avatar */}
      <AvatarCircle
        url={targetProfile.avatar_url}
        name={targetProfile.display_name ?? targetProfile.username}
      />

      {/* Name + handle */}
      <h1
        className="font-display text-3xl tracking-wide mb-1"
        style={{color: '#E8C87A', textShadow: '0 0 20px rgba(201,169,97,0.2)'}}
      >
        {targetProfile.display_name ?? targetProfile.username}
      </h1>
      <p
        className="font-label text-[10px] tracking-[0.3em] uppercase mb-2"
        style={{color: 'rgba(201,169,97,0.35)'}}
      >
        @{targetProfile.username}
      </p>
      {targetProfile.city && (
        <p
          className="font-body text-sm italic mb-3"
          style={{color: 'rgba(244,232,208,0.3)'}}
        >
          {targetProfile.city}
        </p>
      )}

      {targetProfile.vibe && <VibeBadge vibe={targetProfile.vibe} />}

      {targetProfile.bio && (
        <p
          className="font-body text-sm leading-relaxed max-w-sm mb-4"
          style={{color: 'rgba(244,232,208,0.55)'}}
        >
          {targetProfile.bio}
        </p>
      )}

      {/* Public photos */}
      {targetProfile.public_photos && targetProfile.public_photos.length > 0 && (
        <PhotoGrid photos={targetProfile.public_photos} />
      )}

      {/* Social links */}
      {(targetProfile.public_links?.instagram || targetProfile.public_links?.twitter) && (
        <div className="flex items-center gap-4 mt-4">
          {targetProfile.public_links.instagram && (
            <a
              href={`https://instagram.com/${targetProfile.public_links.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-label text-[8px] tracking-[0.25em] uppercase transition-colors"
              style={{color: 'rgba(201,169,97,0.4)'}}
            >
              IG @{targetProfile.public_links.instagram}
            </a>
          )}
          {targetProfile.public_links.twitter && (
            <a
              href={`https://x.com/${targetProfile.public_links.twitter}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-label text-[8px] tracking-[0.25em] uppercase transition-colors"
              style={{color: 'rgba(201,169,97,0.4)'}}
            >
              𝕏 @{targetProfile.public_links.twitter}
            </a>
          )}
        </div>
      )}
    </>
  );

  // ─── Private profile block ───────────────────────────────────────────────

  const privateBlock = (
    <div className="text-center py-4">
      <AvatarCircle
        url={targetProfile.private_avatar_url}
        name={targetProfile.private_display_name ?? targetProfile.display_name ?? targetProfile.username}
        pink
      />

      {targetProfile.private_display_name && (
        <h2
          className="font-display text-2xl tracking-wide mb-1"
          style={{color: '#E8C87A'}}
        >
          {targetProfile.private_display_name}
        </h2>
      )}

      {targetProfile.private_vibe && (
        <VibeBadge vibe={targetProfile.private_vibe} pink />
      )}

      {targetProfile.private_bio && (
        <p
          className="font-body text-sm leading-relaxed max-w-sm mx-auto mt-2"
          style={{color: 'rgba(244,232,208,0.55)'}}
        >
          {targetProfile.private_bio}
        </p>
      )}

      {targetProfile.private_photos && targetProfile.private_photos.length > 0 && (
        <PhotoGrid photos={targetProfile.private_photos} pink />
      )}
    </div>
  );

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

          {/* Stats row */}
          <div
            className="flex items-center gap-8 py-4 px-8 border mb-6 w-full max-w-sm"
            style={{borderColor: 'rgba(201,169,97,0.1)', background: 'rgba(10,4,6,0.6)'}}
          >
            <div className="text-center flex-1">
              <p className="font-display text-xl" style={{color: '#E8C87A'}}>
                {postList.length}
              </p>
              <p
                className="font-label text-[8px] tracking-[0.25em] uppercase"
                style={{color: 'rgba(201,169,97,0.3)'}}
              >
                posts
              </p>
            </div>
            <div className="w-px h-8" style={{background: 'rgba(201,169,97,0.1)'}} />
            <div className="text-center flex-1">
              <p className="font-display text-xl" style={{color: '#E8C87A'}}>
                0
              </p>
              <p
                className="font-label text-[8px] tracking-[0.25em] uppercase"
                style={{color: 'rgba(201,169,97,0.3)'}}
              >
                followers
              </p>
            </div>
            <div className="w-px h-8" style={{background: 'rgba(201,169,97,0.1)'}} />
            <div className="text-center flex-1">
              <p className="font-display text-xl" style={{color: '#E8C87A'}}>
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

          {/* Profile content — tabbed if viewer can see private */}
          {canSeePrivate ? (
            <ProfileTabs
              publicContent={publicBlock}
              privateContent={privateBlock}
            />
          ) : (
            <>
              {publicBlock}

              {/* "VIP members see more" hint — shown to non-VIP viewers when target has private */}
              {!viewerIsVip && targetHasPrivate && !isOwnProfile && (
                <div
                  className="mt-6 px-4 py-3 w-full max-w-sm"
                  style={{
                    border: '1px solid rgba(255,77,125,0.1)',
                    background: 'rgba(74,25,34,0.05)',
                  }}
                >
                  <p
                    className="font-body text-xs italic text-center"
                    style={{color: 'rgba(255,77,125,0.4)'}}
                  >
                    VIP members see backstage
                  </p>
                </div>
              )}
            </>
          )}

          {/* Own profile — private profile summary thumbnail */}
          {isOwnProfile && targetHasPrivate && (
            <>
              <DecoLine />
              <div
                className="w-full max-w-sm px-5 py-4"
                style={{
                  border: '1px solid rgba(255,77,125,0.15)',
                  background: 'rgba(74,25,34,0.06)',
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Mini private avatar */}
                  <div
                    className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                    style={{
                      border: '1px solid rgba(255,77,125,0.3)',
                      background: 'linear-gradient(135deg, #1A0A0D, #2A1020)',
                    }}
                  >
                    {targetProfile.private_avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={targetProfile.private_avatar_url}
                        alt="private"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span
                        className="font-label text-[8px] uppercase"
                        style={{color: 'rgba(255,77,125,0.5)'}}
                      >
                        VIP
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p
                      className="font-label text-[8px] tracking-[0.3em] uppercase"
                      style={{color: 'rgba(255,77,125,0.5)'}}
                    >
                      Backstage
                    </p>
                    <p
                      className="font-body text-sm"
                      style={{color: 'rgba(244,232,208,0.5)'}}
                    >
                      {targetProfile.private_display_name ?? '—'}
                    </p>
                  </div>
                  <Link
                    href="/profile/edit"
                    className="font-label text-[8px] tracking-[0.2em] uppercase"
                    style={{color: 'rgba(255,77,125,0.4)'}}
                  >
                    Edit
                  </Link>
                </div>
              </div>
            </>
          )}

          <DecoLine />

          {/* Edit profile button — own profile only */}
          {isOwnProfile && (
            <Link
              href="/profile/edit"
              className="inline-block px-8 py-2.5 font-label text-[9px] tracking-[0.3em] uppercase transition-all duration-300 mb-6"
              style={{
                border: '1px solid rgba(201,169,97,0.2)',
                color: 'rgba(201,169,97,0.6)',
              }}
            >
              Edit Profile
            </Link>
          )}
        </div>

        {/* ── VIP ACCESS SECTION — own profile only ── */}
        {isOwnProfile && (
          <VipAccessSection
            isVip={viewerProfile.is_vip}
            vipExpiresAt={viewerProfile.vip_expires_at}
            memberSince={memberSince}
            showUpgrade={showUpgrade}
          />
        )}

        {/* ── POSTS GRID ── */}
        {postList.length > 0 && (
          <>
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
            <div className="grid grid-cols-3 gap-2">
              {postList.map((post) => (
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
          </>
        )}

        {postList.length === 0 && (
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
