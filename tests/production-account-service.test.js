import test from "node:test";
import assert from "node:assert/strict";
import {createProductionAccountService} from "../src/production-account-service.js";

function mockSupabase(){
 const calls=[],user={id:"user-1",email:"player@example.com",email_confirmed_at:"2026-11-17"};
 const profile={id:"user-1",display_name:"Player One",username:"player_one",discoverable:true};
 const access={user_id:"user-1",platform_admin:false,organizations:[{organization_id:"organization-1",role:"scorekeeper"}]};
 function query(){
  const q={
   select(fields){calls.push(["select",fields]);return q},
   update(values){calls.push(["update",values]);return q},
   eq(key,value){calls.push(["eq",key,value]);return q},
   single:async()=>({data:profile,error:null})
  };
  return q;
 }
 const sdk={
  calls,
  auth:{
   signUp:async input=>{calls.push(["signUp",input]);return{data:{user,session:null},error:null}},
   signInWithPassword:async input=>{calls.push(["signIn",input]);return{data:{user,session:{user}},error:null}},
   resetPasswordForEmail:async(email,options)=>{calls.push(["reset",email,options]);return{error:null}},
   signOut:async()=>{calls.push(["signOut"]);return{error:null}},
   getUser:async()=>({data:{user},error:null}),
   onAuthStateChange:callback=>{
    calls.push(["listener"]);
    callback("SIGNED_IN",{user});
    return{data:{subscription:{unsubscribe(){calls.push(["unsubscribe"])}}}};
   }
  },
  from(table){calls.push(["from",table]);return query()},
  rpc:async name=>{calls.push(["rpc",name]);return{data:access,error:null}}
 };
 return sdk;
}
test("production signup never accepts role or account privileges",async()=>{
 const sdk=mockSupabase(),service=createProductionAccountService(sdk);
 const created=await service.signUp({email:"  PLAYER@EXAMPLE.COM ",password:"a-long-example-password",displayName:"Player One",role:"admin"});
 assert.equal(created.emailConfirmationRequired,true);
 const payload=sdk.calls.find(x=>x[0]==="signUp")[1];
 assert.equal(payload.email,"player@example.com");
 assert.deepEqual(payload.options.data,{display_name:"Player One"});
 assert.equal("role" in payload.options.data,false);
 assert.equal(created.userId,"user-1");
});
test("login, signout and password reset call managed auth provider",async()=>{
 const sdk=mockSupabase(),service=createProductionAccountService(sdk,{passwordResetRedirectTo:"https://ucl.example.com/reset"});
 const auth=await service.signIn({email:"PLAYER@EXAMPLE.COM",password:"example-password"});
 assert.equal(auth.authenticated,true);
 assert.equal(auth.userId,"user-1");
 await service.sendPasswordReset("PLAYER@EXAMPLE.COM");
 await service.signOut();
 assert.equal(sdk.calls.find(x=>x[0]==="reset")[2].redirectTo,"https://ucl.example.com/reset");
 assert.ok(sdk.calls.some(x=>x[0]==="signOut"));
});
test("authenticated account loads profile and server-evaluated privileges",async()=>{
 const sdk=mockSupabase(),service=createProductionAccountService(sdk),account=await service.loadMyAccount();
 assert.equal(account.user.email,"player@example.com");
 assert.equal(account.profile.username,"player_one");
 assert.equal(account.access.platform_admin,false);
 assert.ok(sdk.calls.some(x=>x[0]==="rpc"&&x[1]==="get_my_access"));
 assert.ok(sdk.calls.some(x=>x[0]==="eq"&&x[1]==="id"&&x[2]==="user-1"));
});
test("profile edits whitelist safe columns; cannot edit role, admin or someone else's ID",async()=>{
 const sdk=mockSupabase(),service=createProductionAccountService(sdk);
 for(const bad of [{id:"user-2"},{role:"admin"},{platform_admin:true},{email:"new@example.com"},{organization_id:"owner"}])
  await assert.rejects(service.editMyProfile(bad),/Only editable profile fields/);
 assert.equal(sdk.calls.some(x=>x[0]==="update"),false);
 await service.editMyProfile({display_name:"New Display",discoverable:false});
 const update=sdk.calls.find(x=>x[0]==="update")[1];
 assert.deepEqual(update,{display_name:"New Display",discoverable:false});
 assert.ok(sdk.calls.some(x=>x[0]==="eq"&&x[2]==="user-1"));
});
test("rejected invalid signups do not touch auth",async()=>{
 const sdk=mockSupabase(),service=createProductionAccountService(sdk);
 await assert.rejects(service.signUp({email:"wrong",password:"long-enough-password",displayName:"Person"}),/email/);
 await assert.rejects(service.signUp({email:"test@example.com",password:"short",displayName:"Person"}),/Password/);
 await assert.rejects(service.signUp({email:"test@example.com",password:"valid-long-password",displayName:"X"}),/Display name/);
 assert.equal(sdk.calls.length,0);
});
test("session observer gives only user identity, not trusted role claims",()=>{
 const sdk=mockSupabase(),service=createProductionAccountService(sdk),changes=[];
 const dispose=service.watchSession(evt=>changes.push(evt));dispose();
 assert.deepEqual(changes,[{event:"SIGNED_IN",signedIn:true,userId:"user-1"}]);
 assert.ok(sdk.calls.some(x=>x[0]==="unsubscribe"));
});
