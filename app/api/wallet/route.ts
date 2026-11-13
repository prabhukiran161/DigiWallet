import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {store,identify,limit} from '@/lib/store';
import {createAccount,post,editAccount,manageAccount,setCreditLimit,editTransaction,manageCategory,saveBudget} from '@/lib/ledger';
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
    const body = z.object({action: z.enum(['account','editAccount','deleteAccount','closeAccount','creditLimit','transaction','editTransaction','category','deleteCategory','budget','archive','rename','institution']), data: z.unknown()}).strict().parse(JSON.parse(raw));

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
      if(body.action==='editAccount')return editAccount(w,accountSchema.parse(body.data));
      if(body.action==='editTransaction'){
        const d=z.object({id:z.string(),command:commandSchema,expectedRevision:z.number().int().nonnegative(),requestKey:z.string().min(1).max(100)}).strict().parse(body.data);
        return editTransaction(w,d.id,d.command,d.expectedRevision,d.requestKey);
      }
      if(body.action==='creditLimit'){
        const d=z.object({id:z.string(),limit:z.string(),date:z.string().datetime({offset:true})}).strict().parse(body.data);
        return setCreditLimit(w,d.id,d.limit,d.date);
      }
      if(['archive','deleteAccount','closeAccount'].includes(body.action)){
        const d=z.object({id:z.string()}).strict().parse(body.data);
        return manageAccount(w,d.id,body.action as 'archive'|'deleteAccount'|'closeAccount');
      }
      if(body.action==='rename'){
        const d=z.object({id:z.string(),name:z.string().trim().min(1).max(100)}).strict().parse(body.data);
        const a=w.accounts.find(a=>a.id===d.id);if(!a||a.closedAt)throw new Error('Choose an open account.');
        (w.managementHistory??=[]).push({action:'rename',id:a.id,at:new Date().toISOString(),before:{name:a.name}});a.name=d.name;return w;
      }
      if(body.action==='category')return manageCategory(w,z.object({id:z.string().min(1).max(100),name:z.string().max(50).optional(),icon:z.string().optional(),archived:z.boolean().optional()}).strict().parse(body.data));
      if(body.action==='deleteCategory')return manageCategory(w,z.object({id:z.string()}).strict().parse(body.data),true);
      const d=z.object({month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),total:z.string(),categories:z.record(z.string(),z.string())}).strict().parse(body.data);
      return saveBudget(w,d);
    });
    return NextResponse.json({wallet});
  } catch(error) {
    const message = error instanceof z.ZodError ? error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ') : error instanceof Error ? error.message : 'Could not save.';
    return NextResponse.json({error:message}, {status: message.includes('conflict') ? 409 : 400});
  }
}
