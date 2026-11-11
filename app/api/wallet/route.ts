import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {store,identify,limit} from '@/lib/store';
import {createAccount,post,money} from '@/lib/ledger';
import {accountSchema,commandSchema} from '@/lib/schema';
import {sameOrigin} from '@/lib/origin';
export const runtime='nodejs';

export async function GET(req:NextRequest){
  try {
    const s = store();
    const token = req.cookies.get('dw_session')?.value || '';
    const user = token ? await identify(s, token) : null;
    if(!user) return NextResponse.json({error:'Please sign in.'},{status:401});
    const wallet = await s.read(user.id);
    if(req.nextUrl.searchParams.has('export')) {
      return new NextResponse(JSON.stringify(wallet, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="digiwallet-export.json"',
          'Cache-Control': 'no-store'
        }
      });
    }
    const institutions = await s.getInstitutions();
    return NextResponse.json({wallet, institutions}, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : 'Failed to load wallet.'}, {status: 500});
  }
}

export async function POST(req:NextRequest){
  try{
    if(!sameOrigin(req)) return NextResponse.json({error:'Invalid request origin.'},{status:403});
    const s = store();
    const token = req.cookies.get('dw_session')?.value || '';
    const user = token ? await identify(s, token) : null;
    if(!user) return NextResponse.json({error:'Please sign in.'},{status:401});
    await limit(s, `write:${user.id}`);
    const raw = await req.text();
    if(raw.length > 20000) throw new Error('Request too large.');
    const body = z.object({action: z.enum(['account','transaction','category','budget','archive','rename','institution']), data: z.unknown()}).strict().parse(JSON.parse(raw));

    if(body.action === 'institution'){
      const d = z.object({name: z.string().min(2).max(100), kind: z.enum(['bank','investment','lender']), country: z.literal('IN')}).strict().parse(body.data);
      const name = d.name.normalize('NFKC').trim().replace(/\s+/g,' ');
      if(name.length < 2) throw new Error('Enter an institution name.');
      await s.addInstitution(name, d.kind, d.country);
      return NextResponse.json({institutions: await s.getInstitutions(), wallet: await s.read(user.id)});
    }

    const wallet = await s.change(user.id, body.action, w => {
      if(body.action==='account') return createAccount(w, accountSchema.parse(body.data));
      if(body.action==='transaction') return post(w, commandSchema.parse(body.data));
      if(body.action==='archive'||body.action==='rename'){
        const d = z.object({id:z.string(), name:z.string().min(1).max(100).optional()}).strict().parse(body.data);
        const a = w.accounts.find(a=>a.id===d.id);
        if(!a) throw new Error('Account not found.');
        if(body.action==='archive'){
          if(w.allocations.some(f=>f.loan===a.id&&f.remaining>0)) throw new Error('Resolve remaining purpose funding before archiving.');
          a.archived = !a.archived;
        } else {
          if(!d.name?.trim()) throw new Error('Name is required.');
          a.name = d.name.trim();
        }
        return w;
      }
      if(body.action==='category'){
        const d = z.object({id:z.string(), name:z.string().min(1).max(50), archived:z.boolean()}).strict().parse(body.data);
        const existing = w.categories.find(c=>c.id===d.id);
        if(existing) Object.assign(existing, d);
        else w.categories.push(d);
        return w;
      }
      const d = z.object({month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), total:z.string(), categories:z.record(z.string(),z.string())}).strict().parse(body.data);
      const total = money(d.total), categories = Object.fromEntries(Object.entries(d.categories).map(([k,v])=>{
        if(!w.categories.some(c=>c.id===k)) throw new Error('Unknown category.');
        return [k, money(v)];
      }));
      if(Object.values(categories).reduce((s,n)=>s+n,0)!==total) throw new Error('Category allocations must equal the overall budget.');
      w.budgets[d.month] = {total, categories};
      return w;
    });
    return NextResponse.json({wallet});
  } catch(error) {
    const message = error instanceof z.ZodError ? error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ') : error instanceof Error ? error.message : 'Could not save.';
    return NextResponse.json({error:message}, {status: message.includes('conflict') ? 409 : 400});
  }
}
