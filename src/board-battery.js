// Board-device battery reporting, browser-local pilot only.
// IMPORTANT: Battery Status API is unavailable on Safari/iPadOS and some other browsers.
// Production should publish authenticated, board-paired health heartbeats to the backend.
export const BOARD_BATTERY_KEY = "ucl-demo-board-battery-v1";
export const BATTERY_STALE_MS = 3 * 60 * 1000;

export function readBoardBattery(storage) {
  try {
    const value = JSON.parse(storage?.getItem?.(BOARD_BATTERY_KEY) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}
export function batterySummary(report, now=Date.now()) {
  if (!report || typeof report !== "object") return {status:"unknown",label:"Tablet not checked in",detail:"No battery report from this board"};
  const at = Number(report.at);
  if (!Number.isFinite(at) || at <= 0 || at > now + 60_000) return {status:"unknown",label:"Battery unknown",detail:"Invalid tablet check-in"};
  const age = Math.max(0, now - at),minutes=Math.max(1,Math.floor(age / 60_000));
  if (age > BATTERY_STALE_MS) return {status:"stale",label:"Battery status stale",detail:"Last tablet report "+minutes+" min ago"};
  if (report.status !== "available") return {status:"unavailable",label:"Battery unavailable",detail:"This browser does not expose battery percentage; last check-in just now"};
  const pct=Number(report.percent);
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return {status:"unknown",label:"Battery unknown",detail:"Invalid percentage"};
  const percent=Math.round(pct),charging=report.charging===true;
  const status=percent<10?"critical":percent<25?"low":charging?"charging":"healthy";
  return {status,label:percent+"%"+(charging?" · Charging":""),detail:status==="critical"?"Critical battery — arrange charging or a spare":status==="low"?"Low battery — prepare a charger or spare":"Tablet reported "+minutes+" min ago"};
}
export function startBoardBatteryReporter({
  stationId, navigatorLike, storage, now=()=>Date.now(),
  setIntervalFn=null, clearIntervalFn=null
}) {
  if (!stationId || typeof stationId !== "string") throw Error("Battery reporting requires a board station");
  let active=true,battery=null,timer=null;
  const write=(status,level=null,charging=null)=>{
    if(!active)return;
    const records=readBoardBattery(storage);
    records[stationId]={status,percent:level,charging,at:now()};
    try { storage?.setItem?.(BOARD_BATTERY_KEY,JSON.stringify(records)); } catch { /* optional telemetry */ }
  };
  const update=()=>{
    if(!battery){write("unavailable");return}
    const level=Number(battery.level);
    write(Number.isFinite(level)&&level>=0&&level<=1?"available":"unavailable",
      Number.isFinite(level)&&level>=0&&level<=1?Math.round(level*100):null,
      typeof battery.charging==="boolean"?battery.charging:null);
  };
  // Reporting is optional and must not prevent a round from being scored.
  write("unavailable");
  if(typeof navigatorLike?.getBattery==="function"){
    try {
      Promise.resolve(navigatorLike.getBattery()).then(value=>{
        if(!active)return;
        battery=value;
        battery?.addEventListener?.("levelchange",update);
        battery?.addEventListener?.("chargingchange",update);
        update();
      }).catch(()=>write("unavailable"));
    } catch { write("unavailable"); }
  }
  if(typeof setIntervalFn==="function")timer=setIntervalFn(update,60_000);
  return ()=>{
    active=false;
    battery?.removeEventListener?.("levelchange",update);
    battery?.removeEventListener?.("chargingchange",update);
    if(timer!=null&&typeof clearIntervalFn==="function")clearIntervalFn(timer);
  };
}
