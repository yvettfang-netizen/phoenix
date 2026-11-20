import assert from 'node:assert/strict'
import {createHash,randomBytes,randomUUID} from 'node:crypto'

// Test-only trusted identity authority. Production resolves the same AuthConfig
// capability from its approved provider; this fixture owns only synthetic state.
export function createSyntheticAuthFixture({origin}){
 const url=new URL(origin)
 assert.equal(url.origin,origin)
 assert.equal(url.protocol,'http:')
 assert.ok(['127.0.0.1','localhost'].includes(url.hostname))
 const cookieName='phoenix-canonical-test-session'
 const accounts={}
 const sessions=new Map()
 const events=[]
 const config={
  origin,
  async verifySession(request){
   const cookie=request.headers.get('cookie')??''
   const token=cookie.split(';').map(part=>part.trim())
    .find(part=>part.startsWith(cookieName+'='))?.slice(cookieName.length+1)
   if(!token||! /^[A-Za-z0-9_-]{43}$/.test(token))return null
   const hash=createHash('sha256').update(token).digest('hex')
   const session=sessions.get(hash)
   if(!session||session.valid_until<=Date.now())return null
   return{...session}
  },
  async recordAccess(actorId,action,requestId){
   events.push({actorId,action,requestId})
  }
 }
 function register(alias,routeAlias){
  assert.equal(accounts[alias],undefined,'Synthetic alias already registered')
  const token=randomBytes(32).toString('base64url')
  const token_hash=createHash('sha256').update(token).digest('hex')
  const created_at=Date.now()
  const session={id:randomUUID(),username:'p1_'+alias.replace(/[^a-z0-9]/g,'_'),
   created_at,token_hash,valid_until:created_at+60*60*1000}
  sessions.set(token_hash,session)
  const account={id:session.id,cookie:cookieName+'='+token,sessionHash:token_hash,routeAlias}
  accounts[alias]=account
  return account
 }
 return{config,register,accounts,sessions,events}
}
