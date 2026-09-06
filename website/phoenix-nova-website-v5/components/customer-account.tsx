"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

type User = { id:string; username:string; createdAt:number };
type Mode = "login" | "register" | "recover";
export function CustomerAccount({locale, familyView=false}:{locale:"zh"|"en";familyView?:boolean}) {
  const en = locale === "en";
  const t = (zh:string,english:string) => en ? english : zh;
  const [mode,setMode]=useState<Mode>("login");
  const [user,setUser]=useState<User|null>(null);
  const [ready,setReady]=useState(false);
  const [available,setAvailable]=useState(false);
  const [registration,setRegistration]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [recovery,setRecovery]=useState("");
  const [showPassword,setShowPassword]=useState(false);
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [newPassword,setNewPassword]=useState("");
  const [recoveryInput,setRecoveryInput]=useState("");
  const [testAccount,setTestAccount]=useState(false);

  function errorMessage(code:string) {
    const messages:Record<string,[string,string]>={
      AUTH_NOT_CONFIGURED:["账户服务尚未启用，请稍后再试。","Account access is not enabled yet. Please try again later."],
      AUTH_UNAVAILABLE:["账户服务暂时无法连接，请稍后重试。","Account service is unavailable. Please try again later."],
      INVALID_USERNAME:["用户名使用 3–32 位英文字母、数字或下划线。","Use 3–32 letters, numbers or underscores for your username."],
      INVALID_PASSWORD:["新密码请使用 15–128 个字符；登录时请填写密码。","Use 15–128 characters for a new password. Enter your password to sign in."],
      WEAK_PASSWORD:["这个密码容易被猜到，请换一个更长的短语。","This password is easily guessed. Please choose a stronger passphrase."],
      INVALID_CREDENTIALS:["用户名或密码不正确。","The username or password is incorrect."],
      INVALID_RECOVERY:["用户名或恢复码不正确，或恢复码已失效。","The username or recovery code is incorrect, or the code has expired."],
      ACCOUNT_UNAVAILABLE:["无法使用这个用户名，请更换或尝试登录。","This username is unavailable. Choose another or try signing in."],
      REGISTRATION_CLOSED:["新账号注册暂未开放。","New account registration is not open."],
      TEST_ACCOUNT_REQUIRED:["请确认本次仅使用测试账号。","Please confirm that this is a test account."],
      TRY_LATER:["尝试次数较多，请稍后再试。","Too many attempts. Please try again later."],
      SIGN_IN_REQUIRED:["登录已失效，请重新登录。","Your session has ended. Please sign in again."],
      FORBIDDEN_ORIGIN:["请从原网站重新打开账户页面。","Please reopen the account page from the original website."],
    };
    return messages[code]?.[en?1:0]??t("操作未完成，请稍后重试。","The action did not complete. Please try again later.");
  }
  useEffect(()=>{
    let live=true;
    fetch("/api/customer-auth/session",{credentials:"same-origin",cache:"no-store"})
      .then(async response=>({ok:response.ok,data:await response.json()}))
      .then(({ok,data})=>{if(!live)return;setAvailable(ok);setRegistration(Boolean(data.registration));setUser(data.user??null);if(data.user)setUsername(data.user.username);if(!ok)setMessage(en?"Account access is not enabled yet.":"账户服务尚未启用。");})
      .catch(()=>{if(live)setMessage(en?"Account service is unavailable.":"账户服务暂时无法连接。");})
      .finally(()=>{if(live)setReady(true);});
    return()=>{live=false;};
  },[en]);
  async function act(action:string,payload:Record<string,unknown>) {
    setBusy(true);setMessage("");
    try {
      const response=await fetch(`/api/customer-auth/${action}`,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      const data=await response.json();
      if(!response.ok){setMessage(errorMessage(data.error));if(data.error==="SIGN_IN_REQUIRED")setUser(null);return;}
      setPassword("");setNewPassword("");setRecoveryInput("");
      if(data.recoveryCode){setRecovery(data.recoveryCode);setUser(null);setMode("login");setMessage(t("请保存新的恢复码，随后使用用户名和密码登录。旧恢复码已失效。","Save your new recovery code, then sign in with your username and password. Any previous code is invalid."));}
      else if(action==="login"){setUser(data.user);window.location.assign(`/${locale}/family-center`);}
      else {setUser(null);setMessage(t("已安全退出。","You have signed out."));}
    } catch {setMessage(t("网络连接中断，请重试。","The connection was interrupted. Please try again."));}
    finally {setBusy(false);}
  }
  function submit(event:FormEvent) {
    event.preventDefault();
    if(mode==="recover")void act("recover",{username,recoveryCode:recoveryInput.trim(),newPassword});
    else void act(mode,{username,password,...(mode==="register"?{testAccount}: {})});
  }
  function switchMode(next:Mode){setMode(next);setPassword("");setNewPassword("");setMessage("");}
  function downloadRecovery(){
    const blob=new Blob([`Phoenix Nova account recovery\nUsername: ${username}\nRecovery code: ${recovery}\nKeep this private. This code is replaced after use or password change.\n`],{type:"text/plain;charset=utf-8"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="phoenix-account-recovery.txt";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <main className="account-shell">
    <div className="account-intro"><p className="account-kicker">PHOENIX FAMILY OS™</p><h1>{user?t("我的账户","My account"):t("欢迎回到凤启","Welcome to Phoenix Nova")}</h1><p>{t("一个账户，连接你的长期服务。","One account for your ongoing services.")}</p></div>
    <section className="account-card" aria-label={t("账户管理","Account access")}>
      <p className="account-boundary">{t("受控测试阶段 · 请使用专门的测试账号和密码。","Controlled testing · Use a dedicated test account and password.")}</p>
      {!ready?<p role="status">{t("正在连接账户服务…","Connecting to account service…")}</p>:null}
      {message?<p className="account-message" role="status" aria-live="polite">{message}</p>:null}
      {recovery?<div className="account-recovery"><h2>{t("保存你的恢复码","Save your recovery code")}</h2><p>{t("恢复码只显示这一次。它可以重设密码，请存放在密码管理器中，不要发给他人。","This code is displayed only once and can reset your password. Save it in your password manager and keep it private.")}</p><code>{recovery}</code><button type="button" className="account-secondary" onClick={downloadRecovery}>{t("下载恢复码","Download recovery code")}</button><button type="button" className="account-primary" onClick={()=>setRecovery("")}>{t("已保存，继续登录","Saved — continue to sign in")}</button></div>:null}
      {ready&&available&&!user&&!recovery?<>
        <div className="account-tabs"><button type="button" aria-pressed={mode==="login"} onClick={()=>switchMode("login")}>{t("登录","Sign in")}</button>{registration?<button type="button" aria-pressed={mode==="register"} onClick={()=>switchMode("register")}>{t("创建账号","Create account")}</button>:null}</div>
        <form onSubmit={submit}>
          <label htmlFor="account-username">{t("用户名","Username")}</label><input id="account-username" name="username" value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} minLength={3} maxLength={32} pattern="[a-zA-Z0-9_]{3,32}" required aria-describedby="username-hint"/>
          <p id="username-hint" className="account-hint">{t("3–32 位英文字母、数字或下划线，不区分大小写。","3–32 letters, numbers or underscores; not case-sensitive.")}</p>
          {mode==="recover"?<><label htmlFor="account-recovery">{t("恢复码","Recovery code")}</label><input id="account-recovery" value={recoveryInput} onChange={e=>setRecoveryInput(e.target.value)} autoComplete="off" spellCheck={false} required/><label htmlFor="account-new-password">{t("新密码","New password")}</label><input id="account-new-password" name="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} type={showPassword?"text":"password"} autoComplete="new-password" minLength={15} maxLength={128} required/></>:<><label htmlFor="account-password">{t("密码","Password")}</label><input id="account-password" name="password" value={password} onChange={e=>setPassword(e.target.value)} type={showPassword?"text":"password"} autoComplete={mode==="register"?"new-password":"current-password"} minLength={mode==="register"?15:1} maxLength={128} required/></>}
          <label className="account-check"><input type="checkbox" checked={showPassword} onChange={e=>setShowPassword(e.target.checked)}/>{t("显示密码","Show password")}</label>
          {mode!=="login"?<p className="account-hint">{t("至少 15 个字符，可使用容易记住的长短语。","Use at least 15 characters; a memorable passphrase works well.")}</p>:null}
          {mode==="register"?<label className="account-check"><input type="checkbox" required checked={testAccount} onChange={e=>setTestAccount(e.target.checked)}/>{t("我使用的是测试账号，不录入真实客户资料。","I am using a test account without real customer information.")}</label>:null}
          <button className="account-primary" disabled={busy}>{busy?t("处理中…","Working…"):mode==="login"?t("登录家庭中心","Sign in to Family Center"):mode==="register"?t("创建测试账号","Create test account"):t("重设密码","Reset password")}</button>
        </form>
        <button type="button" className="account-link" onClick={()=>switchMode(mode==="recover"?"login":"recover")}>{mode==="recover"?t("返回登录","Back to sign in"):t("忘记密码？使用恢复码","Forgot password? Use your recovery code")}</button>
        <p className="account-hint">{t("手机验证码与邮箱找回尚未开放；当前可使用用户名、密码和恢复码。","SMS verification and email recovery are not yet available. Use your username, password and recovery code.")}</p>
      </>:null}
      {user&&!recovery?<>
        <h2>{t("你好，","Hello, ")}{user.username}</h2><p>{t("你已通过账户验证。","You have signed in successfully.")}</p>
        <div className="account-data-state"><h3>{t("家庭资料尚未接入","Family records are not connected yet")}</h3><p>{t("你的账户已经建立。证件节点、成绩单和家属授权将在资料服务接通后显示。","Your account is ready. Document dates, transcripts and family permissions will appear after the records service is connected.")}</p></div>
        {!familyView?<Link className="account-secondary" href={`/${locale}/family-center`}>{t("返回家庭中心","Return to Family Center")}</Link>:null}
        <details><summary>{t("修改密码与恢复码","Password and recovery code")}</summary><form onSubmit={e=>{e.preventDefault();void act("password",{currentPassword:password,newPassword});}}><label htmlFor="current-password">{t("当前密码","Current password")}</label><input id="current-password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/><label htmlFor="new-password">{t("新密码","New password")}</label><input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} minLength={15} maxLength={128} required/><button className="account-primary" disabled={busy}>{t("修改并退出所有设备","Change and sign out all devices")}</button><button className="account-secondary" type="button" disabled={busy||!password} onClick={()=>void act("recovery-code",{currentPassword:password})}>{t("仅更换恢复码并退出","Replace recovery code and sign out")}</button></form></details>
        <div className="account-actions"><button type="button" className="account-secondary" disabled={busy} onClick={()=>void act("logout",{})}>{t("退出登录","Sign out")}</button><button type="button" className="account-link" disabled={busy} onClick={()=>void act("logout-all",{})}>{t("退出所有设备","Sign out all devices")}</button></div>
      </>:null}
      <Link className="account-link" href={`/${locale}`}>{t("返回凤启首页","Back to Phoenix Nova")}</Link>
    </section>
  </main>;
}
