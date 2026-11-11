import {NextRequest,NextResponse} from 'next/server';
import {store,identify,register,login,session,logout,limit} from '@/lib/store';
import {authSchema} from '@/lib/schema';
import {sameOrigin} from '@/lib/origin';
export const runtime='nodejs';

export async function GET(req:NextRequest){
  try {
    const s = store();
    const token = req.cookies.get('dw_session')?.value || '';
    const user = token ? await identify(s, token) : null;
    return NextResponse.json({user: user || null}, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : 'Auth check failed.'}, {status: 500});
  }
}

export async function POST(req:NextRequest){
  try{
    if(!sameOrigin(req)) return NextResponse.json({error:'Invalid request origin.'},{status:403});
    const s = store();
    await limit(s, 'auth', 30);
    const raw = await req.text();
    if(raw.length > 4096) throw new Error('Request too large.');
    const input = authSchema.parse(JSON.parse(raw));
    let user;
    try{
      user = input.mode === 'register'
        ? await register(s, input.email, input.password, input.name || 'My wallet')
        : await login(s, input.email, input.password);
    } catch {
      throw new Error(input.mode === 'register' ? 'Could not create account. Try signing in or use another email.' : 'Email or password is incorrect.');
    }
    const token = await session(s, user.id);
    const res = NextResponse.json({user});
    res.cookies.set('dw_session', token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: new URL(req.headers.get('origin')!).protocol === 'https:',
      path: '/',
      maxAge: 7 * 86400
    });
    return res;
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : 'Sign in failed.'}, {status: 400});
  }
}

export async function DELETE(req:NextRequest){
  try {
    if(!sameOrigin(req)) return NextResponse.json({error:'Invalid origin.'},{status:403});
    const token = req.cookies.get('dw_session')?.value || '';
    if (token) await logout(store(), token);
    const res = NextResponse.json({ok: true});
    res.cookies.delete('dw_session');
    return res;
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : 'Sign out failed.'}, {status: 400});
  }
}
