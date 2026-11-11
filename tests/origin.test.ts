import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sameOrigin} from '../lib/origin';
test('origin validation uses actual host rather than normalized Next localhost URL',()=>{
 assert.equal(sameOrigin(new Request('http://localhost:3000/api/auth',{headers:{host:'127.0.0.1:3000',origin:'http://127.0.0.1:3000'}})),true);
 assert.equal(sameOrigin(new Request('http://localhost:3000/api/auth',{headers:{host:'127.0.0.1:3000',origin:'https://evil.example'}})),false);
 assert.equal(sameOrigin(new Request('http://localhost:3000/api/auth',{headers:{host:'127.0.0.1:3000'}})),false);
});
