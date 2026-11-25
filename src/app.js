/* =========================================================
   养车有谱 · app logic
   ========================================================= */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = (n) => String(n).padStart(2, "0");
const STORE_KEY = "yangche.records.v2";
const VEHICLE_KEY = "yangche.vehicle.v1";
const SETTINGS_KEY = "yangche.settings.v1";
const APP_VERSION = "1.11.3";
const BACKUP_PREFIX = "yangche-";
const BACKUP_KEEP = 10;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const CATS = {
  fuel:   { name: "加油", icon: "#i-fuel",   grad: "linear-gradient(155deg,#ffc46b,#ff9d2e 60%,#f2800c)", color: "#ff9d2e" },
  care:   { name: "保养", icon: "#i-wrench", grad: "linear-gradient(155deg,#6fe0a8,#21bb7c 60%,#12a563)", color: "#21bb7c" },
  park:   { name: "停车", icon: "#i-park",   grad: "linear-gradient(155deg,#86b9ff,#3f80f4 60%,#2f6bf6)", color: "#3f80f4" },
  wash:   { name: "洗车", icon: "#i-wash",   grad: "linear-gradient(155deg,#7ee9e2,#23c0c6 60%,#12a8b8)", color: "#23c0c6" },
  insure: { name: "保险", icon: "#i-shield", grad: "linear-gradient(155deg,#a6a6ff,#7b7bff 60%,#6565f0)", color: "#7b7bff" },
  repair: { name: "维修", icon: "#i-tool",   grad: "linear-gradient(155deg,#ffa6b8,#ff6f91 60%,#f0537a)", color: "#ff6f91" },
  road:   { name: "高速", icon: "#i-road",   grad: "linear-gradient(155deg,#9fd0c9,#4fb3a3 60%,#3a9c8c)", color: "#4fb3a3" },
  other:  { name: "其他", icon: "#i-dots",   grad: "linear-gradient(155deg,#b8c4d2,#8b9bb0 60%,#71839a)", color: "#8b9bb0" },
};

const CAT_ORDER = ["fuel", "care", "park", "wash", "insure", "repair", "road", "other"];
const WEEK = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

/* ---------- 工具 ---------- */
const today = new Date();
const todayISO = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

function money(n, decimals = 0) {
  if (n == null || Number.isNaN(n)) return "--";
  return Number(n).toLocaleString("zh-CN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
function amountLabel(n) {
  return Number.isInteger(n) ? money(n) : money(n, 2);
}
function monthKeyOf(dateStr) { return dateStr.slice(0, 7); }
function shiftMonth(key, delta) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
function monthName(key) {
  const [y, m] = key.split("-").map(Number);
  return `${y} 年 ${m} 月`;
}
function shortMonth(key) {
  const [, m] = key.split("-").map(Number);
  return `${m}月`;
}
function dateText(d) {
  if (d === todayISO) return "今天";
  const y = Number(d.slice(0, 4));
  const m = Number(d.slice(5, 7));
  const dd = Number(d.slice(8, 10));
  return y === today.getFullYear() ? `${m} 月 ${dd} 日` : `${y} 年 ${m} 月 ${dd} 日`;
}

function dayLabel(dateStr) {
  if (dateStr === todayISO) return "今天";
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yISO = `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`;
  if (dateStr === yISO) return "昨天";
  const d = new Date(dateStr + "T00:00:00");
  return `${Number(dateStr.slice(5, 7))} 月 ${Number(dateStr.slice(8, 10))} 日 · ${WEEK[d.getDay()]}`;
}

/* ---------- 种子数据（覆盖本年度，含真实里程链） ---------- */
function seedData() {
  const Y = today.getFullYear();
  const plan = [
    [1, 8, "fuel", 312, 12,   "提车后首箱油", 40.2],
    [1, 8,  "insure", 4200, null, "交强险 + 商业险 · 首年", null],
    [1, 20, "park",   10,  null, "4S 店停车", null],

    [2, 6, "fuel", 290, 512,  "加满 38.6L", 38.6],
    [2, 12, "wash",   48,  null, "精洗 + 内饰", null],
    [2, 18, "care",   260, null, "首保 · 工时费", null],
    [2, 26, "park",   8,   null, "路边停车", null],

    [3, 9, "fuel", 296, 1012,  "", 39.1],
    [3, 21, "care",   460, null, "小保养 · 机油机滤", null],
    [3, 28, "park",   6,   null, "", null],

    [4, 5,  "road",   75,  null, "清明高速通行", null],
    [4, 14, "fuel", 302, 1512,  "中石化 92#", 39.8],
    [4, 24, "wash",   30,  null, "自助洗车", null],

    [5, 8, "fuel", 300, 2012, "加满", 39.4],
    [5, 16, "park",   9,   null, "商场停车", null],
    [5, 22, "care",   220, null, "空调滤芯", null],
    [5, 26, "fuel", 306, 2512, "长途前加满", 40.5],

    [6, 8, "fuel", 310, 3012, "", 40.8],
    [6, 18, "repair", 120, null, "补胎", null],
    [6, 25, "wash",   35,  null, "精洗", null],

    [7, 6, "fuel", 298, 3512, "中石化", 39.2],
    [7, 12, "fuel", 305, 4012, "加满", 40.1],
    [7, 28, "park",   15,  null, "机场停车 2 天", null],

    [8, 10, "fuel", 301, 4512, "", 39.6],
    [8, 14, "care",   180, null, "四轮换位 + 刹车检查", null],
    [8, 22, "fuel", 312, 5012, "长途前加满", 41.0],
    [8, 26, "wash",   28,  null, "", null],

    [9, 12, "fuel", 307, 5512, "中石化 95#", 39.9],
    [9, 25, "fuel", 295, 6012, "", 38.4],
    [9, 28, "park",   10,  null, "医院停车", null],

    [10, 2,  "road",  180, null, "国庆高速通行", null],
    [10, 9, "fuel", 309, 6512, "长途归来加满", 40.6],
    [10, 18, "wash",  45,  null, "精洗 + 打蜡", null],
    [10, 24, "repair",380, null, "刹车异响检修", null],
    [10, 28, "fuel", 302, 7012, "", 39.3],

    [11, 2,  "other", 45,  null, "高速通行费", null],
    [11, 5,  "park",  8,   null, "路边停车", null],
    [11, 8,  "care",  460, null, "小保养 · 机油机滤", null],
    [11, 12, "fuel", 280, 7512, "长途归来 · 加满 38.2L", 38.2],
    [11, 15, "wash",  35,  null, "精洗 + 内饰", null],
    [11, 18, "park",  12,  null, "地库临停 3 小时", null],
    [11, 20, "fuel", 320, 8012, "市中石化 95# 加满", 39.5],
  ];

  return plan.map(([m, d, cat, amount, mileage, note, liters], i) => ({
    id: `seed-${m}-${d}-${i}`,
    cat,
    amount,
    date: `${Y}-${pad(m)}-${pad(d)}`,
    mileage,
    note,
    liters,
  })).sort((a, b) => b.date.localeCompare(a.date));
}

/* ---------- 演示数据识别 ---------- */
// 种子数据的 id 固定带 seed- 前缀；用户自己记的、导入的、从备份恢复的都不带。
// 清空演示数据时按这个前缀筛，避免把用户真实账目一起删掉。
const DEMO_PREFIX = "seed-";
const isDemoRecord = (r) => String((r && r.id) || "").startsWith(DEMO_PREFIX);
const demoRecords = () => state.records.filter(isDemoRecord);

/* ---------- 状态 ---------- */
const DEFAULT_VEHICLE = {
  name: "小吉",
  owner: "Lucas的车库",
  model: "燃油汽车",
  plate: "粤 B · 7F2K9",
  registered: "2025-08",
  insurance: "2027-08",
  serviceInterval: 7200,
  serviceBase: 0,
  mileage: 0,
  style: { body: "suv", paint: "pearl" },
};
const DEFAULT_WEBDAV = { url: "", user: "", pass: "", dir: "养车有谱", lastBackup: null, lastError: null };
const DEFAULT_SETTINGS = { autoBackup: false, notifyReadAt: null, webdav: { ...DEFAULT_WEBDAV } };

const state = {
  records: [],
  vehicle: { ...DEFAULT_VEHICLE },
  settings: { ...DEFAULT_SETTINGS, webdav: { ...DEFAULT_WEBDAV } },
  month: `${today.getFullYear()}-${pad(today.getMonth() + 1)}`,
  filter: "all",
  page: "home",
  entry: { cat: "fuel", amount: "0", date: todayISO, mileage: "", liters: "", note: "", editingId: null },
  activeRecord: null,
};

function load() {
  let loaded = false;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        state.records = arr;
        loaded = true;
      }
    }
  } catch (e) { /* ignore */ }
  if (!loaded) {
    state.records = seedData();
    persist();
  }
  try {
    const v = JSON.parse(localStorage.getItem(VEHICLE_KEY) || "null");
    if (v && typeof v === "object") state.vehicle = { ...DEFAULT_VEHICLE, ...v };
    state.vehicle.style = YCCar.normalize(state.vehicle.style);
  } catch (e) { /* ignore */ }
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    if (s && typeof s === "object") {
      state.settings = {
        ...DEFAULT_SETTINGS,
        ...s,
        webdav: { ...DEFAULT_WEBDAV, ...(s.webdav || {}) },
      };
    }
  } catch (e) { /* ignore */ }
}
function persist() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state.records)); } catch (e) { /* ignore */ }
}
function persistVehicle() {
  try { localStorage.setItem(VEHICLE_KEY, JSON.stringify(state.vehicle)); } catch (e) { /* ignore */ }
}
function persistSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)); } catch (e) { /* ignore */ }
}
/* 记账、导入、恢复后统一走这里：落盘 + 重算 + 可选自动备份 */
function dataChanged() {
  persist();
  renderAll();
  scheduleAutoBackup();
}

/* ---------- 聚合 ---------- */
const inMonth = (r, key) => r.date.slice(0, 7) === key;
const monthRecords = (key) => state.records.filter((r) => inMonth(r, key));
const sum = (arr) => arr.reduce((a, r) => a + Number(r.amount || 0), 0);

function catTotals(arr) {
  const map = {};
  arr.forEach((r) => { map[r.cat] = (map[r.cat] || 0) + Number(r.amount || 0); });
  const grandTotal = sum(arr);
  return Object.entries(map)
    .map(([cat, total]) => ({ cat, total, pct: grandTotal ? total / grandTotal : 0 }))
    .sort((a, b) => b.total - a.total);
}

function latestMileage() {
  const arr = state.records.filter((r) => Number(r.mileage) > 0);
  const fromRecords = arr.length ? Math.max(...arr.map((r) => Number(r.mileage))) : 0;
  const manual = Number(state.vehicle && state.vehicle.mileage) || 0;
  return Math.max(fromRecords, manual);
}

function avgFuel() {
  const fuel = state.records
    .filter((r) => r.cat === "fuel" && Number(r.mileage) > 0 && Number(r.liters) > 0)
    .sort((a, b) => b.mileage - a.mileage);
  if (fuel.length < 2) return null;
  const last = fuel[0];
  const prev = fuel.slice(1).find((r) => Number(r.mileage) < Number(last.mileage));
  if (!prev) return null;
  const dist = Number(last.mileage) - Number(prev.mileage);
  if (dist <= 0) return null;
  const val = (Number(last.liters) / dist) * 100;
  return val > 0 && val < 40 ? val : null;
}

function costPerKm() {
  const arr = state.records.filter((r) => Number(r.mileage) > 0);
  if (arr.length < 2) return null;
  const miles = arr.map((r) => Number(r.mileage));
  const span = Math.max(...miles) - Math.min(...miles);
  if (span < 50) return null;
  return sum(state.records) / span;
}

function monthMileage(key) {
  const cur = monthRecords(key).filter((r) => Number(r.mileage) > 0);
  if (!cur.length) return 0;
  const maxCur = Math.max(...cur.map((r) => Number(r.mileage)));
  const earlier = state.records.filter((r) => r.date.slice(0, 7) < key && Number(r.mileage) > 0);
  if (!earlier.length) {
    const minCur = Math.min(...cur.map((r) => Number(r.mileage)));
    return Math.max(maxCur - minCur, 0);
  }
  const base = Math.max(...earlier.map((r) => Number(r.mileage)));
  return Math.max(maxCur - base, 0);
}

/* ---------- 车辆信息派生 ---------- */
function vehicleAge() {
  const value = state.vehicle.registered;
  if (!/^\d{4}-\d{2}$/.test(value || "")) return "—";
  const [y, m] = value.split("-").map(Number);
  const months = Math.max(0, (today.getFullYear() - y) * 12 + (today.getMonth() + 1 - m));
  return `${Math.floor(months / 12)}年${months % 12}个月`;
}

function registeredText() {
  const value = state.vehicle.registered;
  if (!/^\d{4}-\d{2}$/.test(value || "")) return "";
  const [y, m] = value.split("-").map(Number);
  return `${y} 年 ${m} 月上牌`;
}

function lastCareMileage() {
  const care = state.records.filter((r) => (r.cat === "care" || r.cat === "repair") && Number(r.mileage) > 0);
  return care.length ? Math.max(...care.map((r) => Number(r.mileage))) : 0;
}

/** 保养状态：优先用手填的上次保养里程，否则按账本里的保养记录推算 */
function serviceState() {
  const km = latestMileage();
  const interval = Number(state.vehicle.serviceInterval) || 0;
  const manualBase = Number(state.vehicle.serviceBase) || 0;
  const base = manualBase > 0 ? manualBase : lastCareMileage();
  if (!km) return { text: "待记录里程", remaining: null, next: null, due: false };
  if (!interval) return { text: "未设置间隔", remaining: null, next: null, due: false };
  const next = base + interval;
  const remaining = next - km;
  if (remaining <= 0) return { text: "已到保养里程", remaining, next, due: true };
  if (remaining <= 500) return { text: `该保养了 · 剩 ${money(remaining)} km`, remaining, next, due: true };
  return { text: `还剩 ${money(remaining)} km`, remaining, next, due: false };
}

function insuranceMonths() {
  const value = state.vehicle.insurance;
  if (!/^\d{4}-\d{2}$/.test(value || "")) return null;
  const [y, m] = value.split("-").map(Number);
  return (y - today.getFullYear()) * 12 + (m - (today.getMonth() + 1));
}

function insuranceText() {
  const value = state.vehicle.insurance;
  if (!/^\d{4}-\d{2}$/.test(value || "")) return "未设置";
  const [y, m] = value.split("-").map(Number);
  const left = insuranceMonths();
  const label = `${y} 年 ${m} 月`;
  if (left < 0) return `${label} · 已过期`;
  if (left === 0) return `${label} · 本月到期`;
  if (left <= 3) return `${label} · 还有 ${left} 个月`;
  return label;
}

function mileageInLastDays(days) {
  const from = new Date();
  from.setDate(from.getDate() - days);
  const fromISO = `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(from.getDate())}`;
  const inside = state.records.filter((r) => Number(r.mileage) > 0 && r.date >= fromISO);
  if (!inside.length) return 0;
  const max = Math.max(...inside.map((r) => Number(r.mileage)));
  const before = state.records.filter((r) => Number(r.mileage) > 0 && r.date < fromISO);
  const base = before.length
    ? Math.max(...before.map((r) => Number(r.mileage)))
    : Math.min(...inside.map((r) => Number(r.mileage)));
  return Math.max(max - base, 0);
}

/* ---------- 车模 ---------- */
let carDraft = { body: "suv", paint: "pearl" };

/* 同一份样式只重绘一次，避免记账后车轮动画被重置 */
function paintCar(el, style, opts) {
  if (!el) return;
  const key = `${style.body}|${style.paint}|${opts.pad === false ? 0 : opts.pad}|${opts.shadow ? 1 : 0}`;
  if (el.dataset.carKey === key) return;
  el.dataset.carKey = key;
  el.innerHTML = YCCar.carSvg(style, opts);
}

function currentStyle() {
  return YCCar.normalize(state.vehicle.style);
}

function renderCars() {
  const st = currentStyle();
  paintCar($("#garageCar"), st, { shadow: false, pad: 20 });
  paintCar($("#carMiniArt"), st, { shadow: false, pad: false });
  paintCar($("#carHero"), st, { shadow: true, pad: 6 });
}

function renderStylePicker() {
  const row = $("#modelRow");
  row.innerHTML = YCCar.ORDER.map((key) => {
    const m = YCCar.MODELS[key];
    const on = key === carDraft.body;
    return `<button type="button" class="modelitem${on ? " is-on" : ""}" data-body="${key}" role="radio" aria-checked="${on}">
      <span class="modelitem__art">${YCCar.carSvg({ body: key, paint: carDraft.paint }, { still: true, shadow: false, pad: 2 })}</span>
      <span class="modelitem__n">${m.label}</span>
      <span class="modelitem__s">${m.note}</span>
    </button>`;
  }).join("");

  $("#paintRow").innerHTML = Object.keys(YCCar.PAINTS).map((key) => {
    const paint = YCCar.PAINTS[key];
    const on = key === carDraft.paint;
    return `<button type="button" class="paintitem${on ? " is-on" : ""}" data-paint="${key}" role="radio" aria-checked="${on}" aria-label="${paint.label}" title="${paint.label}"><i style="background:${paint.dot}"></i></button>`;
  }).join("");

  $("#pickerBody").textContent = YCCar.modelLabel(carDraft.body);
  $("#pickerPaint").textContent = YCCar.paintLabel(carDraft.paint);
  $("#styleName").textContent = `${YCCar.paintLabel(carDraft.paint)} · ${YCCar.modelLabel(carDraft.body)}`;
  $("#stylePreview").innerHTML = YCCar.carSvg(carDraft, { shadow: true, pad: 18 });
}

function popStylePreview() {
  const box = $("#stylePreview");
  box.classList.remove("is-pop");
  void box.offsetWidth;
  box.classList.add("is-pop");
}

/* ---------- 首页 ---------- */
function renderHome() {
  const all = state.records;
  const cur = monthRecords(todayISO.slice(0, 7));
  const total = sum(all);
  const curTotal = sum(cur);
  const fuelCur = sum(cur.filter((r) => r.cat === "fuel"));
  const parkCur = sum(cur.filter((r) => r.cat === "park"));
  const parkCount = cur.filter((r) => r.cat === "park").length;

  const vehicle = state.vehicle;
  $("#garageOwner").textContent = vehicle.owner || "我的车库";
  $("#garageName").textContent = vehicle.name || "我的车";
  $("#garageType").textContent = `${YCCar.modelLabel(currentStyle().body)} · ${vehicle.model || "燃油汽车"}`;

  $("#heroMileage").textContent = money(latestMileage());
  $("#qTotal").textContent = money(total);
  $("#qTotalFoot").textContent = `共 ${all.length} 笔`;
  $("#qMonth").textContent = money(curTotal);
  $("#qMonthFoot").textContent = cur.length ? "本月新增" : "本月暂无";
  $("#qFuel").textContent = money(fuelCur);
  $("#qFuelFoot").textContent = fuelCur ? "本月新增" : "暂无支出";
  $("#qPark").textContent = money(parkCur);
  $("#qParkFoot").textContent = parkCount ? `本月 ${parkCount} 笔` : "暂无支出";
  $("#qParkFoot").className = "qcard__foot" + (parkCount ? "" : " is-new");

  const af = avgFuel();
  $("#avgFuel").textContent = af ? af.toFixed(1) : "--";
  const cpk = costPerKm();
  $("#perKm").textContent = cpk ? cpk.toFixed(1) : "--";

  const fuelTotal = sum(all.filter((r) => r.cat === "fuel"));
  const careTotal = sum(all.filter((r) => r.cat === "care"));
  const miscTotal = total - fuelTotal - careTotal;
  $("#fuelCost").textContent = money(fuelTotal);
  $("#careCost").textContent = money(careTotal);
  $("#miscCost").textContent = money(miscTotal);
  $("#fuelModCount").textContent = "共 3 项";

  const bars = $$(".fitem__bar i");
  [fuelTotal, careTotal, miscTotal].forEach((value, index) => {
    bars[index].style.setProperty("--w", `${total && value ? Math.max(value / total * 100, 6) : 0}%`);
  });

  renderRecent();
}

function recRow(r, showDate = true) {
  const c = CATS[r.cat] || CATS.other;
  const bits = [];
  if (showDate) bits.push(dayLabel(r.date));
  if (r.mileage) bits.push(`${money(r.mileage)} km`);
  if (r.note) bits.push(r.note);
  if (!bits.length) bits.push("仅记录金额");
  return `
    <button class="rec" data-rec="${r.id}">
      <span class="rec__ic" style="background:${c.grad}">
        <svg class="ico"><use href="${c.icon}"></use></svg>
      </span>
      <span class="rec__main">
        <span class="rec__t">${c.name}</span>
        <span class="rec__s">${escapeHtml(bits.join(" · "))}</span>
      </span>
      <span class="rec__amt"><small>¥</small>${amountLabel(r.amount)}</span>
    </button>`;
}

function renderRecent() {
  const list = [...state.records].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  $("#recentList").innerHTML = list.length
    ? list.map(recRow).join("")
    : `<div class="empty">还没记过账，点下面的 + 开始吧</div>`;
}

/* ---------- 账单页 ---------- */
function renderBills() {
  const cur = monthRecords(state.month);
  const total = sum(cur);
  const prev = sum(monthRecords(shiftMonth(state.month, -1)));

  $("#monthLabel").textContent = monthName(state.month);
  $("#billSum").textContent = money(total);
  $("#billCount").textContent = `${cur.length} 笔`;
  $("#billAvg").textContent = cur.length ? `¥${money(total / cur.length)}` : "¥0";
  $("#billKm").textContent = `${money(monthMileage(state.month))} km`;

  const catsPresent = CAT_ORDER.filter((c) => cur.some((r) => r.cat === c));
  const chips = [{ key: "all", name: "全部" }, ...catsPresent.map((c) => ({ key: c, name: CATS[c].name }))];
  if (!chips.some((c) => c.key === state.filter)) state.filter = "all";

  $("#filterChips").innerHTML = chips.map((c) => `
    <button class="chip-filter ${state.filter === c.key ? "is-on" : ""}" data-filter="${c.key}">
      ${c.key === "all" ? `<svg class="ico" style="width:12px;height:12px"><use href="#i-list"></use></svg>` : ""}
      ${c.name}
    </button>`).join("");

  const filtered = state.filter === "all" ? cur : cur.filter((r) => r.cat === state.filter);
  const wrap = $("#billList");

  if (!filtered.length) {
    wrap.innerHTML = `
      <div class="glass" style="padding:34px 20px;text-align:center;border-radius:26px">
        <div style="font-size:13px;font-weight:600">这个月还没有记录</div>
        <div style="font-size:11px;color:var(--ink-3);margin-top:6px">记一笔，成本才看得见</div>
        <button class="empty-cta" data-open="entrySheet">记第一笔</button>
      </div>`;
    return;
  }

  const groups = {};
  filtered.forEach((r) => { (groups[r.date] = groups[r.date] || []).push(r); });
  const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  wrap.innerHTML = dates.map((d) => {
    const rows = groups[d].sort((a, b) => b.id.localeCompare(a.id));
    const dt = sum(rows);
    return `
      <div class="daygroup">
        <div class="daygroup__head">
          <span class="daygroup__day">${dayLabel(d)}</span>
          <span class="daygroup__total">${rows.length} 笔 · ¥${amountLabel(dt)}</span>
        </div>
        <div class="daygroup__list">${rows.map((r) => recRow(r, false)).join("")}</div>
      </div>`;
  }).join("");
}

/* ---------- 统计页 ---------- */
function renderStats() {
  const cur = monthRecords(state.month);
  const prev = monthRecords(shiftMonth(state.month, -1));
  const total = sum(cur);
  const prevTotal = sum(prev);
  const parts = catTotals(cur);

  $("#statSub").textContent = `${monthName(state.month)} · 共 ${cur.length} 笔`;
  $("#statMonthText").textContent = `${Number(state.month.slice(5, 7))} 月`;
  $("#donutTotal").textContent = money(total);

  const delta = prevTotal ? ((total - prevTotal) / prevTotal) * 100 : 0;
  const deltaEl = $("#donutDelta");
  if (!prevTotal) {
    deltaEl.textContent = "上月无记录";
    deltaEl.style.color = "var(--ink-3)";
  } else {
    deltaEl.textContent = `较上月 ${delta >= 0 ? "+" : ""}${delta.toFixed(0)}%`;
    deltaEl.style.color = delta > 30 ? "#e2703a" : "var(--ink-3)";
  }

  /* 环形图 */
  const R = 72, CX = 94, CY = 94;
  const C = 2 * Math.PI * R;
  let acc = 0;
  const segs = parts.map((p) => {
    const startAngle = (acc / C) * 360;
    const len = Math.max(p.pct * C - 2.5, 3.5);
    acc += p.pct * C;
    return `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${CATS[p.cat].color}"
      stroke-width="18" stroke-linecap="butt" stroke-dasharray="${len.toFixed(2)} ${C.toFixed(2)}"
      transform="rotate(${startAngle.toFixed(2)} ${CX} ${CY})" opacity=".95"></circle>`;
  }).join("");
  $("#donutSegs").innerHTML = segs;

  $("#legend").innerHTML = parts.length
    ? parts.map((p) => `
        <div class="legend__i">
          <span class="legend__dot" style="background:${CATS[p.cat].color}"></span>
          <span class="legend__n">${CATS[p.cat].name}</span>
          <span class="legend__v">¥${money(p.total)}</span>
          <span class="legend__p">${(p.pct * 100).toFixed(0)}%</span>
        </div>`).join("")
    : `<div class="empty">本月暂无支出记录</div>`;

  /* 近 6 月柱状 */
  const months = [];
  for (let i = 5; i >= 0; i--) months.push(shiftMonth(state.month, -i));
  const values = months.map((k) => sum(monthRecords(k)));
  const maxV = Math.max(...values, 1);
  const maxIdx = values.indexOf(Math.max(...values));

  $("#bars").innerHTML = months.map((k, i) => {
    const h = values[i] ? Math.max((values[i] / maxV) * 96, 9) : 4;
    return `<div class="bar ${i === maxIdx && values[i] ? "is-peak" : ""}">
      <div class="bar__col" style="height:${h}%"><span class="bar__v">¥${money(values[i])}</span></div>
      <span class="bar__l">${shortMonth(k)}</span>
    </div>`;
  }).join("");

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  $("#barsAvg").textContent = `月均 ¥${money(avg)}`;

  /* 趋势 */
  const trend = months.map((k) => {
    const km = monthMileage(k);
    const v = km > 0 ? sum(monthRecords(k)) / km : null;
    return { k, v };
  }).filter((t) => t.v != null);

  const W = 320, H = 96, left = 10, right = 310, top = 24, bottom = 78;
  const vals = trend.map((t) => t.v);
  const tMin = Math.min(...vals, 0.5);
  const tMax = Math.max(...vals, 1.2);
  const pts = trend.map((t, i) => ({
    x: trend.length === 1 ? (left + right) / 2 : left + (i * (right - left)) / (trend.length - 1),
    y: bottom - ((t.v - tMin) / (tMax - tMin || 1)) * (bottom - top),
    v: t.v,
    label: shortMonth(t.k),
  }));

  $("#trendGrid").innerHTML = [0, 1, 2].map((i) => {
    const y = top + (i * (bottom - top)) / 2;
    return `<line x1="${left}" y1="${y}" x2="${right}" y2="${y}" stroke="rgba(14,31,56,.07)" stroke-dasharray="3 5" stroke-width="1"/>`;
  }).join("");

  if (pts.length >= 2) {
    const line = smoothPath(pts);
    $("#trendLine").setAttribute("d", line);
    $("#trendArea").setAttribute("d", `${line} L${right} ${H} L${left} ${H} Z`);
    $("#trendDots").innerHTML = pts.map((p, i) => {
      const last = i === pts.length - 1;
      return `<circle cx="${p.x}" cy="${p.y}" r="${last ? 4.6 : 3}" fill="#fff" stroke="#2f6bf6" stroke-width="${last ? 2.6 : 2}"/>
        ${last ? `<circle cx="${p.x}" cy="${p.y}" r="8.6" fill="#2f6bf6" opacity=".12"/>` : ""}
        <text x="${p.x}" y="${p.y - 12}" text-anchor="middle" font-size="9" font-weight="700" fill="${last ? "#1c4fd6" : "#7f92ab"}">${p.v.toFixed(1)}</text>`;
    }).join("");
  } else {
    $("#trendLine").setAttribute("d", "");
    $("#trendArea").setAttribute("d", "");
    $("#trendDots").innerHTML = `<text x="160" y="52" text-anchor="middle" font-size="11" fill="#9aabc0">里程记录不足，继续记账即可生成</text>`;
  }

  /* 与近 6 个月均值比较，替代写死的对比文案 */
  const badge = $("#trendBadge");
  if (badge) {
    if (trend.length >= 2) {
      const latest = trend[trend.length - 1].v;
      const mean = trend.reduce((a, t) => a + t.v, 0) / trend.length;
      const diff = mean ? ((latest - mean) / mean) * 100 : 0;
      badge.textContent = diff <= 0
        ? `低于近 6 月均值 ${Math.abs(diff).toFixed(0)}%`
        : `高于近 6 月均值 ${diff.toFixed(0)}%`;
      badge.classList.toggle("is-up", diff > 0);
    } else {
      badge.textContent = "里程记录不足";
      badge.classList.remove("is-up");
    }
  }
}

function smoothPath(pts) {
  if (pts.length < 2) return "";
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/* ---------- 年度报告 ---------- */
const RP_YEAR = today.getFullYear();

function yearRecs() {
  return state.records.filter((r) => r.date.slice(0, 4) === String(RP_YEAR));
}

function renderReportEntry() {
  const recs = yearRecs();
  const total = recs.reduce((a, r) => a + r.amount, 0);
  const el = $("#reTotal");
  if (el) el.textContent = `¥${money(total)}`;
  const y = $("#reYear");
  if (y) y.textContent = RP_YEAR;
}

function renderReport() {
  const recs = yearRecs();
  const total = recs.reduce((a, r) => a + r.amount, 0);
  const months = Array.from({ length: 12 }, (_, i) =>
    recs.filter((r) => Number(r.date.slice(5, 7)) === i + 1)
  );
  const monthTotals = months.map(sum);
  const peakIdx = monthTotals.indexOf(Math.max(...monthTotals));
  const peak = monthTotals[peakIdx] || 0;

  const odo = recs.filter((r) => r.mileage).map((r) => r.mileage);
  const km = odo.length ? Math.max(...odo) - Math.min(...odo) : 0;
  const days = new Set(recs.map((r) => r.date)).size;
  const fuelCount = recs.filter((r) => r.cat === "fuel").length;
  const shopCount = recs.filter((r) => r.cat === "care" || r.cat === "repair").length;
  const af = avgFuel();
  const cpk = km > 0 ? total / km : 0;

  /* 封面 */
  $("#rpYear").textContent = RP_YEAR;
  const nextYear = $("#rpNext");
  if (nextYear) nextYear.textContent = `${RP_YEAR + 1}，继续有谱`;
  $("#rpTotal").textContent = money(total);
  $("#rpKm").textContent = money(km);
  $("#rpCount").textContent = money(recs.length);
  $("#rpDays").textContent = money(days);

  /* 月度柱 */
  const maxM = Math.max(...monthTotals, 1);
  const curM = today.getMonth() + 1;
  $("#rpBars").innerHTML = monthTotals.map((v, i) => {
    const h = v ? Math.max((v / maxM) * 100, 6) : 3;
    const isPeak = v && i === peakIdx;
    const future = i + 1 > curM;
    return `<div class="rp-bar ${isPeak ? "is-peak" : ""} ${future ? "is-future" : ""}">
      <div class="rp-bar__fill" style="height:${h}%">${isPeak ? `<span class="rp-bar__v">¥${money(v)}</span>` : ""}</div>
    </div>`;
  }).join("");

  $("#rpAxis").innerHTML = Array.from({ length: 12 }, (_, i) => {
    const now = i + 1 === today.getMonth() + 1;
    return `<span class="${now ? "is-now" : ""}">${i + 1}</span>`;
  }).join("");

  const share = total ? Math.round((peak / total) * 100) : 0;
  const peakNote = peakIdx === 0 && recs.some((r) => r.cat === "insure")
    ? "（含首年保险）"
    : "";
  $("#rpMonthLine").textContent = peak
    ? `${peakIdx + 1} 月花得最多，一个月 ¥${money(peak)}${peakNote}，占了全年的 ${share}%`
    : "今年还没有记录，记下第一笔就能生成报告";

  /* 封面轨迹：累计支出 */
  let run = 0;
  const cum = monthTotals.map((v, i) => {
    run += v;
    return { x: 6 + (i * 328) / 11, y: 0, v: run };
  });
  const cMax = Math.max(run, 1);
  cum.forEach((p) => { p.y = 104 - (p.v / cMax) * 88; });
  const line = smoothPath(cum);
  $("#rpTraceLine").setAttribute("d", line);
  $("#rpTraceArea").setAttribute("d", `${line} L334 118 L6 118 Z`);
  const end = cum[cum.length - 1];
  const dot = $("#rpTraceDot");
  dot.setAttribute("cx", end.x.toFixed(1));
  dot.setAttribute("cy", end.y.toFixed(1));
  dot.setAttribute("opacity", ".9");

  /* 类别排行 */
  const parts = catTotals(recs).slice(0, 6);
  const maxP = parts.length ? parts[0].total : 1;
  $("#rpRank").innerHTML = parts.length
    ? parts.map((p) => {
        const c = CATS[p.cat];
        return `<div class="rp-rank__i">
          <span class="rp-rank__ic" style="background:${c.grad}">
            <svg class="ico"><use href="${c.icon}" /></svg>
          </span>
          <div class="rp-rank__main">
            <div class="rp-rank__top">
              <span class="rp-rank__n">${c.name}</span>
              <span class="rp-rank__p">${(p.pct * 100).toFixed(0)}%</span>
            </div>
            <div class="rp-rank__track"><i style="width:${(p.total / maxP) * 100}%;background:${c.grad}"></i></div>
          </div>
          <span class="rp-rank__amt">¥${money(p.total)}</span>
        </div>`;
      }).join("")
    : `<div class="empty" style="color:rgba(226,250,240,.4)">暂无数据</div>`;
  $("#rpCatLine").textContent = parts.length
    ? `${CATS[parts[0].cat].name}是最大头，占了 ${(parts[0].pct * 100).toFixed(0)}%`
    : "按类别统计";

  /* 四宫格 */
  $("#rpGrid").innerHTML = `
    <div class="rp-tile">
      <div class="rp-tile__k">加油次数</div>
      <div class="rp-tile__v"><b>${fuelCount}</b><span>次</span></div>
      <div class="rp-tile__s">平均 ${km && fuelCount ? Math.round(km / fuelCount) : 0} 公里一箱</div>
    </div>
    <div class="rp-tile">
      <div class="rp-tile__k">进店次数</div>
      <div class="rp-tile__v"><b>${shopCount}</b><span>次</span></div>
      <div class="rp-tile__s">保养与维修</div>
    </div>
    <div class="rp-tile">
      <div class="rp-tile__k">平均油耗</div>
      <div class="rp-tile__v"><b>${af ? af.toFixed(1) : "--"}</b><span>L/100km</span></div>
      <div class="rp-tile__s">${af && af < 8.5 ? "比同级车更省" : "市区通勤为主"}</div>
    </div>
    <div class="rp-tile">
      <div class="rp-tile__k">单公里成本</div>
      <div class="rp-tile__v"><b>${cpk ? cpk.toFixed(1) : "--"}</b><span>元/km</span></div>
      <div class="rp-tile__s">含油费、保养与保险</div>
    </div>`;

  /* 瞬间 */
  const priciest = recs.slice().sort((a, b) => b.amount - a.amount)[0];
  const biggestFuel = recs.filter((r) => r.liters).sort((a, b) => b.liters - a.liters)[0];
  const activeMonths = monthTotals.map((v, i) => ({ v, i })).filter((m) => m.v > 0);
  const lightest = activeMonths.slice().sort((a, b) => a.v - b.v)[0];

  const moment = (icon, title, desc, val) => `<div class="rp-moment">
      <span class="rp-moment__ic"><svg class="ico"><use href="${icon}" /></svg></span>
      <div class="rp-moment__main">
        <div class="rp-moment__t">${title}</div>
        <div class="rp-moment__d">${desc}</div>
      </div>
      <span class="rp-moment__v">${val}</span>
    </div>`;

  $("#rpMoments").innerHTML = [
    priciest ? moment("#i-wrench", "最贵的一笔", `${dateText(priciest.date)} · ${CATS[priciest.cat].name}`, `¥${money(priciest.amount)}`) : "",
    biggestFuel ? moment("#i-fuel", "加得最满的一次", `${dateText(biggestFuel.date)} · ${biggestFuel.liters.toFixed(1)} L`, `¥${money(biggestFuel.amount)}`) : "",
    lightest ? moment("#i-chart", "最省的一个月", `${lightest.i + 1} 月，几乎没怎么跑`, `¥${money(lightest.v)}`) : "",
  ].join("") || `<div class="empty" style="color:rgba(226,250,240,.4)">还没有足够的记录</div>`;
}

function openReport() {
  const el = $("#yearReport");
  if (!el) return;
  el.classList.add("is-open");
  el.setAttribute("aria-hidden", "false");
  $("#reportScroll").scrollTop = 0;
  closeAllSheets();
}
function closeReport() {
  const el = $("#yearReport");
  if (!el) return;
  el.classList.remove("is-open");
  el.setAttribute("aria-hidden", "true");
}

async function shareReport() {
  const recs = yearRecs();
  const total = recs.reduce((a, r) => a + r.amount, 0);
  const odo = recs.filter((r) => r.mileage).map((r) => r.mileage);
  const km = odo.length ? Math.max(...odo) - Math.min(...odo) : 0;
  const fuel = recs.filter((r) => r.cat === "fuel").length;
  const text = `我的 ${RP_YEAR} 年度养车报告：全年支出 ¥${money(total)}，跑了 ${money(km)} 公里，加了 ${fuel} 次油。来自「养车有谱」`;

  try {
    const share = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share;
    if (share) {
      await share.share({ title: `${RP_YEAR} 年度养车报告`, text, dialogTitle: "分享年度报告" });
      return;
    }
    if (navigator.share) {
      await navigator.share({ title: `${RP_YEAR} 年度养车报告`, text });
      return;
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      toast("报告摘要已复制");
      return;
    }
    toast("当前环境不支持分享");
  } catch (err) {
    if (err && err.name === "AbortError") return;
    toast("分享已取消");
  }
}

/* ---------- 我的 ---------- */
function renderMe() {
  const total = sum(state.records);
  const km = latestMileage();
  const cpk = costPerKm();
  const days = new Set(state.records.map((r) => r.date)).size;
  const vehicle = state.vehicle;
  const age = vehicleAge();
  const service = serviceState();
  const recentKm = mileageInLastDays(30);

  $("#meTotal").textContent = money(total);
  $("#meKm").textContent = money(km);
  $("#mePerKm").textContent = cpk ? cpk.toFixed(1) : "--";
  $("#meSub").textContent = `已记账 ${state.records.length} 笔 · 坚持 ${days} 天`;
  $("#meKmFoot").textContent = recentKm ? `近 30 天 +${money(recentKm)}` : "近 30 天 无新增";

  $("#profileName").textContent = vehicle.owner || "我的车库";
  $("#profileAvatar").textContent = (vehicle.owner || "我").trim().slice(0, 1).toUpperCase();
  $("#carMiniName").textContent = `${vehicle.name || "我的车"} · ${YCCar.modelLabel(currentStyle().body)}`;
  $("#setCarName").textContent = vehicle.name || "—";
  $("#meCarCount").textContent = "1 辆";

  $("#meCarSub").textContent = `当前里程 ${money(km)} km · 车龄 ${age}`;
  $("#meCareTag").textContent = `下次保养：${service.text}`;
  $("#detailKm").textContent = money(km);
  $("#detailAge").textContent = age;
  $("#detailFuel").textContent = avgFuel()?.toFixed(1) ?? "--";
  $("#detailMonthKm").textContent = `${money(monthMileage(todayISO.slice(0, 7)))} km`;
  $("#carSheetTitle").textContent = `${vehicle.name || "我的车"}的档案`;
  $("#carSheetSub").textContent = [YCCar.modelLabel(currentStyle().body), vehicle.model, registeredText()].filter(Boolean).join(" · ");
  $("#detailInsurance").textContent = insuranceText();
  $("#detailPlate").textContent = vehicle.plate || "未设置";
  $("#detailInterval").textContent = vehicle.serviceInterval ? `${money(vehicle.serviceInterval)} km` : "未设置";
  $$("[data-service-distance]").forEach((label) => { label.textContent = service.text; });
  $$("[data-webdav-state]").forEach((label) => { label.textContent = webdavLabel(); });
  $("#webdavState").textContent = webdavLabel();
  const demoCount = demoRecords().length;
  $$("[data-demo-count]").forEach((label) => {
    // 处于「再点一次确认」时不要被重绘覆盖掉
    if (label.getAttribute("data-armed") === "1") return;
    label.textContent = demoCount ? `${demoCount} 条` : "无";
  });
  const first = state.records.slice().sort((a, b) => a.date.localeCompare(b.date))[0];
  if (first) $("#meSince").textContent = `自 ${first.date.slice(0, 4)}.${first.date.slice(5, 7)} 起`;
}

const pageRenderers = {
  home: renderHome,
  bills: renderBills,
  stats() { renderStats(); renderReportEntry(); },
  me: renderMe,
};
const dirtyPages = new Set();
function renderPage(page) {
  if (dirtyPages.delete(page)) pageRenderers[page]();
}
function refreshPages(pages) {
  for (const page of pages) dirtyPages.add(page);
  renderPage(state.page);
}
function renderAll() { refreshPages(Object.keys(pageRenderers)); renderCars(); }

/* ---------- 页面切换 ---------- */
function go(page) {
  const next = document.getElementById(`page-${page}`);
  if (!next) return;
  if (state.page === page) { renderPage(page); movePill(); return; }
  const activeTab = document.getElementById(`tab-${page}`);
  const previous = document.getElementById(`page-${state.page}`);
  const direction = Math.sign(tabCenter(activeTab) - tabCenter($(".tab.is-active")));
  const moveFocus = previous.contains(document.activeElement);
  state.page = page;
  renderPage(page);
  previous.inert = true;
  previous.classList.remove("is-active");
  previous.style.setProperty("--page-offset", `${-direction * 10}px`);
  next.style.setProperty("--page-offset", `${direction * 10}px`);
  next.inert = false;
  next.classList.add("is-active");

  dockTabs.forEach((tab) => {
    const on = tab === activeTab;
    tab.classList.toggle("is-active", on);
    tab.setAttribute("aria-selected", String(on));
    tab.tabIndex = on ? 0 : -1;
  });
  if (moveFocus) activeTab.focus({ preventScroll: true });
  movePill();
}

const dock = $(".tabbar");
const tabLens = $("#tabLens"), dockRest = $("#dockRest");
const dockTabs = $$(".tab", dock);
const dockCenters = [42.5,111.5,252.5,321.5];
const solidDock = matchMedia("(prefers-reduced-transparency: reduce), (prefers-contrast: more)");
let litTab = null;
let slowDockFrames = 0;
const lensPhys = {
  x:42.5, target:42.5, vx:0, y:0, targetY:0, vy:0, stretch:0,
  morph:0, vm:0, holdUntil:0, scale:1, vs:0, pressed:false, tracking:false,
  raf:0, last:0, unit:1,
};

function tabCenter(tab) { return dockCenters[dockTabs.indexOf(tab)]; }

function paintDock() {
  const {x,y,stretch,morph,scale,unit} = lensPhys;
  const jellyX = 1+stretch, jellyY = 1-stretch*.45;
  const width = (74+20*morph)*jellyX*unit, height = (58+22*morph)*jellyY*unit;
  const left = (182 + (x-182)*scale)*unit - width*scale/2;
  const top = (y*unit-height/2)*scale;
  const transform = `translate3d(${left.toFixed(2)}px,${top.toFixed(2)}px,0) scale(${width*scale/(94*unit)},${height*scale/(80*unit)})`;
  dockRest.style.transform = tabLens.style.transform = transform;
  let nearest = null;
  let distance = width/(2*unit);
  for (let i = 0; i < dockTabs.length; i++) {
    const delta = Math.abs(dockCenters[i] - x);
    if (delta < distance) { nearest = dockTabs[i]; distance = delta; }
  }
  if (litTab !== nearest) {
    litTab?.classList.remove("is-lit");
    nearest?.classList.add("is-lit");
    litTab = nearest;
  }
  dockRest.style.opacity = (1-morph).toFixed(3);
  dock.style.setProperty("--dock-scale",scale.toFixed(5));
  tabLens.style.visibility = morph>.005 ? "visible" : "hidden";
  tabLens.style.opacity = morph.toFixed(3);
  dockMaterial.draw(lensPhys);
}

function settleDock() {
  const motion = lensPhys;
  cancelAnimationFrame(motion.raf);
  motion.raf = 0;
  motion.x = motion.target;
  motion.y = motion.targetY;
  motion.morph = reducedMotion.matches ? 0 : Number(motion.tracking);
  motion.scale = !reducedMotion.matches && motion.pressed ? 1.038 : 1;
  motion.vx = motion.vy = motion.vm = motion.vs = motion.stretch = 0;
  paintDock();
}

function dockFrame(now) {
  const motion = lensPhys;
  const gap = now - motion.last;
  if (!document.hidden && !dock.classList.contains("lite-optics")) {
    slowDockFrames = gap > 35 && gap < 180 ? slowDockFrames + 1 : 0;
    if (slowDockFrames >= 4) dock.classList.add("lite-optics");
  }
  let remaining = Math.min(.08,Math.max(0,gap/1000));
  motion.last = now;
  const morphTarget = Number(motion.tracking || now<motion.holdUntil);
  const scaleTarget = motion.pressed ? 1.038 : 1;
  while (remaining>0) {
    const step = Math.min(.005,remaining);
    motion.vx += ((motion.target-motion.x)*280-18*motion.vx)*step;
    motion.vy += ((motion.targetY-motion.y)*280-18*motion.vy)*step;
    motion.x += motion.vx*step;
    motion.y += motion.vy*step;
    motion.stretch += (Math.min(.24,Math.abs(motion.vx)/1400)-motion.stretch)*step*18;
    motion.vm += ((morphTarget-motion.morph)*260-22*motion.vm)*step;
    motion.morph = Math.max(0,Math.min(1,motion.morph+motion.vm*step));
    motion.vs += ((scaleTarget-motion.scale)*320-19*motion.vs)*step;
    motion.scale = Math.max(.95,Math.min(1.12,motion.scale+motion.vs*step));
    remaining -= step;
  }
  if (now>=motion.holdUntil && Math.abs(motion.x-motion.target)<.12 && Math.abs(motion.y-motion.targetY)<.12
      && Math.abs(motion.vx)+Math.abs(motion.vy)<2 && motion.stretch<.002
      && Math.abs(motion.morph-morphTarget)<.003 && Math.abs(motion.vm)<.04
      && Math.abs(motion.scale-scaleTarget)<.0004 && Math.abs(motion.vs)<.01) {
    settleDock();
    return;
  }
  paintDock();
  motion.raf = requestAnimationFrame(dockFrame);
}
function wakeDock() {
  if (reducedMotion.matches) { settleDock(); return; }
  if (lensPhys.raf) return;
  slowDockFrames = 0;
  lensPhys.last = performance.now();
  lensPhys.raf = requestAnimationFrame(dockFrame);
}
function movePill(instant = false) {
  lensPhys.target = tabCenter($(".tab.is-active",dock));
  lensPhys.targetY = 0;
  if (instant) settleDock(); else wakeDock();
}
function bindDock() {
  const tablist = $(".tabbar__tabs",dock), fab = $("#fab");
  let gesture = null, suppressClick = false;
  function layout() {
    lensPhys.unit = dock.clientWidth/364 || 1;
    dock.style.setProperty("--dock-u",lensPhys.unit+"px");
    movePill(true);
    dockMaterial.resize(lensPhys.unit,!solidDock.matches && !reducedMotion.matches);
    dock.classList.toggle("has-optics",!solidDock.matches && CSS.supports("backdrop-filter",'url("#lens-optics")'));
    dock.classList.add("is-ready");
  }
  const plusHit = (horizontal,vertical) => Math.abs(horizontal-182)<=28 && Math.abs(vertical)<=26;
  const clampX = horizontal => Math.max(38.5,Math.min(325.5,horizontal));
  function point(event) {
    return [(event.clientX-gesture.middleX)/gesture.unit+182,(event.clientY-gesture.middleY)/gesture.unit];
  }
  function release() {
    gesture = null;
    lensPhys.pressed = lensPhys.tracking = false;
    lensPhys.holdUntil = 0;
    lensPhys.targetY = 0;
  }
  function activate(tab,hold,focus = true) {
    lensPhys.holdUntil = hold && state.page!==tab.dataset.tab ? performance.now()+240 : 0;
    go(tab.dataset.tab);
    if (focus) tab.focus({preventScroll:true});
  }
  dock.addEventListener("pointerdown",event => {
    if (gesture || !event.isPrimary || event.button!==0) return;
    dock.classList.add("pointer-focus");
    const bounds = dock.getBoundingClientRect();
    gesture = {id:event.pointerId,middleX:bounds.left+bounds.width/2,middleY:bounds.top+bounds.height/2,
      unit:bounds.width/364,moved:false};
    const [horizontal,vertical] = point(event);
    gesture.startX = horizontal; gesture.startY = vertical;
    gesture.plus = plusHit(horizontal,vertical);
    suppressClick = false;
    lensPhys.pressed = true;
    lensPhys.tracking = !gesture.plus;
    lensPhys.vs += .34;
    lensPhys.holdUntil = 0;
    if (lensPhys.tracking) lensPhys.target = clampX(horizontal);
    (gesture.plus ? fab : dock).setPointerCapture(event.pointerId);
    wakeDock();
  });
  dock.addEventListener("pointermove",event => {
    if (!gesture || gesture.id!==event.pointerId || gesture.plus) return;
    const [horizontal,vertical] = point(event);
    if (Math.abs(horizontal-gesture.startX)>4 || Math.abs(vertical-gesture.startY)>4) gesture.moved = true;
    lensPhys.target = clampX(horizontal);
    lensPhys.targetY = Math.max(-14,Math.min(14,vertical*.25));
    wakeDock();
  });
  dock.addEventListener("pointerup",event => {
    if (!gesture || gesture.id!==event.pointerId) return;
    const [horizontal,vertical] = point(event);
    const {plus,moved} = gesture;
    release();
    suppressClick = !plus || !plusHit(horizontal,vertical);
    if (plus) {
      movePill();
    } else {
      const nearest = dockTabs.reduce((best,tab)=>Math.abs(tabCenter(tab)-horizontal)<Math.abs(tabCenter(best)-horizontal)?tab:best);
      activate(nearest,!moved,false);
    }
  });
  function cancel(event) {
    if (!gesture || (event.pointerId!=null && event.pointerId!==gesture.id)) return;
    release();
    suppressClick = true;
    movePill();
  }
  dock.addEventListener("pointercancel",cancel);
  dock.addEventListener("lostpointercapture",event => {
    if (event.target===dock || event.target===fab) cancel(event);
  });
  window.addEventListener("blur",cancel);
  document.addEventListener("keydown", () => dock.classList.remove("pointer-focus"), true);
  dock.addEventListener("click",event => {
    if (!suppressClick || !event.detail) return;
    suppressClick = false;
    event.stopImmediatePropagation();
    event.preventDefault();
  },true);
  for (const tab of dockTabs) tab.addEventListener("click",() => {
    lensPhys.vs += .34;
    activate(tab,true);
  });
  tablist.addEventListener("keydown",event => {
    const index = dockTabs.indexOf(event.target);
    if (index<0) return;
    const next = {ArrowLeft:(index+3)%4,ArrowRight:(index+1)%4,Home:0,End:3}[event.key];
    if (next===undefined) return;
    event.preventDefault();
    lensPhys.vs += .34;
    activate(dockTabs[next],true);
  });
  document.addEventListener("visibilitychange",() => {
    if (document.hidden) { release(); movePill(true); }
  });
  reducedMotion.addEventListener("change",()=>{ release(); layout(); });
  solidDock.addEventListener("change",layout);
  layout();
  new ResizeObserver(entries => {
    if (Math.abs(entries[0].contentRect.width-lensPhys.unit*364)>.51) layout();
  }).observe(dock);
}
/* ---------- 抽屉 ---------- */
let sheetOpener;
function openSheet(id, trigger = document.activeElement) {
  const el = document.getElementById(id);
  if (!el || el.classList.contains("is-open")) return;
  if (id === "carSheet") renderPage("me");
  if (id === "notifySheet") {
    renderPage("me");
    renderNotifications();
    state.settings.notifyReadAt = todayISO;
    persistSettings();
    const dot = $(".bell__dot");
    if (dot) dot.style.display = "none";
  }
  const sheet = $(".sheet", el);
  const screen = $("#app").getBoundingClientRect();
  const source = trigger === $(".garage__open") ? $("span", trigger) : trigger;
  const box = source?.getBoundingClientRect();
  const horizontal = box?.width ? (box.left + box.width / 2 - screen.left) / screen.width : .5;
  const vertical = box?.height ? (box.top + box.height / 2 - screen.top) / screen.height : .85;
  sheet.style.setProperty("--sheet-anchor", `${Math.round(horizontal * 100)}%`);
  sheet.style.setProperty("--sheet-origin-x", `${(horizontal - .5) * 86}px`);
  sheet.style.setProperty("--sheet-origin-y", `${Math.max(26, Math.min(100, (vertical - .48) * 170))}%`);
  sheetOpener = trigger;
  el.inert = false;
  el.classList.add("is-open");
  el.setAttribute("aria-hidden", "false");
  const closeBtn = el.querySelector(".sheet__close");
  if (closeBtn) closeBtn.focus({ preventScroll: true });
  $("#pages").inert = true;
  $(".tabbar").inert = true;
  $("#app").classList.add("has-sheet");
}
function closeSheet(id) {
  const el = document.getElementById(id);
  if (!el?.classList.contains("is-open")) return;
  el.inert = true;
  if (sheetOpener?.isConnected) sheetOpener.focus({ preventScroll: true });
  sheetOpener = null;
  el.classList.remove("is-open");
  el.classList.remove("is-pulling");
  el.setAttribute("aria-hidden", "true");
  if (!$(".sheet-wrap.is-open")) {
    $("#app").classList.remove("has-sheet");
    $("#pages").inert = false;
    $(".tabbar").inert = false;
  }
}
function closeAllSheets() {
  $$(".sheet-wrap.is-open").forEach((s) => closeSheet(s.id));
}

function bindSheetGestures() {
  $$(".sheet__handle").forEach((handle) => {
    const wrap = handle.closest(".sheet-wrap");
    let pull;

    function end(event, dismiss) {
      if (pull?.id !== event.pointerId) return;
      const passedThreshold = pull.distance > 90 || (pull.distance > 34 && performance.now() - pull.started < 220);
      pull = null;
      wrap.classList.remove("is-pulling");
      if (dismiss && passedThreshold) closeSheet(wrap.id);
    }
    handle.addEventListener("pointerdown", (event) => {
      if (!event.isPrimary || event.button !== 0 || !wrap.classList.contains("is-open")) return;
      pull = { id: event.pointerId, y: event.clientY, started: performance.now(), distance: 0 };
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener("pointermove", (event) => {
      if (pull?.id !== event.pointerId) return;
      pull.distance = Math.max(0, event.clientY - pull.y);
      if (reducedMotion.matches) return;
      wrap.style.setProperty("--sheet-pull", `${Math.sqrt(pull.distance) * 8}px`);
      wrap.style.setProperty("--sheet-squash", String(1 - Math.min(.08, pull.distance / 1700)));
      wrap.classList.add("is-pulling");
    });
    handle.addEventListener("pointerup", (event) => end(event, true));
    handle.addEventListener("pointercancel", (event) => end(event, false));
    handle.addEventListener("lostpointercapture", (event) => end(event, false));
  });
}

/* ---------- 记账 ---------- */
function buildCatGrid() {
  $("#catGrid").innerHTML = CAT_ORDER.map((key) => {
    const c = CATS[key];
    return `<button class="cat ${state.entry.cat === key ? "is-on" : ""}" data-cat="${key}">
      <span class="cat__ic" style="background:${c.grad}">
        <svg class="ico"><use href="${c.icon}"></use></svg>
      </span>
      <span class="cat__t">${c.name}</span>
    </button>`;
  }).join("");
}

function openEntry(cat, presetAmount, trigger, editId) {
  const editing = editId ? state.records.find((r) => r.id === editId) : null;
  state.entry = {
    cat: editing ? editing.cat : (cat || "fuel"),
    amount: editing ? String(editing.amount) : (presetAmount ? String(presetAmount) : "0"),
    date: editing ? editing.date : todayISO,
    mileage: editing && editing.mileage ? String(editing.mileage) : "",
    liters: editing && editing.liters ? String(editing.liters) : "",
    note: editing ? (editing.note || "") : "",
    editingId: editing ? editing.id : null,
  };
  buildCatGrid();
  $("#entryDate").value = state.entry.date;
  $("#entryMileage").value = state.entry.mileage;
  $("#entryLiters").value = state.entry.liters;
  $("#entryNote").value = state.entry.note;
  $("#entryTitle").textContent = editing ? "编辑这笔" : "记一笔";
  $("#entryDateText").textContent = state.entry.date === todayISO
    ? `今天 · ${Number(todayISO.slice(5, 7))} 月 ${Number(todayISO.slice(8, 10))} 日`
    : dateText(state.entry.date);
  $("#dateText").textContent = state.entry.date === todayISO ? "今天" : dateText(state.entry.date);
  renderAmount();
  syncFuelField();
  openSheet("entrySheet", trigger);
  setTimeout(() => { if (window.innerWidth > 520) $("#entryDate").blur(); }, 60);
}

/** 只有加油类别才显示加油量，并实时给出单价与本次油耗 */
function syncFuelField() {
  const field = $("#fuelField");
  const hint = $("#fuelHint");
  const isFuel = state.entry.cat === "fuel";
  field.hidden = !isFuel;
  hint.hidden = !isFuel;
  if (!isFuel) return;
  const amount = parseFloat(state.entry.amount) || 0;
  const liters = parseFloat(state.entry.liters) || 0;
  const bits = [];
  if (amount > 0 && liters > 0) bits.push(`单价 ¥${(amount / liters).toFixed(2)}/L`);
  if (liters > 0 && Number(state.entry.mileage) > 0) {
    const prev = previousFuelRecord(state.entry.date, state.entry.mileage, state.entry.editingId);
    if (prev) {
      const dist = Number(state.entry.mileage) - Number(prev.mileage);
      if (dist > 10) {
        const value = (liters / dist) * 100;
        if (value > 0 && value < 40) bits.push(`本次油耗 ${value.toFixed(1)} L/100km`);
      }
    }
  }
  hint.textContent = bits.length ? bits.join(" · ") : "填上加油量与里程，平均油耗才会越来越准";
  hint.classList.toggle("is-strong", bits.length > 0);
}

function previousFuelRecord(date, mileage, excludeId) {
  const km = Number(mileage) || 0;
  const pool = state.records.filter((r) => r.cat === "fuel" && Number(r.liters) > 0 && Number(r.mileage) > 0
    && r.id !== excludeId
    && (r.date < date || (r.date === date && Number(r.mileage) < km)));
  if (!pool.length) return null;
  return pool.sort((a, b) => Number(b.mileage) - Number(a.mileage))[0];
}

function renderAmount() {
  const s = state.entry.amount;
  const el = $("#amountNum");
  el.textContent = amountDisplay(s);
  el.classList.toggle("is-zero", s === "0" || s === "");
  syncFuelField();
}

function amountDisplay(s) {
  if (!s || s === "0") return "0";
  const [i, d] = s.split(".");
  const intPart = i.replace(/^0+(?=\d)/, "") || "0";
  const pretty = Number(intPart).toLocaleString("en-US");
  return d === undefined ? pretty : `${pretty}.${d}`;
}

function pressKey(k) {
  const e = state.entry;
  if (k === "del") {
    e.amount = e.amount.length > 1 ? e.amount.slice(0, -1) : "0";
    if (e.amount === "") e.amount = "0";
  } else if (k === ".") {
    if (!e.amount.includes(".")) e.amount = (e.amount === "0" ? "0" : e.amount) + ".";
  } else if (/^\d$/.test(k)) {
    const [i, d] = e.amount.split(".");
    if (d !== undefined && d.length >= 2) return;
    if (d === undefined && i.replace(/^0+/, "").length >= 7) return;
    if (e.amount === "0") e.amount = k;
    else e.amount += k;
  } else if (k === "ok") {
    saveEntry();
    return;
  }
  renderAmount();
}

function saveEntry() {
  const amount = parseFloat(state.entry.amount);
  if (!(amount > 0)) {
    const el = $(".amount-box");
    el.classList.remove("shake");
    void el.offsetWidth;
    el.classList.add("shake");
    toast("先输入金额吧", "warn");
    return;
  }
  const editingId = state.entry.editingId;
  const liters = parseFloat(state.entry.liters);
  const rec = {
    id: editingId || `r-${Date.now()}`,
    cat: state.entry.cat,
    amount: Math.round(amount * 100) / 100,
    date: state.entry.date || todayISO,
    mileage: state.entry.mileage ? Number(state.entry.mileage) : null,
    note: state.entry.note.trim(),
    liters: state.entry.cat === "fuel" && liters > 0 ? Math.round(liters * 100) / 100 : null,
  };
  if (editingId) {
    const index = state.records.findIndex((r) => r.id === editingId);
    if (index >= 0) state.records[index] = rec;
    else state.records.push(rec);
  } else {
    state.records.push(rec);
  }
  closeSheet("entrySheet");
  dataChanged();
  toast(editingId ? "已更新这笔记录" : `已记一笔 ¥${amountLabel(rec.amount)} · ${CATS[rec.cat].name}`);
  if (state.page === "home") $("#recentList .rec")?.classList.add("is-fresh");
}

/* ---------- 记录详情 ---------- */
function openRecord(id, trigger) {
  const r = state.records.find((x) => x.id === id);
  if (!r) return;
  state.activeRecord = id;
  const c = CATS[r.cat] || CATS.other;
  const rows = [
    ["类别", `${c.name}`],
    ["日期", dayLabel(r.date)],
    ["里程", r.mileage ? `${money(r.mileage)} km` : "未记录"],
  ];
  if (r.liters) {
    rows.push(["加油量", `${Number(r.liters).toFixed(1)} L`]);
    rows.push(["单价", `¥${(r.amount / r.liters).toFixed(2)}/L`]);
  }
  rows.push(["备注", r.note || "无"]);
  $("#recordBody").innerHTML = `
    <div class="rec-detail__top">
      <div class="rec-detail__ic" style="background:${c.grad}">
        <svg class="ico"><use href="${c.icon}"></use></svg>
      </div>
      <div>
        <div class="rec-detail__amt"><small>¥</small>${amountLabel(r.amount)}</div>
        <div class="rec-detail__cat">${c.name}支出</div>
      </div>
    </div>
    <div class="rec-detail__rows">
      ${rows.map(([k, v]) => `<div class="rec-detail__row"><span>${k}</span><b>${escapeHtml(v)}</b></div>`).join("")}
    </div>
    <div class="rec-detail__acts">
      <button class="btn-soft" id="editRecord">
        <svg class="ico" style="width:15px;height:15px"><use href="#i-edit"></use></svg>
        编辑
      </button>
      <button class="danger-btn" id="deleteRecord">
        <svg class="ico" style="width:15px;height:15px"><use href="#i-trash"></use></svg>
        删除这笔记录
      </button>
    </div>`;
  openSheet("recordSheet", trigger);
}

function deleteActiveRecord() {
  if (!state.activeRecord) return;
  const id = state.activeRecord;
  askConfirm({
    title: "删除这笔记录？",
    body: "删除后首页、账单、统计和年度报告会一起重算，操作不可撤销。",
    okText: "删除",
    tone: "danger",
    icon: "#i-trash",
    onOk() {
      state.records = state.records.filter((r) => r.id !== id);
      state.activeRecord = null;
      closeSheet("recordSheet");
      dataChanged();
      toast("已删除这笔记录");
    },
  });
}

/* ---------- Toast ---------- */
let toastTimer;
function toast(text, tone) {
  const el = $("#toast");
  $("#toastText").textContent = text;
  el.classList.toggle("is-warn", tone === "warn");
  el.classList.add("is-on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-on"), 2200);
}

/* ---------- 导出 ---------- */
function buildCsvText() {
  const rows = [["日期", "类别", "金额", "里程(km)", "加油量(L)", "备注"]];
  [...state.records]
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach((r) => rows.push([
      r.date, CATS[r.cat].name, r.amount, r.mileage || "", r.liters || "", r.note || "",
    ]));
  return "\ufeff" + rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
}

function base64FromText(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function shareExport(url, title) {
  const Share = window.Capacitor?.Plugins?.Share;
  if (!Share || !url) {
    toast("当前环境不支持分享", "warn");
    return;
  }
  try {
    await Share.share({ title, text: "养车有谱 · 账本", url, dialogTitle: "分享账本" });
  } catch (e) {
    toast("已取消分享");
  }
}

async function exportCsv() {
  const csv = buildCsvText();
  const fileName = `养车有谱-账本-${todayISO}.csv`;
  const Saver = window.Capacitor?.Plugins?.FileSaver;

  if (Saver) {
    try {
      const res = await Saver.saveCsv({ filename: fileName, data: base64FromText(csv) });
      askConfirm({
        title: "账本已导出",
        body: `已保存到「${res.path}」，可在文件管理的“下载”里找到。点「分享文件」还能发到微信或存进网盘。`,
        okText: "分享文件",
        cancelText: "知道了",
        icon: "#i-export",
        onOk: () => shareExport(res.shareUri, fileName),
      });
      return;
    } catch (err) {
      toast(err?.message || "导出失败，请重试", "warn");
      return;
    }
  }

  try {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`已保存到浏览器下载目录 · ${fileName}`);
  } catch (e) {
    toast("当前环境不支持下载", "warn");
  }
}

/* ---------- 导入 ---------- */
const CAT_BY_NAME = Object.fromEntries(Object.entries(CATS).map(([key, value]) => [value.name, key]));

function normalizeHeader(text) {
  return String(text || "").trim().toLowerCase()
    .replace(/[（]/g, "(").replace(/[）]/g, ")")
    .replace(/\s+/g, "");
}

function resolveCat(value) {
  const raw = String(value || "").trim();
  if (CATS[raw]) return raw;
  if (CAT_BY_NAME[raw]) return CAT_BY_NAME[raw];
  const stripped = raw.replace(/(支出|费用|费)$/g, "");
  if (CAT_BY_NAME[stripped]) return CAT_BY_NAME[stripped];
  return "other";
}

function normalizeDate(value) {
  const m = String(value || "").match(/(\d{4})\s*[-/.年]\s*(\d{1,2})\s*[-/.月]\s*(\d{1,2})/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

function numberFrom(value) {
  const cleaned = String(value == null ? "" : value).replace(/[¥￥,\s元km公里L升]/gi, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseCsvRows(text) {
  const source = String(text || "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (quoted) {
      if (ch === '"') {
        if (source[i + 1] === '"') { cell += '"'; i += 1; }
        else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (ch !== "\r") cell += ch;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}

function normalizeRecord(raw, index) {
  if (!raw || typeof raw !== "object") return null;
  const date = normalizeDate(raw.date);
  const amount = numberFrom(raw.amount);
  if (!date || !(amount > 0)) return null;
  const liters = numberFrom(raw.liters);
  const mileage = numberFrom(raw.mileage);
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : `imp-${Date.now()}-${index}`,
    cat: resolveCat(raw.cat),
    amount: Math.round(amount * 100) / 100,
    date,
    mileage: mileage > 0 ? mileage : null,
    note: String(raw.note || "").slice(0, 60),
    liters: liters > 0 ? Math.round(liters * 100) / 100 : null,
  };
}

function parseCsvRecords(text) {
  const rows = parseCsvRows(text);
  if (!rows.length) throw new Error("文件是空的");
  const aliases = {
    date: ["日期", "date"],
    cat: ["类别", "分类", "category", "cat"],
    amount: ["金额", "支出", "amount"],
    mileage: ["里程km", "里程", "mileage", "km"],
    liters: ["加油量l", "加油量", "liters", "升数"],
    note: ["备注", "note", "memo"],
  };
  let headerIndex = -1;
  for (let i = 0; i < Math.min(rows.length, 5); i += 1) {
    const cells = rows[i].map(normalizeHeader);
    if (cells.some((c) => aliases.date.includes(c)) && cells.some((c) => aliases.amount.includes(c))) {
      headerIndex = i;
      break;
    }
  }
  const map = { date: 0, cat: 1, amount: 2, mileage: 3, liters: 4, note: 5 };
  let body = rows;
  if (headerIndex >= 0) {
    const header = rows[headerIndex].map(normalizeHeader);
    Object.keys(aliases).forEach((key) => {
      const found = header.findIndex((cell) => aliases[key].includes(cell));
      if (found >= 0) map[key] = found;
    });
    body = rows.slice(headerIndex + 1);
  }
  const records = [];
  body.forEach((row, index) => {
    const rec = normalizeRecord({
      date: row[map.date],
      cat: row[map.cat],
      amount: row[map.amount],
      mileage: row[map.mileage],
      liters: row[map.liters],
      note: row[map.note],
    }, index);
    if (rec) records.push(rec);
  });
  if (!records.length) throw new Error("没有解析到有效记录，请检查日期与金额列");
  return records;
}

function parseBackupJson(text) {
  const data = JSON.parse(text);
  if (Array.isArray(data)) return { records: data, vehicle: null };
  if (data && Array.isArray(data.records)) return { records: data.records, vehicle: data.vehicle || null };
  throw new Error("不是养车有谱的备份文件");
}

function recordSignature(r) {
  return [r.date, r.cat, Number(r.amount).toFixed(2), Number(r.mileage) || "", String(r.note || "").trim(), Number(r.liters) || ""].join("|");
}

function mergeRecords(incoming) {
  const seen = new Set(state.records.map(recordSignature));
  const next = [...state.records];
  let added = 0;
  let skipped = 0;
  incoming.forEach((raw, index) => {
    const rec = normalizeRecord(raw, index);
    if (!rec) { skipped += 1; return; }
    const key = recordSignature(rec);
    if (seen.has(key)) { skipped += 1; return; }
    seen.add(key);
    next.push(rec);
    added += 1;
  });
  if (added) {
    state.records = next;
    dataChanged();
  }
  return { added, skipped };
}

async function readTextFile(file) {
  const buffer = await file.arrayBuffer();
  let text = new TextDecoder("utf-8").decode(buffer);
  if (text.includes("\uFFFD")) {
    try { text = new TextDecoder("gbk").decode(buffer); } catch (e) { /* keep utf-8 */ }
  }
  return text;
}

function triggerImport() {
  const input = $("#importFile");
  input.value = "";
  input.click();
}

async function handleImportFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  try {
    const text = await readTextFile(file);
    const isJson = /\.json$/i.test(file.name) || /^\s*[{[]/.test(text);
    const parsed = isJson ? parseBackupJson(text) : { records: parseCsvRecords(text), vehicle: null };
    const valid = parsed.records.map(normalizeRecord).filter(Boolean);
    if (!valid.length) throw new Error("没有找到可导入的记录");
    const existing = new Set(state.records.map(recordSignature));
    const fresh = valid.filter((r) => !existing.has(recordSignature(r)));
    const dup = valid.length - fresh.length;
    if (!fresh.length) {
      toast("这些记录账本里都有了");
      return;
    }
    askConfirm({
      title: `导入 ${fresh.length} 笔记录？`,
      body: `来自「${file.name}」${dup ? `，另有 ${dup} 笔重复将跳过` : ""}。现有账本会保留，导入后统计自动重算。`,
      okText: "导入",
      icon: "#i-download",
      onOk() {
        const result = mergeRecords(fresh);
        toast(`已导入 ${result.added} 笔${result.skipped ? `，跳过 ${result.skipped} 笔` : ""}`);
      },
    });
  } catch (err) {
    toast(err.message || "文件解析失败", "warn");
  }
}

/* ---------- 通用确认 ---------- */
let confirmAction = null;
function askConfirm(options) {
  const opts = options || {};
  $("#cfTitle").textContent = opts.title || "确认操作";
  $("#cfBody").textContent = opts.body || "";
  $("#cfOk").textContent = opts.okText || "确定";
  $("#cfCancel").textContent = opts.cancelText || "取消";
  $("#cfOk").className = opts.tone === "danger" ? "btn-danger" : "btn-primary";
  $("#cfIcon").className = "confirm__ic" + (opts.tone === "danger" ? " confirm__ic--danger" : "");
  $("#cfIcon").innerHTML = `<svg class="ico"><use href="${opts.icon || "#i-info"}"></use></svg>`;
  confirmAction = typeof opts.onOk === "function" ? opts.onOk : null;
  openSheet("confirmSheet");
}

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

/* ---------- 消息中心 ---------- */
function formatMonth(value) {
  if (!/^\d{4}-\d{2}$/.test(value || "")) return "未设置";
  const [y, m] = value.split("-").map(Number);
  return `${y} 年 ${m} 月`;
}

function buildNotifications() {
  const items = [];
  const service = serviceState();
  if (service.due) {
    items.push({
      icon: "#i-wrench",
      tone: "orange",
      title: service.remaining <= 0 ? "该安排保养了" : "快到保养里程了",
      body: service.remaining <= 0
        ? `账本里程 ${money(latestMileage())} km，已到建议保养点 ${money(service.next)} km。`
        : `距下次保养只剩 ${money(service.remaining)} km，可以提前预约。`,
      time: "今天",
    });
  }

  const key = todayISO.slice(0, 7);
  const current = monthRecords(key);
  const currentTotal = sum(current);
  const previousTotal = sum(monthRecords(shiftMonth(key, -1)));
  if (current.length) {
    const diff = previousTotal ? Math.round(((currentTotal - previousTotal) / previousTotal) * 100) : null;
    items.push({
      icon: "#i-chart",
      tone: "green",
      title: "本月账本已更新",
      body: diff === null
        ? `本月记了 ${current.length} 笔，支出 ¥${money(currentTotal)}。`
        : `本月支出 ¥${money(currentTotal)}，环比上月 ${diff >= 0 ? "+" : ""}${diff}%，共 ${current.length} 笔。`,
      time: `${Number(key.slice(5, 7))} 月`,
    });
  }

  const left = insuranceMonths();
  if (left !== null && left <= 3) {
    items.push({
      icon: "#i-shield",
      tone: "blue",
      title: left < 0 ? "保险已过期" : "保险即将到期",
      body: `保险到期时间 ${formatMonth(state.vehicle.insurance)}，可提前 60 天续保。`,
      time: "提醒",
    });
  }

  const af = avgFuel();
  if (af) {
    items.push({
      icon: "#i-fuel",
      tone: "orange",
      title: `平均油耗 ${af.toFixed(1)} L/100km`,
      body: `按最近两次带加油量的记录折算，累计油费 ¥${money(sum(state.records.filter((r) => r.cat === "fuel")))}。`,
      time: "数据",
    });
  }

  if (!items.length) {
    items.push({
      icon: "#i-note",
      tone: "green",
      title: "还没有提醒",
      body: "记几笔账并填上里程，保养、油耗和保险提醒会自动出现。",
      time: "提示",
    });
  }
  return items;
}

function renderNotifications() {
  const items = buildNotifications();
  $("#notifyList").innerHTML = items.map((n) => `
    <div class="notify">
      <span class="notify__ic notify__ic--${n.tone}"><svg class="ico"><use href="${n.icon}"></use></svg></span>
      <span class="notify__main"><b>${escapeHtml(n.title)}</b><p>${escapeHtml(n.body)}</p></span>
      <span class="notify__time">${escapeHtml(n.time)}</span>
    </div>`).join("");
  const dot = $(".bell__dot");
  if (dot) dot.style.display = state.settings.notifyReadAt === todayISO ? "none" : "";
}

/* ---------- 车辆信息编辑 ---------- */
function openCarEdit(trigger) {
  const v = state.vehicle;
  carDraft = currentStyle();
  renderStylePicker();
  $("#vfName").value = v.name || "";
  $("#vfOwner").value = v.owner || "";
  $("#vfModel").value = v.model || "";
  $("#vfPlate").value = v.plate || "";
  $("#vfRegistered").value = v.registered || "";
  $("#vfInsurance").value = v.insurance || "";
  $("#vfInterval").value = v.serviceInterval || "";
  $("#vfBase").value = v.serviceBase || "";
  $("#vfMileage").value = v.mileage || latestMileage() || "";
  openSheet("carEditSheet", trigger);
}

function saveCarEdit() {
  state.vehicle = {
    name: $("#vfName").value.trim() || "我的车",
    owner: $("#vfOwner").value.trim() || "我的车库",
    model: $("#vfModel").value.trim() || "燃油汽车",
    plate: $("#vfPlate").value.trim(),
    registered: $("#vfRegistered").value || "",
    insurance: $("#vfInsurance").value || "",
    serviceInterval: Math.max(0, Number($("#vfInterval").value) || 0),
    serviceBase: Math.max(0, Number($("#vfBase").value) || 0),
    mileage: Math.max(0, Number($("#vfMileage").value) || 0),
    style: { body: carDraft.body, paint: carDraft.paint },
  };
  persistVehicle();
  renderAll();
  closeSheet("carEditSheet");
  toast(`车辆信息已更新 · 当前里程 ${money(latestMileage())} km`);
}

/* ---------- 关于 / 隐私 ---------- */
function openInfo(kind) {
  const isPrivacy = kind === "privacy";
  $("#infoTitle").textContent = isPrivacy ? "隐私与数据" : "关于养车有谱";
  $("#infoSub").textContent = isPrivacy ? "数据只属于你" : `v${APP_VERSION} · 本地优先`;
  const versionLabel = `v${APP_VERSION}`;
  for (const id of ["#aboutVersion", "#settingsVersion"]) {
    const node = $(id);
    if (node) node.textContent = versionLabel;
  }
  const foot = $("#footVersion");
  if (foot) foot.textContent = `养车有谱 ${versionLabel} · 本地优先，云端可选`;
  $("#infoBody").innerHTML = isPrivacy
    ? `<h3>账本存在哪里</h3>
       <p>所有记账数据、车辆信息和设置都保存在本机的应用存储里，没有账号体系，也不会上传到任何服务器。</p>
       <h3>什么时候会联网</h3>
       <p>只有你主动使用「WebDAV 云备份」时，App 才会连接你填写的服务器，上传或下载账本文件。服务器地址、账号都由你决定，密码只保存在本机，且不会写进备份文件。</p>
       <h3>你的控制权</h3>
       <p>随时可以「导出账本」得到 CSV，或在 WebDAV 页面备份一份 JSON；也可以清空全部账本。卸载应用会同时删除本机数据，建议先备份。</p>
       <h3>权限</h3>
       <p>应用只申请网络权限，用于 WebDAV 备份；不读取通讯录、位置、相册或短信。</p>`
    : `<h3>这一版做了什么</h3>
       <p>补齐了加油量录入与真实油耗、车辆档案编辑、记录修改、CSV / JSON 导入，以及基于账本实时计算的消息提醒；新增 WebDAV 云备份与恢复，账本可以存到自己的网盘或 NAS。</p>
       <h3>数据口径</h3>
       <p><b>平均油耗</b>用连续加满法：最近两次同时有加油量与里程的记录，用当次加油量 ÷ 两次里程差 × 100。记录不足时显示「--」。</p>
       <p><b>单公里成本</b>是账本总支出 ÷ 有效里程跨度，里程跨度小于 50 km 时不计算。</p>
       <p><b>保养提醒</b>按「上次保养里程 + 保养间隔」计算；没填上次保养里程时，自动取账本里最近一条保养或维修记录的里程。</p>
       <h3>说明</h3>
       <p>应用离线可用，图表与年度报告都由本机数据实时计算。示例账本仅用于演示，可在「我的」里一键恢复。</p>
       <p class="info-foot">养车有谱 · 花钱有谱，养车不慌</p>`;
  openSheet("infoSheet", document.activeElement);
}

/* ---------- WebDAV 云备份 ---------- */
let wdBusy = false;
let autoBackupTimer = 0;

function webdavConfig() {
  const w = state.settings.webdav;
  return {
    url: String(w.url || "").trim(),
    user: String(w.user || "").trim(),
    pass: String(w.pass || ""),
    dir: String(w.dir || "养车有谱").trim() || "养车有谱",
  };
}

function webdavConfigured() {
  const cfg = webdavConfig();
  return !!(cfg.url && cfg.user && cfg.pass);
}

function timeLabel(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad2 = (n) => String(n).padStart(2, "0");
  const hm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  return d.toDateString() === new Date().toDateString()
    ? `今天 ${hm}`
    : `${d.getMonth() + 1} 月 ${d.getDate()} 日 ${hm}`;
}

function webdavLabel() {
  const w = state.settings.webdav;
  if (!webdavConfigured()) return "未配置";
  if (w.lastError) return "连接异常";
  if (w.lastBackup) return `已备份 ${timeLabel(w.lastBackup)}`;
  return "待备份";
}

function refreshWebdavState() {
  const label = webdavLabel();
  $$("[data-webdav-state]").forEach((el) => { el.textContent = label; });
  const row = $("#webdavState");
  if (row) row.textContent = label;
}

function setWdStatus(text, tone) {
  const el = $("#wdStatus");
  if (!el) return;
  el.textContent = text;
  el.className = "wd-status" + (tone ? ` is-${tone}` : "");
}

function syncWebdavForm() {
  const w = state.settings.webdav;
  $("#wdUrl").value = w.url || "";
  $("#wdUser").value = w.user || "";
  $("#wdPass").value = w.pass || "";
  $("#wdDir").value = w.dir || "养车有谱";
  const auto = $("#wdAuto");
  auto.setAttribute("aria-checked", String(!!state.settings.autoBackup));
  auto.classList.toggle("is-on", !!state.settings.autoBackup);
  if (!webdavConfigured()) setWdStatus("未配置账号，填好后先测试连接");
  else if (w.lastError) setWdStatus(`上次出错：${w.lastError}`, "err");
  else if (w.lastBackup) setWdStatus(`最近备份：${timeLabel(w.lastBackup)}`, "ok");
  else setWdStatus("配置已就绪，可以备份或恢复", "ok");
}

function readWebdavForm() {
  /* 只有备份面板打开时才从输入框取值，后台自动备份不会覆盖已保存的配置 */
  if (!$("#webdavSheet").classList.contains("is-open")) return;
  const w = state.settings.webdav;
  w.url = $("#wdUrl").value.trim();
  w.user = $("#wdUser").value.trim();
  w.pass = $("#wdPass").value;
  w.dir = $("#wdDir").value.trim() || "养车有谱";
  persistSettings();
}

async function testWebdav(silent) {
  readWebdavForm();
  const cfg = webdavConfig();
  if (!cfg.url || !cfg.user || !cfg.pass) {
    setWdStatus("请先填写服务器、账号和密码", "err");
    if (!silent) toast("还缺服务器或账号信息", "warn");
    return false;
  }
  if (wdBusy) return false;
  wdBusy = true;
  setWdStatus("正在连接服务器…", "busy");
  try {
    await window.YCWebDAV.test(cfg);
    state.settings.webdav.lastError = null;
    persistSettings();
    const name = String(cfg.dir || "").replace(/^\/+|\/+$/g, "") || "/";
    // 通道标记：native 表示请求经原生 OkHttp 发出，web 表示退回浏览器 fetch（Android 上必失败）
    const lane = window.YCWebDAV.channel ? window.YCWebDAV.channel() : "web";
    setWdStatus(`连接成功 · 目录「${name}」可用${lane === "native" ? " · 原生通道" : ""}`, "ok");
    refreshWebdavState();
    if (!silent) toast("WebDAV 连接成功");
    return true;
  } catch (err) {
    const lane = window.YCWebDAV.channel ? window.YCWebDAV.channel() : "web";
    state.settings.webdav.lastError = err.message || "连接失败";
    persistSettings();
    setWdStatus(err.message || "连接失败", "err");
    refreshWebdavState();
    if (!silent) toast(lane === "native" ? "连接失败，请检查配置" : "连接失败：未启用原生通道", "warn");
    return false;
  } finally {
    wdBusy = false;
  }
}

function backupName() {
  const d = new Date();
  return `${BACKUP_PREFIX}${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.json`;
}

function buildBackupPayload() {
  const dates = state.records.map((r) => r.date).sort();
  return {
    app: "yangche-youpu",
    schema: 1,
    version: APP_VERSION,
    createdAt: new Date().toISOString(),
    vehicle: state.vehicle,
    summary: {
      count: state.records.length,
      total: Math.round(sum(state.records) * 100) / 100,
      from: dates[0] || null,
      to: dates[dates.length - 1] || null,
    },
    records: state.records,
  };
}

async function backupWebdav(silent) {
  readWebdavForm();
  if (!webdavConfigured()) {
    if (!silent) {
      setWdStatus("请先填写服务器、账号和密码", "err");
      toast("先配置 WebDAV 账号", "warn");
    }
    return false;
  }
  if (wdBusy) {
    if (!silent) toast("上一个请求还没完成");
    return false;
  }
  wdBusy = true;
  setWdStatus("正在上传账本…", "busy");
  const cfg = webdavConfig();
  try {
    await window.YCWebDAV.ensureDir(cfg);
    const name = backupName();
    await window.YCWebDAV.put(cfg, name, JSON.stringify(buildBackupPayload()));
    state.settings.webdav.lastBackup = new Date().toISOString();
    state.settings.webdav.lastError = null;
    persistSettings();
    setWdStatus(`已备份 ${state.records.length} 笔 · ${timeLabel(state.settings.webdav.lastBackup)}`, "ok");
    refreshWebdavState();
    if (!silent) toast("账本已备份到云端");
    try {
      const files = (await window.YCWebDAV.list(cfg)).filter((f) => f.name.startsWith(BACKUP_PREFIX));
      for (const old of files.slice(BACKUP_KEEP)) await window.YCWebDAV.remove(cfg, old.url);
      state.webdavFiles = files.slice(0, BACKUP_KEEP);
      renderWebdavList();
    } catch (e) { /* 清理失败不影响备份结果 */ }
    return true;
  } catch (err) {
    state.settings.webdav.lastError = err.message || "备份失败";
    persistSettings();
    setWdStatus(err.message || "备份失败", "err");
    refreshWebdavState();
    if (!silent) toast("备份失败，请检查配置", "warn");
    return false;
  } finally {
    wdBusy = false;
  }
}

function scheduleAutoBackup() {
  if (!state.settings.autoBackup || !webdavConfigured()) return;
  clearTimeout(autoBackupTimer);
  autoBackupTimer = setTimeout(() => { backupWebdav(true); }, 6000);
}

function backupFileLabel(file) {
  const m = String(file.name || "").match(/^yangche-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.json$/i);
  if (!m) return file.name;
  return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}`;
}

function sizeLabel(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function renderWebdavList() {
  const list = $("#wdList");
  const files = state.webdavFiles || [];
  if (!files.length) {
    list.innerHTML = `<div class="empty">云端还没有备份，点「立即备份」上传第一份</div>`;
    return;
  }
  list.innerHTML = files.map((file, index) => `
    <button class="wditem" data-wd-item="${index}">
      <span class="wditem__ic"><svg class="ico"><use href="#i-cloud"></use></svg></span>
      <span class="wditem__main">
        <b>${escapeHtml(backupFileLabel(file))}</b>
        <span>${escapeHtml(file.modified ? timeLabel(file.modified.toISOString()) : "")} · ${sizeLabel(file.size)}</span>
      </span>
      <span class="wditem__go">恢复</span>
    </button>`).join("");
}

async function loadWebdavList() {
  const list = $("#wdList");
  if (!webdavConfigured()) {
    list.innerHTML = `<div class="empty">先填好账号并测试连接</div>`;
    return;
  }
  list.innerHTML = `<div class="empty">正在读取云端目录…</div>`;
  try {
    const files = (await window.YCWebDAV.list(webdavConfig()))
      .filter((f) => f.name.startsWith(BACKUP_PREFIX));
    state.webdavFiles = files;
    renderWebdavList();
  } catch (err) {
    list.innerHTML = `<div class="empty is-err">${escapeHtml(err.message || "读取失败")}</div>`;
  }
}

function restoreWebdav(file) {
  if (!file) return;
  askConfirm({
    title: "用这份备份覆盖本机账本？",
    body: `${backupFileLabel(file)} · ${sizeLabel(file.size)}。本机现有 ${state.records.length} 笔记录会被替换，建议先备份一次。`,
    okText: "恢复",
    tone: "danger",
    icon: "#i-download",
    async onOk() {
      setWdStatus("正在下载备份…", "busy");
      try {
        const text = await window.YCWebDAV.getFile(webdavConfig(), file.url);
        const data = JSON.parse(text);
        const known = ["yangche-youpu", "yangche-youshu"];
        if (!data || !known.includes(data.app) || !Array.isArray(data.records)) {
          throw new Error("这不是养车有谱的备份文件");
        }
        state.records = data.records.map(normalizeRecord).filter(Boolean);
        if (data.vehicle && typeof data.vehicle === "object") {
          state.vehicle = { ...state.vehicle, ...data.vehicle };
          persistVehicle();
        }
        dataChanged();
        setWdStatus(`已恢复 ${state.records.length} 笔 · ${timeLabel(new Date().toISOString())}`, "ok");
        toast(`已从云端恢复 ${state.records.length} 笔`);
        closeSheet("webdavSheet");
      } catch (err) {
        setWdStatus(err.message || "恢复失败", "err");
        toast("恢复失败，请稍后再试", "warn");
      }
    },
  });
}

/* ---------- 事件 ---------- */
function bindGlassMotion(element, parallax = false) {
  let frame = 0;
  let pointerX = 0;
  let pointerY = 0;
  function paint() {
    frame = 0;
    const bounds = element.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const horizontal = Math.min(1, Math.max(0, (pointerX - bounds.left) / bounds.width));
    const vertical = Math.min(1, Math.max(0, (pointerY - bounds.top) / bounds.height));
    element.style.setProperty("--light-x", `${(horizontal * 100).toFixed(1)}%`);
    if (parallax) {
      element.style.setProperty("--scene-x", `${((horizontal - .5) * 12).toFixed(2)}px`);
      element.style.setProperty("--scene-y", `${((vertical - .5) * 7).toFixed(2)}px`);
    }
  }
  function track(event) {
    if (reducedMotion.matches || !event.isPrimary) return;
    pointerX = event.clientX; pointerY = event.clientY;
    if (!frame) frame = requestAnimationFrame(paint);
  }
  function reset() {
    cancelAnimationFrame(frame); frame = 0;
    ["--light-x", "--scene-x", "--scene-y"].forEach((key) => element.style.removeProperty(key));
  }
  element.addEventListener("pointerdown", track, { passive: true });
  element.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "touch") track(event);
  }, { passive: true });
  element.addEventListener("pointerleave", reset);
  element.addEventListener("pointercancel", reset);
  element.addEventListener("pointerup", (event) => { if (event.pointerType !== "mouse") reset(); });
  if (!parallax) {
    element.addEventListener("focusin", (event) => {
      if (!event.target.matches(":focus-visible")) return;
      const bounds = event.target.getBoundingClientRect();
      pointerX = bounds.left + bounds.width / 2;
      pointerY = bounds.top + bounds.height / 2;
      paint();
    });
    element.addEventListener("focusout", (event) => { if (!element.contains(event.relatedTarget)) reset(); });
  }
  reducedMotion.addEventListener("change", reset);
}

function bindGarage() {
  const garage = $("#garage");
  let onScreen = true;


  function updateVisibility() {
    garage.classList.toggle("is-scene-visible", onScreen && !document.hidden && state.page === "home" && !$("#app").classList.contains("has-sheet"));
  }

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      updateVisibility();
    });
    observer.observe(garage);
  }
  const visibilityChanges = new MutationObserver(() => {
    updateVisibility();
  });
  const classChanges = { attributes: true, attributeFilter: ["class"] };
  visibilityChanges.observe($("#app"), classChanges);
  visibilityChanges.observe($("#page-home"), classChanges);
  document.addEventListener("visibilitychange", updateVisibility);
  bindGlassMotion(garage, true);
}

function bindFlexibleFeedback() {
  let pressed;
  let frame = 0;
  let point;
  const selector = "button:not(:disabled, .tab, .fab)";

  function paint() {
    frame = 0;
    if (!pressed || !point) return;
    const { target, bounds } = pressed;
    const x = Math.min(100, Math.max(0, (point.clientX - bounds.left) / bounds.width * 100));
    const y = Math.min(100, Math.max(0, (point.clientY - bounds.top) / bounds.height * 100));
    target.style.setProperty("--press-x", `${x.toFixed(1)}%`);
    target.style.setProperty("--press-y", `${y.toFixed(1)}%`);
  }

  function reset(bounce = false) {
    const target = pressed?.target;
    if (target) {
      if (bounce === true && !reducedMotion.matches && !target.classList.contains("garage__open") && target.animate) {
        const computedScale = getComputedStyle(target).scale;
        target.animate([
          { scale: computedScale === "none" ? "1" : computedScale },
          { scale: ".987 1.019", offset: .47 },
          { scale: "1.004 .995", offset: .72 },
          { scale: "1" },
        ], { duration: 310, easing: "cubic-bezier(.17,.8,.34,1)" });
      }
      target.classList.remove("is-pressed");
    }
    pressed = null;
    point = null;
    cancelAnimationFrame(frame);
    frame = 0;
  }

  document.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    const target = event.target.closest(selector);
    if (!target) return;
    reset();
    pressed = { id: event.pointerId, target, bounds: target.getBoundingClientRect(), x: event.clientX, y: event.clientY };
    point = event;
    paint();
    target.classList.add("is-pressed");
  }, { passive: true });
  document.addEventListener("pointermove", (event) => {
    if (pressed?.id !== event.pointerId || reducedMotion.matches) return;
    if (event.pointerType === "touch" && Math.hypot(event.clientX-pressed.x,event.clientY-pressed.y) > 9) {
      reset();
      return;
    }
    point = event;
    if (!frame) frame = requestAnimationFrame(paint);
  }, { passive: true });
  for (const type of ["pointerup", "pointercancel"]) {
    document.addEventListener(type, (event) => { if (pressed?.id === event.pointerId) reset(type === "pointerup"); });
  }
  document.addEventListener("keydown", (event) => {
    if (event.repeat || ![" ", "Enter"].includes(event.key) || !event.target.matches(selector)) return;
    reset();
    pressed = { target: event.target };
    pressed.target.style.setProperty("--press-x", "50%");
    pressed.target.style.setProperty("--press-y", "50%");
    pressed.target.classList.add("is-pressed");
  });
  document.addEventListener("keyup", (event) => { if ([" ", "Enter"].includes(event.key) && pressed?.target === event.target) reset(true); });
  document.addEventListener("focusout", (event) => { if (pressed?.target === event.target && pressed.id === undefined) reset(); });
  window.addEventListener("blur", reset);
}
function bind() {
  bindGarage();
  bindDock();
  bindFlexibleFeedback();
  bindSheetGestures();
  $("#fab").addEventListener("click", (event) => openEntry(undefined, undefined, event.currentTarget));
  $("#bellBtn").addEventListener("click", (event) => {
    openSheet("notifySheet", event.currentTarget);
    const dot = $(".bell__dot");
    if (dot) dot.style.display = "none";
  });

  /* 设置与云备份 */
  $("#settingsBtn").addEventListener("click", (event) => openSheet("settingsSheet", event.currentTarget));
  $("#webdavRow").addEventListener("click", (event) => {
    syncWebdavForm();
    loadWebdavList();
    openSheet("webdavSheet", event.currentTarget);
  });
  $("#importRow").addEventListener("click", triggerImport);
  $("#settingsImport").addEventListener("click", triggerImport);
  $("#importFile").addEventListener("change", handleImportFile);
  $("#privacyRow").addEventListener("click", () => openInfo("privacy"));
  $("#aboutRow").addEventListener("click", () => openInfo("about"));
  $("#settingsPrivacy").addEventListener("click", () => {
    closeSheet("settingsSheet");
    setTimeout(() => openInfo("privacy"), 170);
  });
  $("#settingsAbout").addEventListener("click", () => {
    closeSheet("settingsSheet");
    setTimeout(() => openInfo("about"), 170);
  });
  $("#settingsClear").addEventListener("click", () => {
    askConfirm({
      title: "清空全部账本？",
      body: `将删除本机 ${state.records.length} 笔记录，车辆信息保留。建议先导出 CSV 或在 WebDAV 备份。`,
      okText: "清空",
      tone: "danger",
      icon: "#i-trash",
      onOk() {
        state.records = [];
        dataChanged();
        toast("账本已清空");
      },
    });
  });

  /* 车辆信息 */
  $("#carEditBtn").addEventListener("click", (event) => {
    const trigger = event.currentTarget;
    closeSheet("carSheet");
    setTimeout(() => openCarEdit(trigger), 160);
  });
  $("#vfSave").addEventListener("click", saveCarEdit);

  /* 车型与车漆选择 */
  $("#modelRow").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-body]");
    if (!btn) return;
    const key = btn.dataset.body;
    if (!YCCar.MODELS[key] || key === carDraft.body) return;
    carDraft.body = key;
    renderStylePicker();
    popStylePreview();
  });
  $("#paintRow").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-paint]");
    if (!btn) return;
    const key = btn.dataset.paint;
    if (!YCCar.PAINTS[key] || key === carDraft.paint) return;
    carDraft.paint = key;
    renderStylePicker();
    popStylePreview();
  });

  /* WebDAV */
  $("#wdTest").addEventListener("click", () => testWebdav(false));
  $("#wdBackup").addEventListener("click", async () => {
    const ok = await backupWebdav(false);
    if (ok) loadWebdavList();
  });
  $("#wdRefresh").addEventListener("click", () => loadWebdavList());
  $("#wdRestoreLatest").addEventListener("click", () => {
    const files = state.webdavFiles || [];
    if (!files.length) {
      toast("先刷新云端备份列表", "warn");
      loadWebdavList();
      return;
    }
    restoreWebdav(files[0]);
  });
  $("#wdAuto").addEventListener("click", () => {
    if (!webdavConfigured()) {
      setWdStatus("先填好账号并测试连接，再开启自动备份", "err");
      toast("还没配置 WebDAV", "warn");
      return;
    }
    state.settings.autoBackup = !state.settings.autoBackup;
    persistSettings();
    const auto = $("#wdAuto");
    auto.setAttribute("aria-checked", String(state.settings.autoBackup));
    auto.classList.toggle("is-on", state.settings.autoBackup);
    if (state.settings.autoBackup) {
      toast("已开启自动备份");
      backupWebdav(false);
    } else {
      toast("已关闭自动备份");
    }
  });
  $("#cfOk").addEventListener("click", () => {
    const action = confirmAction;
    confirmAction = null;
    closeSheet("confirmSheet");
    if (action) setTimeout(action, 60);
  });

  /* 全局委托 */
  document.addEventListener("click", (ev) => {
    const openEl = ev.target.closest("[data-open]");
    if (openEl) {
      ev.preventDefault();
      const id = openEl.dataset.open;
      const parentSheet = openEl.closest(".sheet-wrap");
      const stacked = parentSheet && parentSheet.classList.contains("is-open") && parentSheet.id !== id;
      const launch = () => {
        if (id === "entrySheet") { openEntry(undefined, undefined, openEl); return; }
        if (id === "webdavSheet") { syncWebdavForm(); loadWebdavList(); }
        openSheet(id, openEl);
      };
      if (stacked) {
        closeSheet(parentSheet.id);
        setTimeout(launch, 170);
      } else launch();
      return;
    }
    const closeEl = ev.target.closest("[data-close]");
    if (closeEl) { closeSheet(closeEl.dataset.close); return; }

    const gotoEl = ev.target.closest("[data-goto]");
    if (gotoEl) {
      if (gotoEl.dataset.filter) {
        state.filter = gotoEl.dataset.filter;
        dirtyPages.add("bills");
      }
      go(gotoEl.dataset.goto);
      return;
    }
    const quick = ev.target.closest("[data-quick]");
    if (quick) { openEntry(quick.dataset.quick, undefined, quick); return; }

    const rec = ev.target.closest("[data-rec]");
    if (rec) { openRecord(rec.dataset.rec, rec); return; }

    const cat = ev.target.closest("[data-cat]");
    if (cat) {
      state.entry.cat = cat.dataset.cat;
      $$(".cat").forEach((c) => c.classList.toggle("is-on", c.dataset.cat === state.entry.cat));
      syncFuelField();
      return;
    }

    const chip = ev.target.closest("[data-filter]");
    if (chip) {
      state.filter = chip.dataset.filter;
      renderBills();
      return;
    }

    if (ev.target.closest("#deleteRecord")) { deleteActiveRecord(); return; }

    if (ev.target.closest("#editRecord")) {
      const id = state.activeRecord;
      const trigger = ev.target.closest("#editRecord");
      closeSheet("recordSheet");
      if (id) setTimeout(() => openEntry(undefined, undefined, trigger, id), 120);
      return;
    }

    const wdItem = ev.target.closest("[data-wd-item]");
    if (wdItem) {
      const file = (state.webdavFiles || [])[Number(wdItem.dataset.wdItem)];
      restoreWebdav(file);
      return;
    }
  });

  /* 键盘 */
  $("#keypad").addEventListener("click", (ev) => {
    const key = ev.target.closest("[data-k]");
    if (key) pressKey(key.dataset.k);
  });

  /* 记账表单 */
  $("#entryDate").addEventListener("change", (e) => {
    state.entry.date = e.target.value || todayISO;
    const d = state.entry.date;
    const dayText = `${Number(d.slice(5, 7))} 月 ${Number(d.slice(8, 10))} 日`;
    $("#entryDateText").textContent = d === todayISO ? `今天 · ${dayText}` : dayText;
    $("#dateText").textContent = dateText(d);
    syncFuelField();
  });
  $("#entryMileage").addEventListener("input", (e) => { state.entry.mileage = e.target.value; syncFuelField(); });
  $("#entryLiters").addEventListener("input", (e) => { state.entry.liters = e.target.value; syncFuelField(); });
  $("#entryNote").addEventListener("input", (e) => { state.entry.note = e.target.value; });

  /* 月份切换 */
  $("#prevMonth").addEventListener("click", () => {
    state.month = shiftMonth(state.month, -1);
    refreshPages(["bills", "stats"]);
  });
  $("#nextMonth").addEventListener("click", () => {
    const next = shiftMonth(state.month, 1);
    const nowKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
    if (next > nowKey) { toast("已经是最新的一个月"); return; }
    state.month = next;
    refreshPages(["bills", "stats"]);
  });
  $("#monthReset").addEventListener("click", () => {
    state.month = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
    refreshPages(["bills", "stats"]);
  });
  $("#statPrev").addEventListener("click", () => {
    state.month = shiftMonth(state.month, -1);
    refreshPages(["bills", "stats"]);
  });
  $("#statNext").addEventListener("click", () => {
    const next = shiftMonth(state.month, 1);
    const nowKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
    if (next > nowKey) { toast("已经是最新的一个月"); return; }
    state.month = next;
    refreshPages(["bills", "stats"]);
  });

  /* 年度报告 */
  $("#openReport").addEventListener("click", () => { renderReport(); openReport(); });
  $("#reportClose").addEventListener("click", closeReport);
  $("#reportClose2").addEventListener("click", closeReport);
  $("#reportShare").addEventListener("click", shareReport);
  $("#reportShare2").addEventListener("click", shareReport);

  /* 其他 */
  $("#exportRow").addEventListener("click", exportCsv);
  let resetArmed = false;
  let resetTimer;
  $("#resetRow").addEventListener("click", () => {
    const v = $("#resetRow .setrow__v");
    if (!resetArmed) {
      resetArmed = true;
      v.textContent = "再点一次确认";
      v.style.color = "#d94a5f";
      resetTimer = setTimeout(() => {
        resetArmed = false;
        v.textContent = "演示用";
        v.style.color = "";
      }, 3000);
      return;
    }
    clearTimeout(resetTimer);
    resetArmed = false;
    v.textContent = "演示用";
    v.style.color = "";
    state.records = seedData();
    dataChanged();
    toast("已恢复示例数据");
  });

  /* 清空演示数据：只删 seed- 前缀，自己记的账目保留 */
  let clearArmed = false;
  let clearTimer;
  const restoreDemoLabel = () => {
    const el = $("#clearDemoRow .setrow__v");
    if (!el) return;
    el.removeAttribute("data-armed");
    el.style.color = "";
    const n = demoRecords().length;
    el.textContent = n ? `${n} 条` : "无";
  };
  $("#clearDemoRow").addEventListener("click", () => {
    const count = demoRecords().length;
    if (!count) {
      toast("当前没有演示数据");
      return;
    }
    const v = $("#clearDemoRow .setrow__v");
    if (!clearArmed) {
      clearArmed = true;
      v.textContent = "再点一次确认";
      v.style.color = "#d94a5f";
      v.setAttribute("data-armed", "1");
      clearTimer = setTimeout(() => {
        clearArmed = false;
        restoreDemoLabel();
      }, 3000);
      return;
    }
    clearTimeout(clearTimer);
    clearArmed = false;
    const kept = state.records.length - count;
    state.records = state.records.filter((r) => !isDemoRecord(r));
    dataChanged();
    restoreDemoLabel();
    toast(kept > 0 ? `已清空 ${count} 条演示记录，保留 ${kept} 条自己的` : `已清空 ${count} 条演示记录`);
  });
  $("#remindRow").addEventListener("click", () => toast($("#meCareTag").textContent));
  $("#filterBtn").addEventListener("click", () => {
    const order = ["all", ...CAT_ORDER.filter((c) => monthRecords(state.month).some((r) => r.cat === c))];
    const idx = order.indexOf(state.filter);
    state.filter = order[(idx + 1) % order.length] || "all";
    renderBills();
    toast(state.filter === "all" ? "显示全部类别" : `只看${CATS[state.filter].name}记录`);
  });

  /* 关闭 */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if ($("#yearReport").classList.contains("is-open")) { closeReport(); return; }
      closeAllSheets();
      return;
    }
    const sheetOpen = $("#entrySheet").classList.contains("is-open");
    if (!sheetOpen) return;
    const tag = (document.activeElement || {}).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (/^\d$/.test(e.key) || e.key === ".") {
      pressKey(e.key);
      if (document.activeElement.matches(".sheet__close")) $('[data-k="ok"]').focus({ preventScroll: true });
    }
    else if (e.key === "Backspace") { e.preventDefault(); pressKey("del"); }
    else if (e.key === "Enter" && tag !== "BUTTON") { e.preventDefault(); saveEntry(); }
  });

}
/* ---------- 独立运行（PWA / 原生）识别 ---------- */
function detectStandalone() {
  const nav = window.navigator;
  const standalone =
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    (window.matchMedia && window.matchMedia("(display-mode: fullscreen)").matches) ||
    nav.standalone === true ||
    location.protocol === "capacitor:" ||
    location.hostname === "localhost" && !!window.Capacitor ||
    /; wv\)/.test(nav.userAgent) && !!window.Capacitor;
  if (standalone || window.Capacitor) document.documentElement.classList.add("is-app");
}
detectStandalone();

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

/* ---------- Android 返回键 ---------- */
function bindBackButton() {
  const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (!App?.addListener) return;
  App.addListener("backButton", () => {
    if ($("#yearReport").classList.contains("is-open")) { closeReport(); return; }
    if ($$(".sheet-wrap.is-open").length) { closeAllSheets(); return; }
    if (state.page !== "home") { go("home"); return; }
    App.exitApp();
  });
}

/* 系统开启「减弱动态效果」时，暂停 SVG 内的车轮与风线动画 */
function respectReducedMotion() {
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const pauseAll = () => {
    $$(".carmodel").forEach((svg) => {
      if (typeof svg.pauseAnimations === "function") svg.pauseAnimations();
    });
  };
  pauseAll();
  new MutationObserver(pauseAll).observe(document.body, { childList: true, subtree: true });
}

/* 老 WebView 不认 overflow: clip 时，焦点滚动会把整个应用顶偏一屏，这里兜底拉回 */
function guardAppScroll() {
  const app = $("#app");
  if (!app) return;
  app.addEventListener("scroll", () => {
    if (app.scrollTop !== 0) app.scrollTop = 0;
  }, { passive: true });
}

/* ---------- 启动 ---------- */
function tickClock() {
  const d = new Date();
  $("#clock").textContent = `${d.getHours()}:${pad(d.getMinutes())}`;
}

load();
renderAll();
bind();
bindBackButton();
respectReducedMotion();
guardAppScroll();
syncWebdavForm();
renderNotifications();
tickClock();
setInterval(tickClock, 20000);
