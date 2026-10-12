import {handleAuth} from '@workos-inc/authkit-nextjs';

// WorkOS AuthKit redirect target (passkeys / hosted sign-in).
export const GET = handleAuth({returnPathname: '/lobby'});
