/***********************
 * SJTC Production Department Dashboard v1.2.9
 * Frontend for GitHub Pages
 * Set PRODUCTION_API_URL to your Cloudflare Worker URL after deployment.
 ***********************/
const PRODUCTION_API_URL = "https://prodman.sjtc-kobempeynado.workers.dev/";
// Logistics is now native to this Production Dashboard database.
const ADMIN_PIN_KEY = "sjtc_production_admin_pin";
const DEMO_PIN = "123456";
const AUTO_REFRESH_MS = 60000; // Auto-sync interval. Change to 30000 for 30 seconds, 120000 for 2 minutes.

const DEFAULT_PROCESS_COLUMNS = [
  "Design","Project Briefing","Site Verification","Pre-Milling","Milling","CNC","Metal Craft","Wood Craft",
  "Assembly","Sanding","Painting","Staining","Varnishing","Upholstery","Hardware Installation","Quality Control","Delivery"
];
let PROCESS_COLUMNS = [...DEFAULT_PROCESS_COLUMNS];

const REQUEST_TYPES = ["Delivery", "Client Call", "Service"];

const $ = id => document.getElementById(id);
const pad2 = n => String(n).padStart(2,"0");
const ymd = d => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const nowISO = () => new Date().toISOString();
const niceDate = iso => iso ? new Date(iso).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}) : "—";
const niceDT = iso => iso ? new Date(iso).toLocaleString() : "—";
const escapeHtml = s => String(s ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
const escapeAttr = s => escapeHtml(s).replace(/"/g,"&quot;");
const cleanSO = v => String(v || "").trim().replace(/^SO[-\s]*/i, "");

let autoRefreshTimer = null;
let isAutoRefreshing = false;
let actionBusy = false;

let state = {
  admin: false,
  page: "overview",
  sidebarCollapsed: localStorage.getItem("sjtc_sidebar_collapsed") === "Y",
  projects: [], items: [], notes: [], logs: [], announcements: [],
  logisticsRequests: [], logisticsItems: [],
  teams: [], teamMembers: [], personnel: [], drivers: [], vehicles: [], vehiclePassengers: [],
  settings: {}, currentProjectId: null, editingProjectId: null,
  pendingMove: null, pendingScheduleId: null, logisticsOffsetWeeks: 0
};

const demo = (() => {
  const today = new Date();
  const d = n => { const x = new Date(today); x.setDate(x.getDate()+n); return ymd(x); };
  const personnel = [
    { PersonnelID:"PER-0001", PersonnelName:"Juan D.", Role:"Team Lead", Department:"Production", ContactNumber:"", CanDrive:"N", CanInstall:"Y", Active:"Y" },
    { PersonnelID:"PER-0002", PersonnelName:"Mark", Role:"Carpenter", Department:"Production", ContactNumber:"", CanDrive:"N", CanInstall:"Y", Active:"Y" },
    { PersonnelID:"PER-0003", PersonnelName:"Allan", Role:"Helper", Department:"Production", ContactNumber:"", CanDrive:"N", CanInstall:"Y", Active:"Y" },
    { PersonnelID:"PER-0004", PersonnelName:"Rico", Role:"Painter", Department:"Production", ContactNumber:"", CanDrive:"N", CanInstall:"N", Active:"Y" },
    { PersonnelID:"PER-0005", PersonnelName:"Mang Tony", Role:"Driver", Department:"Logistics", ContactNumber:"0917 555 1111", CanDrive:"Y", CanInstall:"N", Active:"Y" },
    { PersonnelID:"PER-0006", PersonnelName:"CK Empeynado", Role:"Admin / Production Manager", Department:"Admin", ContactNumber:"", CanDrive:"Y", CanInstall:"N", Active:"Y" },
    { PersonnelID:"PER-0007", PersonnelName:"Design Staff", Role:"Designer", Department:"Design", ContactNumber:"", CanDrive:"N", CanInstall:"N", Active:"Y" }
  ];
  return {
    settings: { ADMIN_PIN: DEMO_PIN, APP_NAME: "SJTC Production Department Dashboard", VERSION: "1.2.9", PROCESS_COLUMNS: DEFAULT_PROCESS_COLUMNS.join("|") },
    personnel,
    drivers: [{ DriverID:"DRV-0001", PersonnelID:"PER-0005", DriverName:"Mang Tony", DriverPhone:"0917 555 1111", Active:"Y" }],
    vehicles: [{ VehicleID:"VEH-0001", VehicleCode:"TRUCK-1", VehicleLabel:"Truck 1", PlateNo:"ABC 1234", PlateEnding:"4", Active:"Y" }],
    vehiclePassengers: [{ PassengerID:"VP-0001", VehicleID:"VEH-0001", PersonnelID:"PER-0003", PassengerName:"Allan", Active:"Y" }],
    teams: [
      { TeamID:"TEAM-0001", TeamName:"Team A", TeamLead:"Juan D.", Active:"Y" },
      { TeamID:"TEAM-0002", TeamName:"Finishing Team", TeamLead:"Rico", Active:"Y" }
    ],
    teamMembers: [
      { TeamMemberID:"TM-0001", TeamID:"TEAM-0001", MemberName:"Mark", Role:"Carpenter", Active:"Y" },
      { TeamMemberID:"TM-0002", TeamID:"TEAM-0001", MemberName:"Allan", Role:"Helper", Active:"Y" },
      { TeamMemberID:"TM-0003", TeamID:"TEAM-0002", MemberName:"Rico", Role:"Painter", Active:"Y" }
    ],
    projects: [
      { ProjectID:"PROJ-0001", SONumber:"0264", ClientName:"Dela Cruz", ContactNumber:"0917 123 4567", Address:"BGC, Taguig", ProjectSummary:"Kitchen Cabinet Package", DueDate:d(5), OverallStatus:"In Production", Priority:"High", AssignedTeamID:"TEAM-0001", AssignedTeamLead:"Juan D.", CreatedBy:"Kobee", CreatedAt:nowISO(), UpdatedAt:nowISO(), Active:"Y" },
      { ProjectID:"PROJ-0002", SONumber:"0265", ClientName:"Reyes", ContactNumber:"0918 222 3333", Address:"Makati", ProjectSummary:"Wardrobe and TV Console", DueDate:d(-2), OverallStatus:"In Production", Priority:"Urgent", AssignedTeamID:"TEAM-0002", AssignedTeamLead:"Rico", CreatedBy:"Kobee", CreatedAt:nowISO(), UpdatedAt:nowISO(), Active:"Y" }
    ],
    items: [
      { ItemID:"ITEM-0001", ProjectID:"PROJ-0001", SONumber:"0264", ItemDescription:"Kitchen Base Cabinet", Quantity:"1", Unit:"set", ItemStatus:"CNC", DeliveryStatus:"Not Requested", AssignedTeamID:"TEAM-0001", AssignedPersonnel:"Juan D.", ItemDueDate:d(5), Remarks:"", CreatedAt:nowISO(), UpdatedAt:nowISO(), Active:"Y" },
      { ItemID:"ITEM-0002", ProjectID:"PROJ-0001", SONumber:"0264", ItemDescription:"Kitchen Wall Cabinet", Quantity:"1", Unit:"set", ItemStatus:"Assembly", DeliveryStatus:"Not Requested", AssignedTeamID:"TEAM-0001", AssignedPersonnel:"Mark", ItemDueDate:d(5), Remarks:"", CreatedAt:nowISO(), UpdatedAt:nowISO(), Active:"Y" },
      { ItemID:"ITEM-0003", ProjectID:"PROJ-0001", SONumber:"0264", ItemDescription:"Tall Pantry Cabinet", Quantity:"1", Unit:"pc", ItemStatus:"Pre-Milling", DeliveryStatus:"Not Requested", AssignedTeamID:"TEAM-0001", AssignedPersonnel:"Allan", ItemDueDate:d(5), Remarks:"", CreatedAt:nowISO(), UpdatedAt:nowISO(), Active:"Y" },
      { ItemID:"ITEM-0004", ProjectID:"PROJ-0002", SONumber:"0265", ItemDescription:"Wardrobe Cabinet", Quantity:"1", Unit:"set", ItemStatus:"Sanding", DeliveryStatus:"Not Requested", AssignedTeamID:"TEAM-0002", AssignedPersonnel:"Rico", ItemDueDate:d(-2), Remarks:"", CreatedAt:nowISO(), UpdatedAt:nowISO(), Active:"Y" }
    ],
    notes: [{ NoteID:"NOTE-0001", ProjectID:"PROJ-0001", ItemID:"", SONumber:"0264", NoteText:"Initial production review completed.", Signature:"Kobee", CreatedAt:nowISO(), Active:"Y" }],
    logs: [{ LogID:"LOG-0001", ItemID:"ITEM-0001", ProjectID:"PROJ-0001", SONumber:"0264", ItemDescription:"Kitchen Base Cabinet", FromStatus:"Milling", ToStatus:"CNC", AssignedPersonnel:"Juan D.", StartedAt:nowISO(), FinishedAt:"", MovedBy:"Kobee", Remarks:"", CreatedAt:nowISO(), EditedAt:"", EditedBy:"", CorrectionNote:"" }],
    announcements: [{ AnnouncementID:"ANN-0001", Title:"Daily Reminder", Message:"Update production status before end of shift.", PostedBy:"Kobee", CreatedAt:nowISO(), ExpiryDate:"", Active:"Y" }],
    logisticsRequests: [{ RequestID:"REQ-DEMO-1", Type:"Delivery", Status:"PENDING", StartDT:new Date().toISOString(), EndDT:new Date(Date.now()+4*3600000).toISOString(), RequestedBy:"Production", DriverCode:"", VehicleCode:"", Payload:{ SONumber:"0264", ClientName:"Dela Cruz", Address:"BGC, Taguig", ContactNumber:"0917 123 4567", Items:"Kitchen Base Cabinet", Notes:"Partial delivery request", AreaClass:"NCR" }, TripStatus:"READY" }],
    logisticsItems: []
  };
})();

async function api(action, payload){
  if(!PRODUCTION_API_URL) return demoApi(action, payload || {});
  const res = await fetch(`${PRODUCTION_API_URL}?action=${encodeURIComponent(action)}`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload || {}) });
  const j = await res.json();
  if(!j.ok) throw new Error(j.error || "API error");
  return j;
}
function demoApi(action, body){
  const ok = data => Promise.resolve({ok:true, ...data});
  if(action === "upsertSetting"){
    demo.settings[body.key] = String(body.value ?? "");
    if(body.key === "PROCESS_COLUMNS") PROCESS_COLUMNS = String(body.value || "").split("|").map(x=>x.trim()).filter(Boolean);
    return ok({settings:demo.settings});
  }
  if(action === "upsertPersonnel"){
    const p = {...(body.personnel || {})};
    if(p.PersonnelID && demo.personnel.some(x=>x.PersonnelID===p.PersonnelID)){
      const idx = demo.personnel.findIndex(x=>x.PersonnelID===p.PersonnelID);
      demo.personnel[idx] = {...demo.personnel[idx], ...p, UpdatedAt:nowISO()};
      return ok({personnel:demo.personnel[idx]});
    }
    const row = { PersonnelID:`PER-${String(demo.personnel.length+1).padStart(4,"0")}`, PersonnelName:p.PersonnelName||"", Role:p.Role||"Personnel", Department:p.Department||"", ContactNumber:p.ContactNumber||"", CanDrive:p.CanDrive||"N", CanInstall:p.CanInstall||"N", Active:p.Active||"Y", CreatedAt:nowISO(), UpdatedAt:nowISO() };
    demo.personnel.push(row); return ok({personnel:row});
  }
  if(action === "upsertVehicle"){
    const v = {...(body.vehicle || {})};
    if(v.VehicleID && demo.vehicles.some(x=>x.VehicleID===v.VehicleID)){
      const idx = demo.vehicles.findIndex(x=>x.VehicleID===v.VehicleID);
      demo.vehicles[idx] = {...demo.vehicles[idx], ...v, UpdatedAt:nowISO()}; return ok({vehicle:demo.vehicles[idx]});
    }
    const row = { VehicleID:`VEH-${String(demo.vehicles.length+1).padStart(4,"0")}`, VehicleCode:v.VehicleCode||"", VehicleLabel:v.VehicleLabel||"", PlateNo:v.PlateNo||"", PlateEnding:v.PlateEnding||"", Active:v.Active||"Y", CreatedAt:nowISO(), UpdatedAt:nowISO() };
    demo.vehicles.push(row); return ok({vehicle:row});
  }
  if(action === "upsertVehiclePassenger"){
    const vp = {...(body.vehiclePassenger || {})};
    const person = demo.personnel.find(p=>p.PersonnelID===vp.PersonnelID) || {};
    vp.PassengerName = vp.PassengerName || person.PersonnelName || "";
    if(vp.PassengerID && demo.vehiclePassengers.some(x=>x.PassengerID===vp.PassengerID)){
      const idx = demo.vehiclePassengers.findIndex(x=>x.PassengerID===vp.PassengerID);
      demo.vehiclePassengers[idx] = {...demo.vehiclePassengers[idx], ...vp, UpdatedAt:nowISO()}; return ok({vehiclePassenger:demo.vehiclePassengers[idx]});
    }
    const row = { PassengerID:`VP-${String(demo.vehiclePassengers.length+1).padStart(4,"0")}`, VehicleID:vp.VehicleID||"", PersonnelID:vp.PersonnelID||"", PassengerName:vp.PassengerName||"", Active:vp.Active||"Y", CreatedAt:nowISO(), UpdatedAt:nowISO() };
    demo.vehiclePassengers.push(row); return ok({vehiclePassenger:row});
  }
  if(action === "productionBootstrap") return ok(JSON.parse(JSON.stringify(demo)));
  if(action === "validateAdmin") return ok({ valid: body.pin === (demo.settings.ADMIN_PIN || DEMO_PIN) });
  if(action === "createProject"){
    const p = {...(body.project || {}), SONumber:cleanSO((body.project||{}).SONumber)};
    const ProjectID = `PROJ-${String(demo.projects.length+1).padStart(4,"0")}`;
    const row = { ProjectID, ...p, CreatedAt:nowISO(), UpdatedAt:nowISO(), Active:"Y" };
    demo.projects.unshift(row);
    (body.items||[]).forEach(it => demo.items.push({ ItemID:`ITEM-${String(demo.items.length+1).padStart(4,"0")}`, ProjectID, SONumber:row.SONumber, ...it, CreatedAt:nowISO(), UpdatedAt:nowISO(), Active:"Y" }));
    return ok({project:row});
  }
  if(action === "updateProject"){
    const i = demo.projects.findIndex(x=>x.ProjectID===body.projectId);
    if(i>=0) demo.projects[i] = {...demo.projects[i], ...(body.project||{}), SONumber:cleanSO((body.project||{}).SONumber || demo.projects[i].SONumber), UpdatedAt:nowISO()};
    return ok({project:demo.projects[i]});
  }
  if(action === "saveProjectItems"){
    const project = demo.projects.find(p=>p.ProjectID===body.projectId);
    if(!project) return ok({items:[]});
    const keep = new Set();
    (body.items||[]).forEach(raw=>{
      if(raw.ItemID && demo.items.some(x=>x.ItemID===raw.ItemID)){
        const idx = demo.items.findIndex(x=>x.ItemID===raw.ItemID);
        demo.items[idx] = {...demo.items[idx], ...raw, SONumber:project.SONumber, UpdatedAt:nowISO(), Active:raw.Active || "Y"};
        keep.add(raw.ItemID);
      } else if(String(raw.ItemDescription||"").trim()) {
        const ItemID = `ITEM-${String(demo.items.length+1).padStart(4,"0")}`;
        demo.items.push({ ItemID, ProjectID:project.ProjectID, SONumber:project.SONumber, ...raw, CreatedAt:nowISO(), UpdatedAt:nowISO(), Active:"Y" });
        keep.add(ItemID);
      }
    });
    demo.items.forEach(x=>{ if(x.ProjectID===project.ProjectID && !keep.has(x.ItemID)) x.Active="N"; });
    return ok({items:demo.items.filter(x=>x.ProjectID===project.ProjectID && x.Active!=="N")});
  }
  if(action === "addProjectNote"){
    const n = { NoteID:`NOTE-${String(demo.notes.length+1).padStart(4,"0")}`, ...body, CreatedAt:nowISO(), Active:"Y" };
    demo.notes.push(n); return ok({note:n});
  }
  if(action === "moveProductionItem"){
    const item = demo.items.find(x=>x.ItemID===body.itemId); if(!item) throw new Error("Item not found");
    const previous = item.ItemStatus || "";
    demo.logs.filter(l=>l.ItemID===item.ItemID && !l.FinishedAt).forEach(l=>l.FinishedAt=nowISO());
    item.ItemStatus = body.toStatus; item.AssignedPersonnel = body.assignedPersonnel; item.UpdatedAt=nowISO();
    const log = { LogID:`LOG-${String(demo.logs.length+1).padStart(4,"0")}`, ItemID:item.ItemID, ProjectID:item.ProjectID, SONumber:item.SONumber, ItemDescription:item.ItemDescription, FromStatus:previous, ToStatus:body.toStatus, AssignedPersonnel:body.assignedPersonnel, StartedAt:nowISO(), FinishedAt:"", MovedBy:body.movedBy||"Admin", Remarks:body.remarks||"", CreatedAt:nowISO(), EditedAt:"", EditedBy:"", CorrectionNote:"" };
    demo.logs.push(log); return ok({item,log});
  }
  if(action === "submitLogisticsRequestLocal"){
    const r = { RequestID:`REQ-DEMO-${demo.logisticsRequests.length+1}`, Status:"PENDING", DriverCode:"", VehicleCode:"", TripStatus:"READY", ...(body.request||{}) };
    if(r.Payload && r.Payload.SONumber) r.Payload.SONumber = cleanSO(r.Payload.SONumber);
    demo.logisticsRequests.unshift(r); return ok({request:r});
  }
  if(action === "scheduleLogisticsRequestLocal"){
    const r = demo.logisticsRequests.find(x=>x.RequestID===body.requestId); if(r) Object.assign(r, body.updates||{}, {Status:"CONFIRMED"}); return ok({request:r});
  }
  if(action === "returnLogisticsRequestPendingLocal"){
    const r = demo.logisticsRequests.find(x=>x.RequestID===body.requestId);
    if(!r) throw new Error("Logistics request not found");
    r.Status = "PENDING";
    r.DriverCode = "";
    r.VehicleCode = "";
    r.TripStatus = "READY";
    if(r.Payload){ r.Payload.Passengers=[]; r.Payload.PassengerIDs=[]; r.Payload.Installers=[]; }
    return ok({request:r});
  }
  if(action === "cancelLogisticsRequestLocal"){
    const r = demo.logisticsRequests.find(x=>x.RequestID===body.requestId);
    if(!r) throw new Error("Logistics request not found");
    r.Status = "CANCELLED";
    r.TripStatus = r.TripStatus || "READY";
    r.Payload = {...(r.Payload||{}), CancelNote: body.note || "Cancelled by admin"};
    return ok({request:r});
  }
  if(action === "deleteLogisticsRequestLocal"){
    const idx = demo.logisticsRequests.findIndex(x=>x.RequestID===body.requestId);
    if(idx < 0) throw new Error("Logistics request not found");
    const [request] = demo.logisticsRequests.splice(idx,1);
    return ok({request});
  }
  return ok({});
}


function normalizeLogisticsRecords(){
  state.logisticsRequests = (state.logisticsRequests || [])
    .filter(r => String(r.Active || "Y").toUpperCase() !== "N")
    .map(r => ({...r, Payload: normalizePayload(r.Payload || r.PayloadJSON || {})}));
  state.logisticsRequests.forEach(r => { if(r.Payload) r.Payload.SONumber = cleanSO(r.Payload.SONumber); });
}
function normalizePayload(raw){
  if(!raw) return {};
  if(typeof raw === "object") return raw;
  try { return JSON.parse(raw || "{}"); } catch(_) { return {}; }
}
async function loadExternalLogisticsRequests(silent){
  // v1.2: logistics is native to the Production Dashboard database.
  // Requests are loaded by productionBootstrap from LogisticsRequests_V1.
  normalizeLogisticsRecords();
}
function setLoading(on, text="Working..."){
  const el = $("loadingOverlay");
  if(!el) return;
  el.querySelector(".loadingText").textContent = text;
  el.style.display = on ? "flex" : "none";
}
function setActionBusy(on, text="Processing..."){
  actionBusy = !!on;
  document.body.classList.toggle("actionBusy", !!on);
  setLoading(!!on, text);
  document.querySelectorAll("button").forEach(btn=>{
    if(on){
      btn.dataset.wasDisabled = btn.disabled ? "Y" : "N";
      btn.disabled = true;
    } else if(btn.dataset.wasDisabled !== "Y") {
      btn.disabled = false;
      delete btn.dataset.wasDisabled;
    }
  });
}
async function runAction(button, text, fn){
  if(actionBusy) return;
  const btn = button && button.target ? button.target : button;
  const oldText = btn && btn.textContent;
  try{
    setActionBusy(true, text || "Processing...");
    if(btn && oldText) btn.textContent = "Please wait...";
    await fn();
  } finally {
    if(btn && oldText) btn.textContent = oldText;
    setActionBusy(false);
  }
}
const FIELD_TIPS = {
  adminPinInput:"Enter the admin PIN to unlock editing, scheduling, and process movement controls.",
  lrType:"Choose whether the request is for delivery, client call, or service/purchasing.",
  lrRequestedBy:"Enter the name of the staff member submitting this logistics request.",
  lrDate:"Select the requested schedule date. Logistics admin can still revise this later.",
  lrTime:"Select the requested dispatch or call time.",
  lrSO:"Enter the SO number only. Do not type SO-.",
  lrClient:"Enter the client name connected to this request.",
  lrContact:"Enter the client or site contact number.",
  lrAddress:"Enter the exact delivery or installation address.",
  lrDestination:"Enter the destination for the service or client call.",
  lrArea:"Choose NCR if coding rules may apply. Choose Non-NCR for outside NCR trips.",
  lrItems:"List only the items included in this delivery request, especially for partial delivery.",
  lrNotes:"Add special instructions such as delivery restrictions, contact person, or priority notes.",
  lrPurpose:"Choose the main purpose of the service request.",
  lrVehicleReq:"Choose the preferred vehicle type if the request requires a specific capacity.",
  schedDate:"Final scheduled date for this logistics request.",
  schedTime:"Final scheduled dispatch/start time.",
  schedDriver:"Select the assigned driver.",
  schedVehicle:"Select the assigned vehicle.",
  schedRemarks:"Add schedule remarks, instructions, or correction notes.",
  noteSignature:"Enter your name or short signature for accountability.",
  noteText:"Write the production update, issue, or instruction. The date/time is saved automatically."
};
function applyFieldTips(root=document){
  Object.entries(FIELD_TIPS).forEach(([id,tip])=>{
    const el = root.getElementById ? root.getElementById(id) : document.getElementById(id);
    if(!el) return;
    el.title = tip;
    el.dataset.tip = tip;
    const wrap = el.closest("div");
    const label = wrap ? wrap.querySelector("label") : null;
    if(label){ label.classList.add("tipLabel"); label.dataset.tip = tip; label.title = tip; }
  });
}

async function load(options = {}){
  const silent = !!options.silent;
  setSync(silent ? "Auto-syncing..." : "Syncing...");
  if(!silent) setLoading(true, "Syncing data...");
  try{
    const data = await api("productionBootstrap", { pin: localStorage.getItem(ADMIN_PIN_KEY) || "" });
    PROCESS_COLUMNS = data.processColumns || (data.settings?.PROCESS_COLUMNS ? String(data.settings.PROCESS_COLUMNS).split("|") : DEFAULT_PROCESS_COLUMNS);
    Object.assign(state, {
      projects:data.projects||[], items:data.items||[], notes:data.notes||[], logs:data.logs||[], announcements:data.announcements||[],
      logisticsRequests:data.logisticsRequests||[], logisticsItems:data.logisticsItems||[],
      teams:data.teams||[], teamMembers:data.teamMembers||[], personnel:data.personnel||[], drivers:data.drivers||[], vehicles:data.vehicles||[], vehiclePassengers:data.vehiclePassengers||[], settings:data.settings||{}
    });
    state.projects.forEach(p=>p.SONumber=cleanSO(p.SONumber)); state.items.forEach(i=>i.SONumber=cleanSO(i.SONumber));
    await loadExternalLogisticsRequests(silent);
    setSync(PRODUCTION_API_URL ? `Synced ${new Date().toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})}` : "Demo mode");
    render();
  }catch(err){
    console.error(err);
    setSync("Sync failed");
    if(!silent) alert(err.message || err);
  } finally {
    if(!silent) setLoading(false);
  }
}
function setSync(text){ $("syncBadge").textContent = text; }
function isAnyModalOpen(){
  return Array.from(document.querySelectorAll(".modalBg")).some(m => m.style.display === "flex");
}
function shouldSkipAutoRefresh(){
  return actionBusy || isAutoRefreshing || isAnyModalOpen() || state.pendingMove || state.editingProjectId;
}
async function autoRefresh(){
  if(shouldSkipAutoRefresh()) return;
  isAutoRefreshing = true;
  try{ await load({silent:true}); }
  finally{ isAutoRefreshing = false; }
}
function startAutoRefresh(){
  if(autoRefreshTimer) clearInterval(autoRefreshTimer);
  autoRefreshTimer = setInterval(autoRefresh, AUTO_REFRESH_MS);
}
function setAdmin(on){ state.admin = !!on; $("adminBadge").textContent = on ? "Admin: ON" : "Admin: OFF"; $("adminBadge").className = on ? "badge ok" : "badge"; render(); }
function syncShell(){ document.body.classList.toggle("sidebarCollapsed", state.sidebarCollapsed); }
function dateOnlyFromAny(value){
  if(value === null || typeof value === "undefined" || value === "") return null;
  if(value instanceof Date && !isNaN(value.getTime())) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const raw = String(value).trim();
  if(!raw) return null;
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m){
    const d = new Date(Number(m[1]), Number(m[2])-1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
  }
  const parsed = new Date(raw);
  if(isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}
function daysToDue(due){
  const d = dateOnlyFromAny(due);
  if(!d) return { text:"No due date", cls:"" };
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((d.getTime() - today.getTime())/86400000);
  if(diff < 0) return {text:`Overdue by ${Math.abs(diff)} day${Math.abs(diff)>1?"s":""}`, cls:"bad"};
  if(diff === 0) return {text:"Due today", cls:"warn"};
  if(diff <= 7) return {text:`Due in ${diff} day${diff>1?"s":""}`, cls:"warn"};
  return {text:`Due in ${diff} days`, cls:"ok"};
}
function projectItems(projectId){ return state.items.filter(i=>i.ProjectID===projectId && i.Active!=="N"); }
function projectNotes(projectId){ return state.notes.filter(n=>n.ProjectID===projectId && n.Active!=="N").sort((a,b)=>new Date(b.CreatedAt)-new Date(a.CreatedAt)); }
function itemLogs(itemId){ return state.logs.filter(l=>l.ItemID===itemId).sort((a,b)=>new Date(b.StartedAt||b.CreatedAt||0)-new Date(a.StartedAt||a.CreatedAt||0)); }
function teamName(teamId){ return (state.teams.find(t=>t.TeamID===teamId)||{}).TeamName || "—"; }
function teamLead(teamId){ return (state.teams.find(t=>t.TeamID===teamId)||{}).TeamLead || "—"; }
function currentWeekDates(){ const base = new Date(); const day=base.getDay(); const diff=(day===0?-6:1-day)+(state.logisticsOffsetWeeks*7); base.setDate(base.getDate()+diff); base.setHours(0,0,0,0); return Array.from({length:7},(_,i)=>{const d=new Date(base); d.setDate(base.getDate()+i); return d;}); }
function detail(k,v){ return `<div class="small"><b>${escapeHtml(k)}:</b> ${escapeHtml(v||"—")}</div>`; }
function splitMultiValue(value){
  if(Array.isArray(value)) return value.map(x=>String(x||"").trim()).filter(Boolean);
  return String(value || "")
    .split(/\n|;|\|/g)
    .map(x=>x.trim())
    .filter(Boolean);
}
function bulletListHTML(items){
  const arr = (items || []).map(x=>String(x||"").trim()).filter(Boolean);
  if(!arr.length) return "—";
  return `<ul class="detailBulletList">${arr.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
}
function detailList(k, items){ return `<div class="small detailListRow"><b>${escapeHtml(k)}:</b> ${bulletListHTML(items)}</div>`; }
function cardList(list, fn){ return list.length ? list.map(fn).join("") : `<div class="hint">No records.</div>`; }

function render(){
  syncShell();
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  $(`page-${state.page}`).classList.add("active");
  document.querySelectorAll(".navBtn").forEach(t=>t.classList.toggle("active", t.dataset.page===state.page));
  renderOverview(); renderProjects(); renderBoard(); renderLogistics(); renderSettings(); renderAbout();
  applyFieldTips();
}

function renderOverview(){
  const forDelivery = state.items.filter(i=>["Delivery","Quality Control"].includes(i.ItemStatus) || i.DeliveryStatus==="Logistics Requested");
  const pastDue = state.items.filter(i=>daysToDue(i.ItemDueDate).cls==="bad" && i.ItemStatus!=="Delivery");
  const todayKey = ymd(new Date());
  const todayLogistics = state.logisticsRequests.filter(r=>r.StartDT && ymd(new Date(r.StartDT))===todayKey);
  const ann = state.announcements.filter(a=>a.Active!=="N");
  $("page-overview").innerHTML = `
    <div class="pageTitle"><div><h1>Overview</h1><div class="hint">Daily production and logistics command center.</div></div></div>
    <button class="primary bigAction" id="overviewSubmitLogistics">+ Submit Logistics Request</button>
    <div class="grid4">
      <div class="stat"><span class="small">Active Projects</span><b>${state.projects.filter(p=>p.Active!=="N").length}</b></div>
      <div class="stat"><span class="small">Items for Delivery/QC</span><b>${forDelivery.length}</b></div>
      <div class="stat"><span class="small">Past Due Items</span><b>${pastDue.length}</b></div>
      <div class="stat"><span class="small">Today’s Logistics</span><b>${todayLogistics.length}</b></div>
    </div>
    <div class="grid2" style="margin-top:12px">
      <div class="panel"><h3>Items for Delivery</h3>${cardList(forDelivery.slice(0,8), itemCard)}</div>
      <div class="panel"><h3>Items Past Due Date</h3>${cardList(pastDue.slice(0,8), itemCard)}</div>
      <div class="panel"><h3>Today’s Logistics Schedules</h3>${cardList(todayLogistics.slice(0,8), logisticsCard)}</div>
      <div class="panel"><h3>Announcement Board</h3>${cardList(ann, a=>`<div class="card"><div class="cardTitle">${escapeHtml(a.Title)}</div><div class="small">${escapeHtml(a.Message)}</div><div class="meta"><span>${escapeHtml(a.PostedBy||"")}</span><span>${niceDT(a.CreatedAt)}</span></div></div>`)}</div>
    </div>`;
  $("overviewSubmitLogistics").onclick = () => openLogisticsRequestModal();
}
function itemCard(i){ const p = state.projects.find(x=>x.ProjectID===i.ProjectID)||{}; const due=daysToDue(i.ItemDueDate); return `<div class="card click" data-open-item="${escapeAttr(i.ItemID)}"><div class="tileSO">${escapeHtml(i.SONumber)} • ${escapeHtml(p.ClientName||"")}</div><div class="cardTitle">${escapeHtml(i.ItemDescription)}</div><div class="meta"><span>${escapeHtml(i.ItemStatus)}</span><span class="pill ${due.cls}">${due.text}</span><span>Team: ${escapeHtml(teamName(i.AssignedTeamID))}</span></div></div>`; }
function getPersonByNameOrId(value){
  const raw = String(value || "").trim();
  if(!raw) return null;
  return state.personnel.find(p =>
    String(p.PersonnelID||"") === raw ||
    String(personName(p)||"").trim().toLowerCase() === raw.toLowerCase()
  ) || null;
}
function displayPerson(value){
  const p = getPersonByNameOrId(value);
  return p ? personName(p) : String(value || "").trim();
}
function getVehicleByValue(value){
  const raw = String(value || "").trim();
  if(!raw) return null;
  return state.vehicles.find(v =>
    String(v.VehicleID||"") === raw ||
    String(v.VehicleCode||"") === raw ||
    String(v.VehicleLabel||"").trim().toLowerCase() === raw.toLowerCase()
  ) || null;
}
function displayVehicle(value){
  const v = getVehicleByValue(value);
  if(!v) return String(value || "").trim();
  const label = String(v.VehicleLabel || v.VehicleCode || "").trim();
  const plate = String(v.PlateNo || v.PlateNumber || "").trim();
  return [label, plate].filter(Boolean).join(" - ");
}
function logisticsPrimaryTitle(r){
  const p = r.Payload || {};
  const so = cleanSO(p.SONumber);
  const client = String(p.ClientName || "").trim();
  if(so && client) return `${so} - ${client}`;
  if(so) return so;
  if(client) return client;
  return displayType(r.Type) || "Logistics Request";
}
function logisticsAddressLine(r){
  const p = r.Payload || {};
  return String(p.Address || p.Destination || "").trim();
}
function logisticsCard(r){
  const address = logisticsAddressLine(r);
  const vehicle = displayVehicle(r.VehicleCode);
  const driver = displayPerson(r.DriverCode);
  return `<div class="card logisticsCard compactLogisticsTile" draggable="${state.admin}" data-logreq="${escapeAttr(r.RequestID)}" data-open-logreq="${escapeAttr(r.RequestID)}">
    <div class="logTitle">${escapeHtml(logisticsPrimaryTitle(r))}</div>
    <div class="logType">${escapeHtml(displayType(r.Type))}</div>
    ${address ? `<div class="logLine">📍 ${escapeHtml(address)}</div>` : ""}
    ${vehicle ? `<div class="logLine">🚚 ${escapeHtml(vehicle)}</div>` : ""}
    ${driver ? `<div class="logLine">👤 ${escapeHtml(driver)}</div>` : ""}
  </div>`;
}

function renderProjects(){
  const old = $("projectSearch"); const q = (old && old.value || "").toLowerCase();
  const list = state.projects.filter(p=>p.Active!=="N" && [p.SONumber,p.ClientName,p.ContactNumber,p.Address,p.ProjectSummary,p.OverallStatus,teamName(p.AssignedTeamID),teamLead(p.AssignedTeamID)].join(" ").toLowerCase().includes(q)).sort((a,b)=>new Date(b.CreatedAt||0)-new Date(a.CreatedAt||0));
  $("page-projects").innerHTML = `
    <div class="pageTitle"><div><h1>Projects</h1><div class="hint">SO-level master list. Click a row to open project details.</div></div></div>
    <div class="toolbar">
      <button class="primary" id="btnAddProject" ${state.admin?"":"disabled"}>+ Add New Project</button>
      <input id="projectSearch" placeholder="Search SO#, client, address, item, team..." value="${escapeAttr(q)}" />
    </div>
    <div class="panel"><table><thead><tr><th>SO#</th><th>Client</th><th>Contact</th><th>Address</th><th>Item Description</th><th>Due Date</th><th>Status</th><th>Team</th><th>Days to Due</th></tr></thead><tbody>
      ${list.map(p=>{ const due=daysToDue(p.DueDate); const items=projectItems(p.ProjectID); return `<tr class="click" data-project="${escapeAttr(p.ProjectID)}"><td><b>${escapeHtml(p.SONumber)}</b></td><td>${escapeHtml(p.ClientName)}</td><td>${escapeHtml(p.ContactNumber||"")}</td><td>${escapeHtml(p.Address||"")}</td><td>${escapeHtml(p.ProjectSummary||items.map(i=>i.ItemDescription).join(", "))}<div class="small">${items.length} item${items.length!==1?"s":""}</div></td><td>${niceDate(p.DueDate)}</td><td>${escapeHtml(p.OverallStatus||"")}</td><td>${escapeHtml(teamName(p.AssignedTeamID))}<div class="small">Lead: ${escapeHtml(teamLead(p.AssignedTeamID))}</div></td><td><span class="pill ${due.cls}">${due.text}</span></td></tr>`; }).join("")}
    </tbody></table></div>`;
  $("projectSearch").oninput = renderProjects;
  $("btnAddProject").onclick = () => openProjectForm();
  document.querySelectorAll("[data-project]").forEach(el=>el.onclick=()=>openProjectDetails(el.dataset.project));
}
function openProjectDetails(projectId){
  const p = state.projects.find(x=>x.ProjectID===projectId); if(!p) return;
  state.currentProjectId = projectId;
  const items = projectItems(projectId); const notes = projectNotes(projectId);
  $("projectModalTitle").textContent = `Project Details — ${p.SONumber}`;
  $("projectModalBadge").textContent = state.admin ? "Admin view" : "Staff view";
  $("projectModalBody").innerHTML = `
    <div class="grid2"><div class="panel"><h3>Project Information</h3>
      ${detail("SO#",p.SONumber)}${detail("Client",p.ClientName)}${detail("Contact Number",p.ContactNumber)}${detail("Address",p.Address)}${detail("Due Date",niceDate(p.DueDate))}${detail("Overall Status",p.OverallStatus)}${detail("Team",teamName(p.AssignedTeamID))}${detail("Team Lead",teamLead(p.AssignedTeamID))}
    </div><div class="panel"><div class="line" style="justify-content:space-between"><h3>Items</h3>${state.admin?`<button class="primary" id="btnEditItemsInline">Edit Items</button>`:""}</div>
      <table><thead><tr><th></th><th>Item</th><th>Qty</th><th>Status</th><th>Delivery</th></tr></thead><tbody>${items.map(i=>`<tr><td><input type="checkbox" class="projectItemCheck" value="${escapeAttr(i.ItemID)}" ${["Delivery","Quality Control"].includes(i.ItemStatus)?"":""}/></td><td class="click" data-open-item="${escapeAttr(i.ItemID)}">${escapeHtml(i.ItemDescription)}</td><td>${escapeHtml(i.Quantity)} ${escapeHtml(i.Unit||"")}</td><td>${escapeHtml(i.ItemStatus)}</td><td>${escapeHtml(i.DeliveryStatus||"Not Requested")}</td></tr>`).join("")}</tbody></table>
      <div class="hint">Tick items for partial delivery, then create a logistics request.</div>
    </div></div>
    <div class="panel"><h3>Production Notes</h3>
      <div class="twoCol"><div><label>Your Name / Signature</label><input id="noteSignature" placeholder="e.g. Juan D." /></div><div><label>Note</label><textarea id="noteText" placeholder="Type production update..."></textarea></div></div>
      <div class="line" style="justify-content:flex-end;margin-top:8px"><button class="ok" id="btnAddNote">Add Note</button></div>
      <div style="display:grid;gap:8px;margin-top:12px">${notes.map(n=>`<div class="card"><div class="meta"><b>${escapeHtml(n.Signature)}</b><span>${niceDT(n.CreatedAt)}</span></div><div>${escapeHtml(n.NoteText)}</div></div>`).join("") || `<div class="hint">No notes yet.</div>`}</div>
    </div>`;
  $("projectModalFooter").innerHTML = `<button data-close="projectModal">Close</button>${state.admin ? `<button class="primary" id="btnEditProject">Edit Project</button>` : ``}<button class="primary" id="btnLogisticsFromProject">Create Logistics Request for Selected Items</button>`;
  bindCloseButtons(); $("btnAddNote").onclick = addNote;
  if(state.admin) { $("btnEditProject").onclick = () => openProjectForm(projectId); const b=$("btnEditItemsInline"); if(b) b.onclick=()=>openItemEditor(projectId); }
  $("btnLogisticsFromProject").onclick = () => openLogisticsRequestModal(projectId, getCheckedItemIds());
  document.querySelectorAll("[data-open-item]").forEach(el=>el.onclick=(e)=>{ e.stopPropagation(); openItemDetails(el.dataset.openItem); });
  openModal("projectModal");
}
function getCheckedItemIds(){ return Array.from(document.querySelectorAll(".projectItemCheck:checked")).map(x=>x.value); }
async function addNote(){
  const p = state.projects.find(x=>x.ProjectID===state.currentProjectId); if(!p) return;
  const Signature = $("noteSignature").value.trim(); const NoteText = $("noteText").value.trim();
  if(!Signature || !NoteText) return alert("Signature and note are required.");
  await api("addProjectNote", { ProjectID:p.ProjectID, ItemID:"", SONumber:p.SONumber, Signature, NoteText });
  await load(); openProjectDetails(p.ProjectID);
}

function openProjectForm(projectId){
  if(!state.admin) return alert("Admin mode required.");
  const p = projectId ? state.projects.find(x=>x.ProjectID===projectId) : {};
  state.editingProjectId = projectId || null;
  $("projectFormTitle").textContent = projectId ? "Edit Project" : "Add New Project";
  $("projectFormBody").innerHTML = `
    <div class="twoCol">
      ${inputField("SONumber","SO# / Number only",p.SONumber)}${inputField("ClientName","Client Name",p.ClientName)}${inputField("ContactNumber","Contact Number",p.ContactNumber)}${inputField("Address","Address",p.Address)}${inputField("ProjectSummary","Project Summary",p.ProjectSummary)}${inputField("DueDate","Due Date",p.DueDate,"date")}
      <div><label>Priority</label><select id="fPriority"><option>Normal</option><option>High</option><option>Urgent</option></select></div>
      <div><label>Overall Status</label><input id="fOverallStatus" value="${escapeAttr(p.OverallStatus||"In Production")}" /></div>
      <div><label>Assigned Team</label><select id="fAssignedTeamID"><option value="">None</option>${state.teams.filter(t=>t.Active!=="N").map(t=>`<option value="${escapeAttr(t.TeamID)}" ${p.AssignedTeamID===t.TeamID?"selected":""}>${escapeHtml(t.TeamName)} — Lead: ${escapeHtml(t.TeamLead||"—")}</option>`).join("")}</select><div class="hint">The team lead is taken from the selected team.</div></div>
    </div>
    ${projectId ? `<div class="panel"><div class="line" style="justify-content:space-between"><h3>SO# Items</h3><button class="primary" id="btnOpenItemEditorFromForm">Edit Items</button></div><div class="hint">Use this to add, delete, or correct item records under this SO#.</div></div>` : `<div class="panel"><h3>Initial Items</h3><div class="hint">Enter one item per line. Example: Kitchen Base Cabinet | 1 | set</div><textarea id="fInitialItems" placeholder="Kitchen Base Cabinet | 1 | set\nKitchen Wall Cabinet | 1 | set"></textarea></div>`}`;
  setTimeout(()=>{ if(p.Priority) $("fPriority").value=p.Priority; const b=$("btnOpenItemEditorFromForm"); if(b) b.onclick=()=>openItemEditor(projectId); },0);
  openModal("projectFormModal");
}
function inputField(id,label,value,type="text"){ return `<div><label>${label}</label><input id="f${id}" type="${type}" value="${escapeAttr(value||"")}" /></div>`; }
async function saveProject(){
  if(!state.admin) return alert("Admin mode required.");
  const selectedTeamId = $("fAssignedTeamID").value;
  const project = { SONumber:cleanSO($("fSONumber").value), ClientName:$("fClientName").value.trim(), ContactNumber:$("fContactNumber").value.trim(), Address:$("fAddress").value.trim(), ProjectSummary:$("fProjectSummary").value.trim(), DueDate:$("fDueDate").value, Priority:$("fPriority").value, OverallStatus:$("fOverallStatus").value.trim(), AssignedTeamID:selectedTeamId, AssignedTeamLead:teamLead(selectedTeamId)==="—"?"":teamLead(selectedTeamId), CreatedBy:"Admin" };
  if(!project.SONumber || !project.ClientName) return alert("SO# and Client Name are required.");
  if(state.editingProjectId) await api("updateProject", { pin:localStorage.getItem(ADMIN_PIN_KEY)||"", projectId:state.editingProjectId, project });
  else{
    const rows = ($("fInitialItems").value || "").split("\n").map(x=>x.trim()).filter(Boolean).map(line=>{ const [ItemDescription,Quantity="1",Unit="pc"] = line.split("|").map(x=>x.trim()); return { ItemDescription, Quantity, Unit, ItemStatus:"Design", DeliveryStatus:"Not Requested", AssignedTeamID:project.AssignedTeamID, AssignedPersonnel:project.AssignedTeamLead, ItemDueDate:project.DueDate, Remarks:"" }; });
    await api("createProject", { pin:localStorage.getItem(ADMIN_PIN_KEY)||"", project, items:rows });
  }
  closeModal("projectFormModal"); await load();
}

function openItemEditor(projectId){
  if(!state.admin) return alert("Admin mode required.");
  const p = state.projects.find(x=>x.ProjectID===projectId); if(!p) return;
  const rows = projectItems(projectId);
  $("itemEditorTitle").textContent = `Edit Items — ${p.SONumber}`;
  $("itemEditorBody").innerHTML = `<div class="hint">Add, remove, or correct the item records under this SO#. Deleted rows are deactivated in the database.</div><div id="itemRows" class="itemRows">${rows.map(itemEditorRow).join("")}</div><button class="primary" id="btnAddItemRow">+ Add Item Row</button>`;
  state.itemEditorProjectId = projectId;
  $("btnAddItemRow").onclick=()=> { $("itemRows").insertAdjacentHTML("beforeend", itemEditorRow({ItemID:"", ItemDescription:"", Quantity:"1", Unit:"pc", ItemStatus:"Design", DeliveryStatus:"Not Requested", AssignedTeamID:p.AssignedTeamID, AssignedPersonnel:p.AssignedTeamLead, ItemDueDate:p.DueDate, Remarks:""})); bindItemRowButtons(); };
  bindItemRowButtons(); openModal("itemEditorModal");
}
function itemEditorRow(i){ return `<div class="itemEditRow" data-existing="${escapeAttr(i.ItemID||"")}">
  <input data-k="ItemDescription" placeholder="Item name" value="${escapeAttr(i.ItemDescription||"")}" />
  <input data-k="Quantity" placeholder="Qty" value="${escapeAttr(i.Quantity||"1")}" />
  <input data-k="Unit" placeholder="Unit" value="${escapeAttr(i.Unit||"pc")}" />
  <select data-k="ItemStatus">${PROCESS_COLUMNS.map(c=>`<option ${i.ItemStatus===c?"selected":""}>${escapeHtml(c)}</option>`).join("")}</select>
  <select data-k="DeliveryStatus">${["Not Requested","Logistics Requested","Scheduled","Delivered","Installed","Cancelled"].map(c=>`<option ${i.DeliveryStatus===c?"selected":""}>${escapeHtml(c)}</option>`).join("")}</select>
  <select data-k="AssignedTeamID"><option value="">No team</option>${state.teams.map(t=>`<option value="${escapeAttr(t.TeamID)}" ${i.AssignedTeamID===t.TeamID?"selected":""}>${escapeHtml(t.TeamName)}</option>`).join("")}</select>
  <input data-k="AssignedPersonnel" placeholder="Assigned personnel" value="${escapeAttr(i.AssignedPersonnel||"")}" />
  <input data-k="ItemDueDate" type="date" value="${escapeAttr(i.ItemDueDate||"")}" />
  <button class="danger btnRemoveItemRow" type="button">Remove</button>
</div>`; }
function bindItemRowButtons(){ document.querySelectorAll(".btnRemoveItemRow").forEach(b=>b.onclick=()=>b.closest(".itemEditRow").remove()); }
async function saveProjectItems(){
  if(!state.admin) return alert("Admin mode required.");
  const p = state.projects.find(x=>x.ProjectID===state.itemEditorProjectId); if(!p) return;
  const items = Array.from(document.querySelectorAll(".itemEditRow")).map((row,idx)=>{
    const obj = { ItemID:row.dataset.existing || "", ProjectID:p.ProjectID, SONumber:p.SONumber, SortOrder:String(idx+1), Active:"Y" };
    row.querySelectorAll("[data-k]").forEach(el=>obj[el.dataset.k]=el.value.trim());
    return obj;
  }).filter(x=>x.ItemDescription);
  await api("saveProjectItems", { pin:localStorage.getItem(ADMIN_PIN_KEY)||"", projectId:p.ProjectID, items });
  closeModal("itemEditorModal"); closeModal("projectFormModal"); await load(); openProjectDetails(p.ProjectID);
}

function renderBoard(){
  $("page-board").innerHTML = `
    <div class="pageTitle"><div><h1>Production Board</h1><div class="hint">Item-level Kanban. ${state.admin ? "Admin can drag/drop and edit movements." : "Staff view is read-only."}</div></div></div>
    ${state.admin ? "" : `<div class="panel readonlyNote"><span class="badge warn">Read-only Staff View</span> Drag-and-drop is disabled. Click a tile to see details.</div>`}
    <div class="panel kanbanWrap"><div class="kanban compactKanban">${PROCESS_COLUMNS.map(col=>renderKanbanCol(col)).join("")}</div></div>`;
  bindKanbanDnD(); document.querySelectorAll("[data-open-item]").forEach(el=>el.onclick=(e)=>{ if(e.detail>0) openItemDetails(el.dataset.openItem); });
}
function renderKanbanCol(col){ const items = state.items.filter(i=>i.Active!=="N" && i.ItemStatus===col); return `<div class="kanbanCol"><div class="kanbanHead"><span>${escapeHtml(col)}</span><span class="badge">${items.length}</span></div><div class="kanbanBody" data-status="${escapeAttr(col)}">${items.map(tileHTML).join("") || `<div class="hint">No items.</div>`}</div></div>`; }
function tileHTML(i){ const p=state.projects.find(x=>x.ProjectID===i.ProjectID)||{}; return `<div class="tile smallTile" draggable="${state.admin}" data-item="${escapeAttr(i.ItemID)}" data-open-item="${escapeAttr(i.ItemID)}"><div class="tileSO">${escapeHtml(i.SONumber)}</div><div class="tileItem">${escapeHtml(i.ItemDescription)}</div><div class="tileClient">${escapeHtml(p.ClientName||"")}</div><div class="tileTeam">${escapeHtml(teamName(i.AssignedTeamID))}</div></div>`; }
function bindKanbanDnD(){
  if(!state.admin) return;
  document.querySelectorAll(".tile").forEach(t=>{ t.addEventListener("dragstart", e=>{ e.dataTransfer.setData("text/plain", t.dataset.item); }); });
  document.querySelectorAll(".kanbanBody").forEach(zone=>{
    zone.addEventListener("dragover", e=>{ e.preventDefault(); zone.classList.add("dragOver"); });
    zone.addEventListener("dragleave", ()=>zone.classList.remove("dragOver"));
    zone.addEventListener("drop", e=>{ e.preventDefault(); zone.classList.remove("dragOver"); const itemId=e.dataTransfer.getData("text/plain"); const toStatus=zone.dataset.status; openMoveModal(itemId,toStatus); });
  });
}
function openItemDetails(itemId){
  const item=state.items.find(i=>i.ItemID===itemId); if(!item) return;
  const p=state.projects.find(x=>x.ProjectID===item.ProjectID)||{}; const logs=itemLogs(itemId);
  $("itemDetailTitle").textContent = `${item.SONumber} — ${item.ItemDescription}`;
  $("itemDetailBody").innerHTML = `<div class="grid2"><div class="panel"><h3>Item Details</h3>${detail("SO#", item.SONumber)}${detail("Client", p.ClientName)}${detail("Item", item.ItemDescription)}${detail("Quantity", `${item.Quantity || ""} ${item.Unit || ""}`)}${detail("Current Process", item.ItemStatus)}${detail("Team", teamName(item.AssignedTeamID))}${detail("Personnel Assigned", item.AssignedPersonnel)}${detail("Delivery Status", item.DeliveryStatus)}${detail("Due Date", niceDate(item.ItemDueDate))}</div><div class="panel"><h3>Production Logs</h3>${logs.map(log=>`<div class="card"><div class="cardTitle">${escapeHtml(log.ToStatus)}</div><div class="small">Personnel: ${escapeHtml(log.AssignedPersonnel||"—")}</div><div class="small">Started: ${niceDT(log.StartedAt)}<br>Finished: ${niceDT(log.FinishedAt)}</div><div class="small">Moved by: ${escapeHtml(log.MovedBy||"—")}</div>${log.Remarks?`<div class="small">Remarks: ${escapeHtml(log.Remarks)}</div>`:""}${state.admin?`<button class="primary" disabled title="Planned after backend deployment">Edit Log</button>`:""}</div>`).join("") || `<div class="hint">No logs yet.</div>`}</div></div>`;
  openModal("itemDetailModal");
}
function openMoveModal(itemId,toStatus){
  const item=state.items.find(i=>i.ItemID===itemId); if(!item || item.ItemStatus===toStatus) return;
  state.pendingMove={itemId,toStatus};
  $("moveModalBody").innerHTML = `<div class="panel"><div class="cardTitle">${escapeHtml(item.SONumber)} — ${escapeHtml(item.ItemDescription)}</div><div class="small">From: <b>${escapeHtml(item.ItemStatus||"Blank")}</b> → To: <b>${escapeHtml(toStatus)}</b></div></div><div><label>Personnel Assigned for this task/process</label><input id="movePersonnel" placeholder="Name of assigned personnel" /></div><div><label>Remarks</label><textarea id="moveRemarks" placeholder="Optional remarks"></textarea></div><div class="hint">Saving this will finish the previous process log and start the new process log with timestamps.</div>`;
  openModal("moveModal");
}
async function confirmMove(){
  if(!state.pendingMove) return;
  const assignedPersonnel=$("movePersonnel").value.trim(); if(!assignedPersonnel) return alert("Assigned personnel is required.");
  await api("moveProductionItem", { pin:localStorage.getItem(ADMIN_PIN_KEY)||"", itemId:state.pendingMove.itemId, toStatus:state.pendingMove.toStatus, assignedPersonnel, remarks:$("moveRemarks").value.trim(), movedBy:"Admin" });
  state.pendingMove=null; closeModal("moveModal"); await load();
}

function renderLogistics(){
  const dates=currentWeekDates();
  const pending=state.logisticsRequests.filter(r=>r.Status==="PENDING");
  const scheduled=state.logisticsRequests.filter(r=>r.Status!=="PENDING");
  const deliveryItems = itemsForDeliveryList();
  $("page-logistics").innerHTML = `
    <div class="pageTitle"><div><h1>Logistics</h1><div class="hint">Native logistics module. Staff can submit and view requests. Admin can schedule or reschedule by drag/drop.</div></div><button class="primary" id="btnSubmitLogisticsTop">+ Submit Logistics Request</button></div>
    <div class="split"><div class="panel"><h3>Pending Requests</h3><div class="hint">${state.admin ? "Drag pending cards into a calendar day to schedule. Click any card to view details." : "Read-only: pending requests awaiting approval/scheduling. Click any card to view details."}</div><div class="pendingList" style="margin-top:10px">${pending.map(pendingLogisticsCard).join("") || `<div class="hint">No pending requests.</div>`}</div></div>
      <div class="panel"><div class="line" style="justify-content:space-between"><h3>1-Week Rolling Calendar</h3><div class="line"><button id="logPrev">← Previous Week</button><button class="primary" id="logCurrent">Current Week</button><button id="logNext">Next Week →</button></div></div><div class="hint">${state.admin ? "Drag scheduled cards to a different day to reschedule." : "Read-only weekly logistics calendar."}</div><div class="calendarGrid">${dates.map(d=>logisticsDayBox(d,scheduled)).join("")}</div></div></div>
    <div class="panel" style="margin-top:12px"><div class="line" style="justify-content:space-between"><div><h3>Dispatch & Gate Pass</h3><div class="hint">View confirmed dispatches for the selected week and print gate passes.</div></div><div class="line"><button class="primary" id="btnOpenDispatchView">Open Dispatch View</button><button class="ok" id="btnPrintGatePasses">Generate Gate Pass</button></div></div></div>
    <div class="panel" style="margin-top:12px">
      <div class="line" style="justify-content:space-between;align-items:flex-start">
        <div><h3>Items for Delivery</h3><div class="hint">Click an item to open the same Project Details popup used in the Projects tab.</div></div>
        <span class="badge">${deliveryItems.length} item${deliveryItems.length===1?"":"s"}</span>
      </div>
      <div class="deliveryItemList" style="margin-top:10px">${deliveryItems.map(deliveryItemLogisticsCard).join("") || `<div class="hint">No items currently marked for delivery.</div>`}</div>
    </div>`;
  $("btnSubmitLogisticsTop").onclick=()=>openLogisticsRequestModal();
  $("logPrev").onclick=()=>{state.logisticsOffsetWeeks--;renderLogistics();};
  $("logCurrent").onclick=()=>{state.logisticsOffsetWeeks=0;renderLogistics();};
  $("logNext").onclick=()=>{state.logisticsOffsetWeeks++;renderLogistics();};
  bindLogisticsDnD();
  bindLogisticsDetailOpeners();
  bindDeliveryItemProjectOpeners();
  if($("btnOpenDispatchView")) $("btnOpenDispatchView").onclick=(e)=>runAction(e,"Preparing dispatch view...", async()=>openDispatchView());
  if($("btnPrintGatePasses")) $("btnPrintGatePasses").onclick=(e)=>runAction(e,"Preparing gate passes...", async()=>printGatePassesForCurrentWeek());
}
function itemsForDeliveryList(){
  const readyStatuses = ["Delivery", "Quality Control"];
  const deliveryStatuses = ["Logistics Requested", "Scheduled", "Delivered", "Installed"];
  return state.items
    .filter(i=>i.Active!=="N" && (readyStatuses.includes(i.ItemStatus) || deliveryStatuses.includes(i.DeliveryStatus)))
    .sort((a,b)=>{
      const ap = state.projects.find(p=>p.ProjectID===a.ProjectID)||{};
      const bp = state.projects.find(p=>p.ProjectID===b.ProjectID)||{};
      return String(a.DeliveryStatus||"").localeCompare(String(b.DeliveryStatus||"")) || new Date(ap.DueDate||a.ItemDueDate||0) - new Date(bp.DueDate||b.ItemDueDate||0);
    });
}
function deliveryItemLogisticsCard(i){
  const p = state.projects.find(x=>x.ProjectID===i.ProjectID)||{};
  const due = daysToDue(i.ItemDueDate || p.DueDate);
  return `<div class="card click deliveryItemCard" data-open-delivery-project="${escapeAttr(i.ProjectID)}">
    <div class="tileSO">${escapeHtml(i.SONumber)} • ${escapeHtml(p.ClientName||"")}</div>
    <div class="cardTitle">${escapeHtml(i.ItemDescription)}</div>
    <div class="meta"><span>${escapeHtml(i.ItemStatus||"—")}</span><span>${escapeHtml(i.DeliveryStatus||"Not Requested")}</span><span class="pill ${due.cls}">${due.text}</span><span>Team: ${escapeHtml(teamName(i.AssignedTeamID))}</span></div>
  </div>`;
}
function bindDeliveryItemProjectOpeners(){
  document.querySelectorAll("[data-open-delivery-project]").forEach(el=>{
    el.addEventListener("click", ()=>openProjectFromLogistics(el.dataset.openDeliveryProject));
  });
}
function openProjectFromLogistics(projectId){
  state.page = "projects";
  render();
  openProjectDetails(projectId);
}
function pendingLogisticsCard(r){ return logisticsCard(r); }
function logisticsDayBox(d,list){ const key=ymd(d); const today=key===ymd(new Date()); const items=list.filter(r=>r.StartDT && ymd(new Date(r.StartDT))===key); return `<div class="dayBox ${today?"today":""}"><div class="dayHead2">${d.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"})}${today?" • Today":""}</div><div class="dayBody2" data-logday="${key}">${items.map(logisticsCard).join("") || `<div class="small">No schedules.</div>`}</div></div>`; }
function displayType(type){ return type === "Travel" || type === "Client Call" ? "Client Call" : (type || ""); }
function bindLogisticsDnD(){
  if(!state.admin) return;
  document.querySelectorAll("[data-logreq]").forEach(c=>c.addEventListener("dragstart",e=>{
    e.dataTransfer.setData("text/logreq",c.dataset.logreq);
  }));
  document.querySelectorAll("[data-logday]").forEach(z=>{
    z.addEventListener("dragover",e=>{e.preventDefault();z.classList.add("dragOver")});
    z.addEventListener("dragleave",()=>z.classList.remove("dragOver"));
    z.addEventListener("drop",e=>{
      e.preventDefault(); z.classList.remove("dragOver");
      const requestId=e.dataTransfer.getData("text/logreq");
      if(requestId) openScheduleModal(requestId,z.dataset.logday);
    });
  });
}
function bindLogisticsDetailOpeners(){
  document.querySelectorAll("[data-open-logreq]").forEach(el=>{
    el.addEventListener("click", e=>{
      if(e.target && e.target.closest && e.target.closest("input,button,select,textarea")) return;
      openLogisticsDetailModal(el.dataset.openLogreq);
    });
  });
}
function driverOptions(selected=""){
  const sel = String(selected || "");
  return `<option value="">Select driver</option>` + driverPeople().map(p=>{
    const val = p.PersonnelID || personName(p);
    const selectedAttr = [p.PersonnelID, personName(p)].map(String).includes(sel) ? "selected" : "";
    return `<option value="${escapeAttr(val)}" ${selectedAttr}>${escapeHtml(personName(p))}</option>`;
  }).join("");
}
function vehicleOptions(selected=""){
  const sel = String(selected || "");
  return `<option value="">Select vehicle</option>` + state.vehicles.map(v=>{
    const val = v.VehicleID || v.VehicleCode;
    const selectedAttr = [v.VehicleID, v.VehicleCode, v.VehicleLabel].map(String).includes(sel) ? "selected" : "";
    return `<option value="${escapeAttr(val)}" ${selectedAttr}>${escapeHtml(displayVehicle(val))}</option>`;
  }).join("");
}
function personnelName(id){ const p=state.personnel.find(x=>x.PersonnelID===id); return p ? (p.PersonnelName || p.FullName || p.Name || "") : ""; }
function selectedPassengerNames(){
  return Array.from(document.querySelectorAll(".schedPassenger:checked")).map(x=>x.dataset.name || x.value).filter(Boolean);
}
function selectedPassengerIds(){
  return Array.from(document.querySelectorAll(".schedPassenger:checked")).map(x=>x.value).filter(Boolean);
}
function passengerPicker(selectedNames=[]){
  const selectedSet=new Set((selectedNames||[]).map(String));
  const groups = groupByDepartment(activePersonnelSorted());
  if(!groups.length) return `<div class="hint">No active personnel records yet.</div>`;
  return `<div class="personnelDeptPicker">${groups.map((g,idx)=>`
    <details class="deptPickGroup">
      <summary>${escapeHtml(g.dept)} <span class="badge">${g.items.length}</span></summary>
      <div class="personnelPicker compactDeptPicker">
        ${g.items.map(p=>{ const checked=selectedSet.has(personName(p)) || selectedSet.has(p.PersonnelID); return `<label class="personnelPick"><input type="checkbox" class="schedPassenger" value="${escapeAttr(p.PersonnelID)}" data-name="${escapeAttr(personName(p))}" ${checked?"checked":""}/> <span>${escapeHtml(personName(p))} <span class="small">${escapeHtml(p.Role||"")}</span></span></label>`; }).join("")}
      </div>
    </details>`).join("")}</div>`;
}
function normalizePassengers(payload){
  const raw = payload && (payload.Passengers || payload.Installers || payload.Personnel || payload.PassengerIDs || "");
  const resolve = x => {
    if(x && typeof x === "object") return x.PersonnelName || x.InstallerName || x.name || x.Name || displayPerson(x.PersonnelID || x.InstallerCode || "");
    return displayPerson(String(x || ""));
  };
  if(Array.isArray(raw)) return raw.map(resolve).filter(Boolean);
  return String(raw||"").split(",").map(x=>displayPerson(x.trim())).filter(Boolean);
}
function openScheduleModal(requestId,date){
  const r=state.logisticsRequests.find(x=>x.RequestID===requestId); if(!r)return;
  state.pendingScheduleId=requestId;
  const scheduled = r.Status !== "PENDING";
  const currentDate = date || (r.StartDT ? ymd(new Date(r.StartDT)) : ymd(new Date()));
  const currentTime = r.StartDT ? new Date(r.StartDT).toTimeString().slice(0,5) : "08:00";
  const passengers = normalizePassengers(r.Payload||{}).concat(((r.Payload||{}).PassengerIDs||[]));
  $("logisticsScheduleBody").innerHTML=`<div class="panel">${logisticsCard(r)}<div class="hint" style="margin-top:6px">${scheduled ? "You are rescheduling an existing confirmed request." : "You are scheduling a pending request."}</div></div><div class="twoCol"><div><label>Date</label><input id="schedDate" type="date" value="${currentDate}" /></div><div><label>Time</label><input id="schedTime" type="time" value="${currentTime}" /></div><div><label>Driver</label><select id="schedDriver">${driverOptions(r.DriverCode||"")}</select></div><div><label>Vehicle</label><select id="schedVehicle">${vehicleOptions(r.VehicleCode||"")}</select></div></div><div><label>Passengers / Personnel / Installers</label><div class="hint">Select from the Personnel database.</div>${passengerPicker(passengers)}</div><div><label>Remarks</label><textarea id="schedRemarks">${escapeHtml((r.Payload||{}).Notes||"")}</textarea></div>`;
  openModal("logisticsScheduleModal");
}
async function confirmSchedule(){
  const r=state.logisticsRequests.find(x=>x.RequestID===state.pendingScheduleId); if(!r)return;
  const start=new Date(`${$("schedDate").value}T${$("schedTime").value}:00`); const end=new Date(start.getTime()+4*3600000);
  const passengerNames=selectedPassengerNames();
  const passengerIds=selectedPassengerIds();
  const updates={Status:"CONFIRMED",StartDT:start.toISOString(),EndDT:end.toISOString(),DriverCode:$("schedDriver").value.trim(),VehicleCode:$("schedVehicle").value.trim(),Payload:{...(r.Payload||{}),Passengers:passengerNames,PassengerIDs:passengerIds,Installers:passengerNames,Notes:$("schedRemarks").value.trim()}};
  await api("scheduleLogisticsRequest", { pin: localStorage.getItem(ADMIN_PIN_KEY)||"", requestId:r.RequestID, updates });
  closeModal("logisticsScheduleModal"); await load();
}
async function returnLogisticsRequestToPending(requestId){
  if(!state.admin) return alert("Admin mode is required.");
  if(!confirm("Return this logistics request to PENDING? Driver, vehicle, and passenger assignments will be cleared.")) return;
  try{
    await api("returnLogisticsRequestPending", { pin: localStorage.getItem(ADMIN_PIN_KEY)||"", requestId });
    closeModal("logisticsDetailModal"); await load();
  }catch(e){ alert("Failed to return request to pending: " + (e.message||e)); }
}
async function cancelLogisticsRequest(requestId){
  if(!state.admin) return alert("Admin mode is required.");
  const note = prompt("Cancellation note/reason:", "Cancelled by admin");
  if(note === null) return;
  if(!confirm("Cancel this logistics request?")) return;
  try{
    const existing = state.logisticsRequests.find(x=>x.RequestID===requestId) || {};
    const payload = {...(existing.Payload||{}), CancelNote:note};
    await api("cancelLogisticsRequest", { pin: localStorage.getItem(ADMIN_PIN_KEY)||"", requestId, note });
    closeModal("logisticsDetailModal"); await load();
  }catch(e){ alert("Failed to cancel request: " + (e.message||e)); }
}
async function deleteLogisticsRequest(requestId){
  if(!state.admin) return alert("Admin mode is required.");
  if(!confirm("Delete this logistics request permanently from this dashboard? This is stronger than cancelling.")) return;
  if(!confirm("Please confirm again. Deleted requests cannot be restored from the app.")) return;
  try{
    await api("deleteLogisticsRequest", { pin: localStorage.getItem(ADMIN_PIN_KEY)||"", requestId });
    closeModal("logisticsDetailModal"); await load();
  }catch(e){ alert("Failed to delete request: " + (e.message||e)); }
}
function openLogisticsDetailModal(requestId){
  const r=state.logisticsRequests.find(x=>x.RequestID===requestId); if(!r) return;
  const p=r.Payload||{};
  $("logisticsDetailStatus").textContent = r.Status || "";
  $("logisticsDetailTitle").textContent = logisticsPrimaryTitle(r);
  const passengers = normalizePassengers(p);
  const itemList = splitMultiValue(p.Items);
  const scheduleHtml = `<div class="requestDetailBox"><h3>Schedule</h3>${detail("Date", r.StartDT ? new Date(r.StartDT).toLocaleDateString() : "—")}${detail("Time", r.StartDT && r.EndDT ? `${new Date(r.StartDT).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})}–${new Date(r.EndDT).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"})}` : "—")}${detail("Driver", displayPerson(r.DriverCode) || "—")}${detail("Vehicle", displayVehicle(r.VehicleCode) || "—")}${detailList("Passengers / Installers", passengers)}${detail("Trip", r.TripStatus || "READY")}</div>`;
  const requestHtml = `<div class="requestDetailBox"><h3>Request</h3>${detail("Type", displayType(r.Type))}${detail("Status", r.Status)}${detail("Requested By", r.RequestedBy)}${detail("SO#", cleanSO(p.SONumber)||"—")}${detail("Client", p.ClientName||"—")}${detail("Contact", p.ContactNumber||"—")}${detail("Address/Destination", p.Address||p.Destination||"—")}${detail("Area", p.AreaClass||"—")}${detailList("Items", itemList)}${detail("Purpose", p.Purpose||"—")}${detail("Required Vehicle", p.RequiredVehicle||"—")}${detail("Notes", p.Notes||"—")}</div>`;
  $("logisticsDetailBody").innerHTML = `<div class="detailGrid">${requestHtml}${scheduleHtml}</div>`;
  $("logisticsDetailFooter").innerHTML = `<button data-close="logisticsDetailModal">Close</button>${state.admin?`<button class="primary" id="btnEditLogisticsFromDetail">Edit / Reschedule</button><button id="btnReturnLogisticsPending">Return to Pending</button><button class="danger" id="btnCancelLogisticsRequest">Cancel Request</button><button class="danger" id="btnDeleteLogisticsRequest">Delete Request</button>`:""}`;
  bindCloseButtons();
  if(state.admin && $("btnEditLogisticsFromDetail")) $("btnEditLogisticsFromDetail").onclick=()=>{ closeModal("logisticsDetailModal"); openScheduleModal(requestId, r.StartDT ? ymd(new Date(r.StartDT)) : ymd(new Date())); };
  if(state.admin && $("btnReturnLogisticsPending")) $("btnReturnLogisticsPending").onclick=()=>returnLogisticsRequestToPending(requestId);
  if(state.admin && $("btnCancelLogisticsRequest")) $("btnCancelLogisticsRequest").onclick=()=>cancelLogisticsRequest(requestId);
  if(state.admin && $("btnDeleteLogisticsRequest")) $("btnDeleteLogisticsRequest").onclick=()=>deleteLogisticsRequest(requestId);
  openModal("logisticsDetailModal");
}
function openLogisticsRequestModal(projectId="", selectedItemIds=[]){
  const p = projectId ? state.projects.find(x=>x.ProjectID===projectId) : null;
  const selected = p ? projectItems(p.ProjectID).filter(i=> selectedItemIds.length ? selectedItemIds.includes(i.ItemID) : ["Delivery","Quality Control"].includes(i.ItemStatus)) : [];
  $("logisticsRequestBody").innerHTML = `<div class="twoCol"><div><label>Request Type</label><select id="lrType">${REQUEST_TYPES.map(t=>`<option>${t}</option>`).join("")}</select></div><div><label>Requestor Name</label><input id="lrRequestedBy" value="Production" /></div><div><label>Date</label><input id="lrDate" type="date" value="${ymd(new Date())}" /></div><div><label>Time</label><input id="lrTime" type="time" value="08:00" /></div></div><div id="lrTypeFields"></div>`;
  setLogisticsTypeFields(p, selected); $("lrType").onchange=()=>setLogisticsTypeFields(p, selected); openModal("logisticsRequestModal");
}
function setLogisticsTypeFields(project=null, selectedItems=[]){
  const type=$("lrType").value; const wrap=$("lrTypeFields");
  if(type==="Delivery"){
    wrap.innerHTML=`<div class="twoCol"><div><label>SO# / Number only</label><input id="lrSO" value="${escapeAttr(project?.SONumber||"")}" /></div><div><label>Client Name</label><input id="lrClient" value="${escapeAttr(project?.ClientName||"")}" /></div><div><label>Contact Number</label><input id="lrContact" value="${escapeAttr(project?.ContactNumber||"")}" /></div><div><label>Delivery Address</label><input id="lrAddress" value="${escapeAttr(project?.Address||"")}" /></div><div><label>Area</label><select id="lrArea"><option value="NON_NCR">Non-NCR</option><option value="NCR">NCR</option></select></div></div>${selectedItems.length?`<div class="panel"><h3>Selected Items</h3>${selectedItems.map(i=>`<label class="checkLine"><input type="checkbox" class="lrSelectedItem" value="${escapeAttr(i.ItemID)}" checked /> ${escapeHtml(i.ItemDescription)} <span class="small">(${escapeHtml(i.Quantity)} ${escapeHtml(i.Unit||"")})</span></label>`).join("")}</div>`:""}<div><label>Items to Deliver</label><textarea id="lrItems">${escapeHtml(selectedItems.map(i=>i.ItemDescription).join("\n"))}</textarea></div><div><label>Special Instructions</label><textarea id="lrNotes"></textarea></div>`;
  } else if(type==="Client Call"){
    wrap.innerHTML=`<div class="twoCol"><div><label>Client Name</label><input id="lrClient" value="${escapeAttr(project?.ClientName||"")}" /></div><div><label>Destination</label><input id="lrDestination" value="${escapeAttr(project?.Address||"")}" /></div><div><label>Area</label><select id="lrArea"><option value="NON_NCR">Non-NCR</option><option value="NCR">NCR</option></select></div></div><div><label>Special Instructions</label><textarea id="lrNotes"></textarea></div>`;
  } else {
    wrap.innerHTML=`<div class="twoCol"><div><label>Client Name (optional)</label><input id="lrClient" value="${escapeAttr(project?.ClientName||"")}" /></div><div><label>Destination</label><input id="lrDestination" value="${escapeAttr(project?.Address||"")}" /></div><div><label>Area</label><select id="lrArea"><option value="NON_NCR">Non-NCR</option><option value="NCR">NCR</option></select></div><div><label>Purpose</label><select id="lrPurpose"><option>Purchasing</option><option>Item Pick-up</option><option>Installation / Servicing</option></select></div><div><label>Required Vehicle</label><select id="lrVehicleReq"><option>Car</option><option>Pick-Up</option><option>Van</option><option>Truck</option><option>Others</option></select></div></div><div><label>Special Instructions</label><textarea id="lrNotes"></textarea></div>`;
  }
}
function val(id){ const el=$(id); return el ? el.value.trim() : ""; }
async function submitLogisticsRequest(){
  const type=$("lrType").value; const date=val("lrDate"), time=val("lrTime"); const start=new Date(`${date}T${time}:00`), end=new Date(start.getTime()+4*3600000);
  let payload={};
  if(type==="Delivery") payload={ SONumber:cleanSO(val("lrSO")), ClientName:val("lrClient"), ContactNumber:val("lrContact"), Address:val("lrAddress"), Items:val("lrItems"), Notes:val("lrNotes"), AreaClass:val("lrArea")||"NON_NCR" };
  else if(type==="Client Call") payload={ ClientName:val("lrClient"), Destination:val("lrDestination"), Notes:val("lrNotes"), AreaClass:val("lrArea")||"NON_NCR" };
  else payload={ ClientName:val("lrClient"), Destination:val("lrDestination"), Purpose:val("lrPurpose"), RequiredVehicle:val("lrVehicleReq"), Notes:val("lrNotes"), AreaClass:val("lrArea")||"NON_NCR" };
  const request={ Type:type, Status:"PENDING", RequestedBy:val("lrRequestedBy"), ViberUserID:"PRODUCTION-DASHBOARD", StartDT:start.toISOString(), EndDT:end.toISOString(), Payload:payload, TripStatus:"READY", DriverCode:"", VehicleCode:"" };
  if(!request.RequestedBy || !date || !time) return alert("Requestor, date, and time are required.");
  if(type==="Delivery" && (!payload.SONumber || !payload.ClientName || !payload.Address || !payload.Items)) return alert("For Delivery, SO#, client, address, and items are required.");
  if(type==="Client Call" && (!payload.ClientName || !payload.Destination)) return alert("For Client Call, client and destination are required.");
  if(type==="Service" && (!payload.Destination || !payload.Purpose || !payload.RequiredVehicle)) return alert("For Service, destination, purpose, and required vehicle are required.");
  try{
    const res = await api("submitLogisticsRequest", { request });
    closeModal("logisticsRequestModal");
    await load({silent:true});
    alert("Logistics request submitted as PENDING.");
  }catch(e){ alert("Failed to submit logistics request: "+(e.message||e)); }
}


function currentWeekConfirmedRequests(){
  const dates=currentWeekDates();
  const start=dates[0]; const end=new Date(dates[6]); end.setDate(end.getDate()+1);
  return state.logisticsRequests.filter(r=>String(r.Status||"").toUpperCase()==="CONFIRMED" && r.StartDT && new Date(r.StartDT)>=start && new Date(r.StartDT)<end).sort((a,b)=>new Date(a.StartDT)-new Date(b.StartDT));
}
function openDispatchView(){
  const confirmed=currentWeekConfirmedRequests();
  const groups={};
  confirmed.forEach(r=>{
    const k=`${ymd(new Date(r.StartDT))}||${r.DriverCode||"Unassigned"}||${r.VehicleCode||"Unassigned"}`;
    (groups[k] ||= []).push(r);
  });
  const html = Object.entries(groups).map(([k,list])=>{
    const [date,driver,vehicle]=k.split("||");
    return `<div class="requestDetailBox"><h3>${escapeHtml(new Date(date+"T00:00:00").toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"}))}</h3><div class="small"><b>Driver:</b> ${escapeHtml(displayPerson(driver)||"—")} &nbsp; <b>Vehicle:</b> ${escapeHtml(displayVehicle(vehicle)||"—")}</div><div style="display:grid;gap:8px;margin-top:8px">${list.map(r=>logisticsCard(r)).join("")}</div></div>`;
  }).join("") || `<div class="hint">No confirmed dispatches for this week.</div>`;
  $("logisticsDetailTitle").textContent="Dispatch View";
  $("logisticsDetailStatus").textContent=`${confirmed.length} confirmed`;
  $("logisticsDetailBody").innerHTML=html;
  $("logisticsDetailFooter").innerHTML=`<button data-close="logisticsDetailModal">Close</button><button class="ok" id="btnPrintDispatchGatePasses">Print Gate Passes</button>`;
  bindCloseButtons();
  $("btnPrintDispatchGatePasses").onclick=(e)=>runAction(e,"Preparing gate passes...",async()=>printGatePassesForCurrentWeek());
  bindLogisticsDetailOpeners();
  openModal("logisticsDetailModal");
}
function gatePassSlipHTML(r){
  const p=r.Payload||{};
  const passengers=normalizePassengers(p).join(", ") || "—";
  const date=r.StartDT ? new Date(r.StartDT).toLocaleDateString() : "";
  const time=r.StartDT ? new Date(r.StartDT).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"}) : "";
  return `<section class="gpSlip"><h2>SJTC MANUFACTURING INC.</h2><h3>GATE PASS</h3><p><b>Date:</b> ${escapeHtml(date)} &nbsp; <b>Time:</b> ${escapeHtml(time)}</p><p><b>Vehicle:</b> ${escapeHtml(displayVehicle(r.VehicleCode)||"—")} &nbsp; <b>Driver:</b> ${escapeHtml(displayPerson(r.DriverCode)||"—")}</p><p><b>SO#:</b> ${escapeHtml(cleanSO(p.SONumber)||"—")} &nbsp; <b>Client:</b> ${escapeHtml(p.ClientName||"—")}</p><p><b>Itinerary:</b> ${escapeHtml(p.Address||p.Destination||"—")}</p><p><b>Items/Purpose:</b> ${escapeHtml(p.Items||p.Purpose||displayType(r.Type)||"—")}</p><p><b>Passengers/Personnel:</b> ${escapeHtml(passengers)}</p><p><b>Remarks:</b> ${escapeHtml(p.Notes||"—")}</p><div class="gpSign"><span>Requested by: ${escapeHtml(r.RequestedBy||"")}</span><span>Approved by: __________________</span></div></section>`;
}
function printGatePassesForCurrentWeek(){
  const list=currentWeekConfirmedRequests();
  if(!list.length){ alert("No confirmed dispatches for the selected week."); return; }
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>Gate Passes</title><style>@page{size:Letter;margin:.35in}body{font-family:Arial,sans-serif;color:#111}.sheet{display:grid;grid-template-columns:1fr 1fr;gap:12px}.gpSlip{border:1px solid #333;border-radius:10px;padding:10px;min-height:3.1in;break-inside:avoid}.gpSlip h2,.gpSlip h3{text-align:center;margin:2px 0}.gpSlip h2{font-size:13px}.gpSlip h3{font-size:12px}.gpSlip p{font-size:11px;line-height:1.25;margin:6px 0}.gpSign{display:flex;justify-content:space-between;gap:10px;margin-top:18px;font-size:11px}</style></head><body><div class="sheet">${list.map(gatePassSlipHTML).join("")}</div><script>window.onload=()=>window.print();<\/script></body></html>`;
  const w=window.open("","_blank");
  if(!w){ alert("Pop-up blocked. Please allow pop-ups to print gate passes."); return; }
  w.document.open(); w.document.write(html); w.document.close();
}

function yesNo(v){ return String(v || "N").toUpperCase()==="Y" ? "Y" : "N"; }
function personName(p){ return p ? (p.PersonnelName || p.FullName || p.Name || p.DriverName || p.PassengerName || "") : ""; }
function personRole(p){ return p ? (p.Role || "Personnel") : "Personnel"; }
function personDept(p){ return p ? (p.Department || "—") : "—"; }
function personnelLabel(p){ const name=personName(p); const role=personRole(p); return `${name || "Unnamed"}${role ? " — " + role : ""}`; }
function canDrivePersonnel(p){
  const role = String(personRole(p)).toLowerCase();
  return yesNo(p.CanDrive)==="Y" || role.includes("driver") || state.drivers.some(d=>String(d.PersonnelID||"")===String(p.PersonnelID||""));
}
function driverPeople(){ return state.personnel.filter(p=>p.Active!=="N" && canDrivePersonnel(p)); }
function activePersonnelSorted(){
  return state.personnel
    .filter(p=>String(p.Active||"Y").toUpperCase()!=="N")
    .slice()
    .sort((a,b)=>String(personDept(a)).localeCompare(String(personDept(b))) || String(personName(a)).localeCompare(String(personName(b))));
}
function groupByDepartment(list){
  const groups = {};
  (list||[]).forEach(p=>{ const dept = String(personDept(p)||"Unassigned").trim() || "Unassigned"; (groups[dept] ||= []).push(p); });
  return Object.keys(groups).sort().map(dept=>({dept, items:groups[dept].sort((a,b)=>String(personName(a)).localeCompare(String(personName(b))))}));
}
function departmentGroupedRows(list, rowBuilder, emptyText="No records yet."){
  const groups = groupByDepartment(list);
  if(!groups.length) return `<div class="hint">${escapeHtml(emptyText)}</div>`;
  return `<div class="deptGroupedList">${groups.map(g=>`<div class="deptGroup"><div class="deptHeader">${escapeHtml(g.dept)} <span>${g.items.length}</span></div>${settingsList(g.items.map(rowBuilder))}</div>`).join("")}</div>`;
}
function settingValue(key, fallback=""){ return state.settings && Object.prototype.hasOwnProperty.call(state.settings,key) ? state.settings[key] : fallback; }
function collapsible(title, body, opts={}){
  const open = opts.open ? " open" : "";
  const count = opts.count !== undefined ? `<span class="badge">${escapeHtml(opts.count)}</span>` : "";
  return `<details class="settingsBlock settingsTileBlock"${open}><summary><span>${escapeHtml(title)}</span>${count}</summary><div class="settingsBody">${body}</div></details>`;
}
function openSettingsForm(title, fields, values, onSave){
  const readOnly = !state.admin;
  const disabled = readOnly ? " disabled" : "";
  const body = fields.map(f=>{
    const val = values[f.key] ?? f.default ?? "";
    const help = f.help ? `<div class="hint">${escapeHtml(f.help)}</div>` : "";
    if(f.type === "textarea") return `<div><label>${escapeHtml(f.label)}</label><textarea id="sf_${escapeAttr(f.key)}" placeholder="${escapeAttr(f.placeholder||"")}"${disabled}>${escapeHtml(val)}</textarea>${help}</div>`;
    if(f.type === "select") return `<div><label>${escapeHtml(f.label)}</label><select id="sf_${escapeAttr(f.key)}"${disabled}>${(f.options||[]).map(o=>`<option value="${escapeAttr(o.value ?? o)}" ${String(val)===String(o.value ?? o)?"selected":""}>${escapeHtml(o.label ?? o)}</option>`).join("")}</select>${help}</div>`;
    return `<div><label>${escapeHtml(f.label)}</label><input id="sf_${escapeAttr(f.key)}" value="${escapeAttr(val)}" placeholder="${escapeAttr(f.placeholder||"")}"${disabled} />${help}</div>`;
  }).join("");
  $("projectModalTitle").textContent = title;
  $("projectModalBadge").textContent = state.admin ? "Admin edit" : "View only";
  $("projectModalBody").innerHTML = `<div class="settingsForm compactSettingsForm">${body}</div>`;
  $("projectModalFooter").innerHTML = `<button data-close="projectModal">Close</button>${state.admin?`<button class="ok" id="btnSettingsFormSave">Save</button>`:""}`;
  openModal("projectModal");
  const saveBtn = $("btnSettingsFormSave");
  if(saveBtn) saveBtn.onclick = e => runAction(e,"Saving settings...", async()=>{
    const data={};
    fields.forEach(f=>{ const el=$("sf_"+f.key); data[f.key]=el?el.value.trim():""; });
    await onSave(data);
    closeModal("projectModal");
    await load({silent:true});
  });
}
function editSetting(key, label, help){
  const isPin = key === "ADMIN_PIN";
  openSettingsForm(`Edit ${label || key}`,[{key:"Value",label:isPin?"New Admin PIN":(label||key),type:key==="PROCESS_COLUMNS"?"textarea":"input",help:isPin?"The current PIN is never displayed. Enter the replacement PIN here, then save.":help}],{Value:isPin?"":settingValue(key)}, async(data)=>api("upsertSetting",{pin:localStorage.getItem(ADMIN_PIN_KEY)||"", key, value:data.Value}));
}
function editPersonnel(id=""){
  const p = state.personnel.find(x=>String(x.PersonnelID)===String(id)) || {};
  openSettingsForm(p.PersonnelID?"Personnel Details":"Add Personnel",[
    {key:"PersonnelName",label:"Name",help:"Full name shown in assignments, passengers, and production logs."},
    {key:"Role",label:"Role",placeholder:"Designer, Admin, Driver, Carpenter, Installer",help:"Role is displayed with the name and can be used for filtering."},
    {key:"Department",label:"Department",placeholder:"Production, Design, Admin, Logistics"},
    {key:"ContactNumber",label:"Contact Number"},
    {key:"CanDrive",label:"Can Drive",type:"select",options:["N","Y"],help:"Set to Y so this person appears in driver choices."},
    {key:"CanInstall",label:"Can Install / Join Field Work",type:"select",options:["N","Y"]},
    {key:"Active",label:"Active",type:"select",options:["Y","N"]}
  ], Object.assign({Active:"Y",CanDrive:"N",CanInstall:"N"},p), async(data)=>api("upsertPersonnel",{pin:localStorage.getItem(ADMIN_PIN_KEY)||"", personnel:Object.assign({},p,data)}));
}
function editTeam(id=""){
  const t = state.teams.find(x=>String(x.TeamID)===String(id)) || {};
  const teamId = String(t.TeamID || "");
  const currentMembers = state.teamMembers.filter(m => String(m.TeamID || "") === teamId && m.Active !== "N");
  const isMemberChecked = (p) => currentMembers.some(m =>
    String(m.PersonnelID || "") === String(p.PersonnelID || "") ||
    String(m.MemberName || "").trim().toLowerCase() === String(personName(p) || "").trim().toLowerCase()
  );
  const leadOptions = [`<option value="">None</option>`].concat(state.personnel.map(p=>`<option value="${escapeAttr(personName(p))}" ${String(t.TeamLead||"")===String(personName(p))?"selected":""}>${escapeHtml(personnelLabel(p))}</option>`)).join("");

  $("projectModalTitle").textContent = t.TeamID ? "Team Details" : "Add Team";
  $("projectModalBadge").textContent = state.admin ? "Admin edit" : "View only";
  $("projectModalBody").innerHTML = `
    <div class="settingsForm compactSettingsForm">
      <div class="grid2">
        <div>
          <label>Team Name</label>
          <input id="teamNameInput" value="${escapeAttr(t.TeamName||"")}" placeholder="Team A, Finishing Team, CNC Team" ${state.admin?"":"disabled"} />
        </div>
        <div>
          <label>Team Lead</label>
          <select id="teamLeadInput" ${state.admin?"":"disabled"}>${leadOptions}</select>
          <div class="hint">Team lead is selected from the Personnel list.</div>
        </div>
        <div>
          <label>Active</label>
          <select id="teamActiveInput" ${state.admin?"":"disabled"}>
            <option value="Y" ${String(t.Active||"Y")!=="N"?"selected":""}>Y</option>
            <option value="N" ${String(t.Active||"Y")==="N"?"selected":""}>N</option>
          </select>
        </div>
      </div>
      <div class="memberPickerBlock">
        <div class="memberPickerHead">
          <div>
            <b>Team Members</b>
            <div class="hint">Select personnel assigned under this team. Add missing names first in Personnel.</div>
          </div>
          <span class="badge">${currentMembers.length} selected</span>
        </div>
        <div class="teamMemberToolbar">
          <span class="badge" id="teamMemberSelectedCount">0 selected</span>
          ${state.admin ? `<button type="button" class="miniBtn" id="btnExpandTeamMemberGroups">Expand all</button><button type="button" class="miniBtn" id="btnCollapseTeamMemberGroups">Collapse all</button>` : ``}
        </div>
        <div class="memberPickerList groupedMemberPicker">
          ${groupByDepartment(activePersonnelSorted()).map(g=>`<details class="deptPickGroup" open><summary>${escapeHtml(g.dept)} <span class="badge">${g.items.length}</span></summary>${g.items.map(p=>`
            <label class="memberPickRow">
              <input type="checkbox" class="teamMemberCheck" value="${escapeAttr(p.PersonnelID || personName(p))}" ${isMemberChecked(p)?"checked":""} ${state.admin?"":"disabled"} />
              <span class="memberPickName">${escapeHtml(personName(p)||p.PersonnelID||"Personnel")}</span>
              <span class="memberPickRole">${escapeHtml(personRole(p)||"—")}</span>
              <span class="memberPickDept">${escapeHtml(personDept(p)||"—")}</span>
            </label>`).join("")}</details>`).join("") || `<div class="hint">No personnel records yet. Add people in Settings → Personnel first, then return here.</div>`}
        </div>
      </div>
    </div>`;
  $("projectModalFooter").innerHTML = `<button data-close="projectModal">Close</button>${state.admin?`<button class="ok" id="btnSaveTeamWithMembers">Save Team</button>`:""}`;
  openModal("projectModal");
  function updateTeamMemberCount(){
    const n = document.querySelectorAll(".teamMemberCheck:checked").length;
    const badge = $("teamMemberSelectedCount");
    if(badge) badge.textContent = `${n} selected`;
  }
  document.querySelectorAll(".teamMemberCheck").forEach(ch => ch.addEventListener("change", updateTeamMemberCount));
  updateTeamMemberCount();
  const ex = $("btnExpandTeamMemberGroups");
  if(ex) ex.onclick = () => document.querySelectorAll(".deptPickGroup").forEach(d => d.open = true);
  const co = $("btnCollapseTeamMemberGroups");
  if(co) co.onclick = () => document.querySelectorAll(".deptPickGroup").forEach(d => d.open = false);

  const btn = $("btnSaveTeamWithMembers");
  if(btn) btn.onclick = e => runAction(e,"Saving team and members...", async()=>{
    const pin = localStorage.getItem(ADMIN_PIN_KEY)||"";
    const teamNameValue = $("teamNameInput").value.trim();
    if(!teamNameValue) throw new Error("Team Name is required.");
    const teamPayload = Object.assign({}, t, {
      TeamName: teamNameValue,
      TeamLead: $("teamLeadInput").value.trim(),
      Active: $("teamActiveInput").value.trim() || "Y"
    });
    const res = await api("upsertTeam", {pin, team:teamPayload});
    const savedTeamId = (res.team && res.team.TeamID) || t.TeamID;
    if(!savedTeamId) throw new Error("Team was saved but no TeamID was returned. Please redeploy the latest Apps Script.");
    const checked = Array.from(document.querySelectorAll(".teamMemberCheck:checked")).map(ch => {
      const p = state.personnel.find(x=>String(x.PersonnelID||personName(x))===String(ch.value)) || {};
      return {
        PersonnelID: p.PersonnelID || "",
        MemberName: personName(p) || ch.value,
        Role: personRole(p),
        Department: personDept(p),
        Active: "Y"
      };
    });
    await api("saveTeamMembers", {pin, teamId:savedTeamId, members:checked});
    closeModal("projectModal");
    await load({silent:true});
    alert("Team and members saved.");
  });
}
function editVehicle(id=""){
  const v = state.vehicles.find(x=>String(x.VehicleID)===String(id)) || {};
  openSettingsForm(v.VehicleID?"Vehicle Details":"Add Vehicle",[
    {key:"VehicleCode",label:"Vehicle Code",placeholder:"TRUCK-1"},
    {key:"VehicleLabel",label:"Vehicle Label",placeholder:"Isuzu Truck"},
    {key:"PlateNo",label:"Plate No."},
    {key:"PlateEnding",label:"Plate Ending",help:"Used later for NCR number coding rules."},
    {key:"VehicleType",label:"Vehicle Type",placeholder:"Truck, Van, Pick-up, Car"},
    {key:"Capacity",label:"Capacity",placeholder:"6 pax"},
    {key:"UnavailableDates",label:"Unavailable Dates",placeholder:"2026-06-10, 2026-06-11"},
    {key:"Active",label:"Active",type:"select",options:["Y","N"]}
  ], Object.assign({Active:"Y"},v), async(data)=>api("upsertVehicle",{pin:localStorage.getItem(ADMIN_PIN_KEY)||"", vehicle:Object.assign({},v,data)}));
}
function editVehiclePassenger(id=""){
  const vp = state.vehiclePassengers.find(x=>String(x.PassengerID)===String(id)) || {};
  const vehicleOptions = state.vehicles.map(v=>({value:v.VehicleID,label:`${v.VehicleCode || v.VehicleID} — ${v.VehicleLabel || ""}`}));
  const personOptions = state.personnel.map(p=>({value:p.PersonnelID,label:personnelLabel(p)}));
  openSettingsForm(vp.PassengerID?"Passenger / Crew Details":"Add Default Passenger / Crew",[
    {key:"VehicleID",label:"Vehicle",type:"select",options:vehicleOptions},
    {key:"PersonnelID",label:"Passenger / Personnel",type:"select",options:personOptions,help:"Designers and Admin can be included here too because this pulls from the full personnel list."},
    {key:"Role",label:"Crew Role",placeholder:"Passenger, Helper, Installer, Admin, Designer"},
    {key:"Active",label:"Active",type:"select",options:["Y","N"]}
  ], Object.assign({Active:"Y"},vp), async(data)=>api("upsertVehiclePassenger",{pin:localStorage.getItem(ADMIN_PIN_KEY)||"", vehiclePassenger:Object.assign({},vp,data)}));
}
function settingsList(rows, emptyText="No records yet."){
  if(!rows.length) return `<div class="hint">${escapeHtml(emptyText)}</div>`;
  return `<div class="settingsList">${rows.join("")}</div>`;
}
function settingsRow({title, role="—", dept="—", meta="", onClick=""}){
  return `<button type="button" class="settingsListRow" ${onClick?`onclick="${onClick}"`:""}>
    <span class="setName">${escapeHtml(title || "Unnamed")}</span>
    <span class="setRole">${escapeHtml(role || "—")}</span>
    <span class="setDept">${escapeHtml(dept || "—")}</span>
    ${meta?`<span class="setMeta">${meta}</span>`:""}
  </button>`;
}
function renderSettings(){
  const personnelBody = `${state.admin?`<div class="sectionActions"><button class="primary" onclick="editPersonnel('')">+ Add Personnel</button></div>`:""}` +
    departmentGroupedRows(activePersonnelSorted(), p=>settingsRow({
      title: personName(p) || p.PersonnelID || "Personnel",
      role: personRole(p),
      dept: personDept(p),
      onClick: `editPersonnel('${escapeAttr(p.PersonnelID)}')`
    }), "No personnel records yet.");

  const teamBody = `${state.admin?`<div class="sectionActions"><button class="primary" onclick="editTeam('')">+ Add Team</button></div>`:""}` +
    settingsList(state.teams.map(t=>{
      const members = state.teamMembers.filter(m=>m.TeamID===t.TeamID && m.Active!=="N").length;
      return settingsRow({
        title: t.TeamName || "Unnamed Team",
        role: t.TeamLead ? `Lead: ${t.TeamLead}` : "No lead",
        dept: `${members} member${members===1?"":"s"}`,
        onClick: `editTeam('${escapeAttr(t.TeamID)}')`
      });
    }), "No teams yet.");

  const passengerBody = `${state.admin?`<div class="sectionActions"><button class="primary" onclick="editVehiclePassenger('')">+ Add Passenger/Crew</button></div>`:""}` +
    settingsList(state.vehiclePassengers.map(vp=>{
      const p=state.personnel.find(x=>x.PersonnelID===vp.PersonnelID)||{};
      const v=state.vehicles.find(x=>x.VehicleID===vp.VehicleID)||{};
      return settingsRow({
        title: personName(p) || vp.PassengerName || vp.PersonnelID || "Passenger/Crew",
        role: vp.Role || personRole(p) || "Passenger/Crew",
        dept: personDept(p),
        onClick: `editVehiclePassenger('${escapeAttr(vp.PassengerID)}')`
      });
    }), "No passenger/crew defaults yet.");

  const driverBody = `<div class="hint sectionNote">Drivers are taken from Personnel with <b>Can Drive = Y</b> or role containing “Driver”.</div>` +
    settingsList(driverPeople().map(p=>settingsRow({
      title: personName(p) || p.PersonnelID || "Driver",
      role: personRole(p),
      dept: personDept(p),
      onClick: `editPersonnel('${escapeAttr(p.PersonnelID)}')`
    })), "No driver-capable personnel yet.");

  const vehicleBody = `${state.admin?`<div class="sectionActions"><button class="primary" onclick="editVehicle('')">+ Add Vehicle</button></div>`:""}` +
    settingsList(state.vehicles.map(v=>settingsRow({
      title: displayVehicle(v.VehicleID || v.VehicleCode) || v.VehicleLabel || "Vehicle",
      role: v.VehicleType || "Vehicle",
      dept: v.Active === "N" ? "Inactive" : "Active",
      onClick: `editVehicle('${escapeAttr(v.VehicleID)}')`
    })), "No vehicles yet.");

  const processBody = `<div class="pillWrap compactPills">${PROCESS_COLUMNS.map(x=>`<span class="pill info">${escapeHtml(x)}</span>`).join("")}</div><div class="sectionActions"><button class="primary" onclick="editSetting('PROCESS_COLUMNS','Production Process Columns','Separate each process with a vertical bar |. These become the Kanban columns.')">Edit Processes</button></div>`;

  const visibleSettings = Object.entries(state.settings||{}).filter(([k])=>k !== "ADMIN_PIN");
  const safeSettings = visibleSettings.map(([k,v])=>{
    return settingsRow({
      title: k,
      role: String(v || "—"),
      dept: "App setting",
      onClick: `editSetting('${escapeAttr(k)}','${escapeAttr(k)}','Update this app parameter without opening Google Sheets.')`
    });
  });
  const settingsBody = `<div class="sectionActions"><button class="primary" onclick="editSetting('ADMIN_PIN','Admin PIN','The current PIN is never displayed. Enter a new PIN only if you want to change it.')">Change Admin PIN</button></div>` + settingsList(safeSettings, "No app settings yet.");

  const adminOnly = state.admin ? `
    ${collapsible("Production Process", processBody, {count:PROCESS_COLUMNS.length})}
    ${collapsible("App Settings", settingsBody, {count:Object.keys(state.settings||{}).length})}
  ` : "";

  $("page-settings").innerHTML = `<div class="pageTitle"><div><h1>Settings</h1><div class="hint">Maintain master lists and system parameters inside the app. Click a row to view details; Admin Mode is required to edit.</div></div></div>
    <div class="settingsStack settingsTileGrid">
      ${collapsible("Personnel", personnelBody, {count:state.personnel.length})}
      ${collapsible("Team", teamBody, {count:state.teams.length})}
      ${collapsible("Passenger / Crew", passengerBody, {count:state.vehiclePassengers.length})}
      ${collapsible("Driver", driverBody, {count:driverPeople().length})}
      ${collapsible("Vehicle", vehicleBody, {count:state.vehicles.length})}
      ${adminOnly}
    </div>`;
}
function renderAbout(){ $("page-about").innerHTML = `<div class="pageTitle"><div><h1>About</h1><div class="hint">System information and credits.</div></div></div><div class="panel aboutBox"><h2>SJTC Production Department Dashboard</h2><p>A production and logistics coordination system for monitoring projects, tracking item-level production progress, managing partial delivery batches, and coordinating logistics requests.</p><p><b>Version:</b> 1.2.9<br><b>Company:</b> SJTC Manufacturing Inc. / Focolare Carpentry</p><p><b>Developed by:</b> Engr. CK Empeynado</p><p class="small">This system uses GitHub Pages for the frontend, Cloudflare Worker as proxy, Google Apps Script as API, and Google Sheets as database. It is intended for internal production monitoring and logistics coordination.</p></div>`; }
function openModal(id){ $(id).style.display="flex"; bindCloseButtons(); applyFieldTips(); }
function closeModal(id){ $(id).style.display="none"; }
function bindCloseButtons(){ document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeModal(b.dataset.close)); }
function bindGlobal(){
  document.querySelectorAll(".navBtn").forEach(t=>t.onclick=()=>{ state.page=t.dataset.page; render(); });
  $("btnSidebarToggle").onclick=()=>{ state.sidebarCollapsed=!state.sidebarCollapsed; localStorage.setItem("sjtc_sidebar_collapsed", state.sidebarCollapsed?"Y":"N"); syncShell(); };
  $("btnAdmin").onclick=()=>openModal("adminModal");
  $("btnAdminLogin").onclick=(e)=>runAction(e,"Unlocking admin mode...", async()=>{ const pin=$("adminPinInput").value.trim(); const res=await api("validateAdmin",{pin}); if(!res.valid) return alert("Invalid PIN"); localStorage.setItem(ADMIN_PIN_KEY,pin); closeModal("adminModal"); setAdmin(true); await load({silent:true}); });
  $("btnAdminOff").onclick=()=>{ localStorage.removeItem(ADMIN_PIN_KEY); closeModal("adminModal"); setAdmin(false); };
  $("btnRefresh").onclick=(e)=>runAction(e,"Refreshing data...", async()=>load());
  $("btnSaveProject").onclick=(e)=>runAction(e,"Saving project...", saveProject);
  $("btnSaveProjectItems").onclick=(e)=>runAction(e,"Saving items...", saveProjectItems);
  $("btnConfirmMove").onclick=(e)=>runAction(e,"Saving movement log...", confirmMove);
  $("btnSubmitLogisticsRequest").onclick=(e)=>runAction(e,"Submitting logistics request...", submitLogisticsRequest);
  $("btnConfirmScheduleRequest").onclick=(e)=>runAction(e,"Saving logistics schedule...", confirmSchedule);
  document.querySelectorAll(".modalBg").forEach(bg=>bg.addEventListener("click",e=>{ if(e.target===bg && !actionBusy) bg.style.display="none"; }));
}
bindGlobal(); load().then(startAutoRefresh);
