/**
 * UCL production account service (not wired into the local-demo UI).
 * Pass an initialized @supabase/supabase-js v2 client using ONLY the publishable key.
 * No roles are accepted from signup or profile edits. Privileges are server-managed.
 */
const NAME_LIMIT=80;
const userEmail=value=>String(value??"").trim().toLowerCase();
const safeName=value=>String(value??"").trim();
const allowedProfileFields=new Set(["display_name","username","city","state","avatar_url","discoverable"]);
function expect(result){if(result?.error)throw result.error;return result?.data??null}
function validEmail(email){return email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
function passwordInput(value){if(typeof value!=="string"||value.length<12||value.length>256)throw Error("Password must contain 12–256 characters");return value}
function validateProfile(profile){
 if(profile===null||typeof profile!=="object"||Array.isArray(profile))throw Error("Profile fields must be an object");
 const fields=Object.keys(profile);
 if(!fields.length||fields.some(k=>!allowedProfileFields.has(k)))throw Error("Only editable profile fields can be changed");
 const changes={};
 for(const field of fields){
  const v=profile[field];
  if(field==="discoverable"){if(typeof v!=="boolean")throw Error("Discoverable must be boolean");changes[field]=v;continue}
  if(v!==null&&typeof v!=="string")throw Error("Profile text must be a string");
  changes[field]=v===null?null:v.trim();
  if(field==="display_name"&&(!changes[field]||changes[field].length<2||changes[field].length>NAME_LIMIT))throw Error("Display name must be 2–80 characters");
  if(field==="username"&&changes[field]!==null&&!/^[a-z0-9_]{3,24}$/.test(changes[field]))throw Error("Username must use 3–24 lowercase letters, digits or underscores");
  if(["city","state"].includes(field)&&changes[field]?.length>100)throw Error("Location is too long");
  if(field==="avatar_url"&&changes[field]!==null&&(!/^https:\/\//.test(changes[field])||changes[field].length>2048))throw Error("Avatar URL must be HTTPS");
 }
 return changes;
}
export function createProductionAccountService(supabase,{passwordResetRedirectTo}={}){
 if(!supabase?.auth?.signUp||!supabase?.auth?.getUser||!supabase?.from||!supabase?.rpc)throw Error("A configured Supabase client is required");
 return {
  async signUp({email,password,displayName}){
   const normalized=userEmail(email),name=safeName(displayName);
   if(!validEmail(normalized))throw Error("Enter a valid email address");
   passwordInput(password);
   if(name.length<2||name.length>NAME_LIMIT)throw Error("Display name must be 2–80 characters");
   const data=expect(await supabase.auth.signUp({
    email:normalized,password,options:{data:{display_name:name}}
   }));
   // An email confirmation may be required; do not claim the user is signed in.
   return {userId:data?.user?.id??null,emailConfirmationRequired:!data?.session};
  },
  async signIn({email,password}){
   const normalized=userEmail(email);
   if(!validEmail(normalized)||typeof password!=="string"||!password)throw Error("Email and password are required");
   const data=expect(await supabase.auth.signInWithPassword({email:normalized,password}));
   return {userId:data?.user?.id??null,authenticated:Boolean(data?.session)};
  },
  async sendPasswordReset(email){
   const normalized=userEmail(email);
   if(!validEmail(normalized))throw Error("Enter a valid email address");
   const options=passwordResetRedirectTo?{redirectTo:passwordResetRedirectTo}:{};
   expect(await supabase.auth.resetPasswordForEmail(normalized,options));
   return true;
  },
  async signOut(){expect(await supabase.auth.signOut());return true},
  async loadMyAccount(){
   // getUser validates the current auth token against the auth server.
   const result=await supabase.auth.getUser();
   if(result.error)throw result.error;
   const user=result.data?.user;
   if(!user)return null;
   const profile=expect(await supabase.from("profiles")
     .select("id,display_name,username,city,state,avatar_url,discoverable")
     .eq("id",user.id).single());
   const access=expect(await supabase.rpc("get_my_access"));
   return {user:{id:user.id,email:user.email??null,emailConfirmed:Boolean(user.email_confirmed_at)},
    profile,access};
  },
  async editMyProfile(profile){
   const data=validateProfile(profile);
   const result=await supabase.auth.getUser();
   if(result.error)throw result.error;
   if(!result.data?.user?.id)throw Error("Sign in before updating your profile");
   return expect(await supabase.from("profiles").update(data).eq("id",result.data.user.id)
     .select("id,display_name,username,city,state,avatar_url,discoverable").single());
  },
  watchSession(listener){
   if(typeof listener!=="function")throw Error("A session listener is required");
   const response=supabase.auth.onAuthStateChange((event,session)=>listener({
    event,signedIn:Boolean(session?.user),userId:session?.user?.id??null
   }));
   return ()=>response?.data?.subscription?.unsubscribe?.();
  }
 };
}
