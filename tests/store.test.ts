import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openPostgresStore,requireDatabaseUrl,normalize} from '../lib/store';

test('missing database configuration fails explicitly instead of using local storage',()=>{
  for(const value of [undefined,'','  '])assert.throws(()=>requireDatabaseUrl(value),/DATABASE_URL is required/);
  assert.throws(()=>openPostgresStore(''),/DATABASE_URL is required/);
});
test('only PostgreSQL connection URLs with a database are accepted',()=>{
  for(const value of [':memory:','data/wallet.db','https://example.com/postgres','postgres://localhost','postgres://localhost/',' postgres://localhost/postgres','postgres://user:secret@localhost/postgres#fragment'])
    assert.throws(()=>requireDatabaseUrl(value),/valid PostgreSQL/);
  for(const value of ['postgres://localhost/test','postgresql://postgres.project:encoded%40password@aws-1-region.pooler.supabase.com:6543/postgres'])assert.equal(requireDatabaseUrl(value),value);
});
test('invalid configuration errors never expose supplied credentials',()=>{
  const secret='do-not-display-this-password';
  assert.throws(()=>requireDatabaseUrl(`https://user:${secret}@host/db`),error=>error instanceof Error&&!error.message.includes(secret));
});
test('institution normalization remains Unicode and whitespace insensitive',()=>{
  assert.equal(normalize('  ＨＤＦＣ   Bank '),normalize('hdfc bank'));
});
test('default store requires DATABASE_URL even when an obsolete local database setting exists',()=>{
  const database=process.env.DATABASE_URL,legacy=process.env.DIGIWALLET_DB;
  try{delete process.env.DATABASE_URL;process.env.DIGIWALLET_DB='unused-local.db';assert.throws(()=>openPostgresStore(),/DATABASE_URL is required/);}
  finally{if(database===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=database;if(legacy===undefined)delete process.env.DIGIWALLET_DB;else process.env.DIGIWALLET_DB=legacy;}
});
