// 数据层：所有记录保存在当前浏览器 localStorage 中。
// 每次保存都通过 saveData 同步写入——localStorage.setItem 是同步操作，
// 返回即落盘，因此即使保存后立刻关页，已提交的内容也不会丢失。

export type HoofKey = "LF" | "RF" | "LH" | "RH";

export const HOOVES: { key: HoofKey; label: string; short: string }[] = [
  { key: "LF", label: "左前蹄", short: "左前" },
  { key: "RF", label: "右前蹄", short: "右前" },
  { key: "LH", label: "左后蹄", short: "左后" },
  { key: "RH", label: "右后蹄", short: "右后" },
];

export type Condition = "good" | "watch" | "abnormal";

export const CONDITION_META: Record<
  Condition,
  { label: string; score: number; color: string; bg: string }
> = {
  good: { label: "正常", score: 0, color: "#166534", bg: "#dcfce7" },
  watch: { label: "观察", score: 1, color: "#b45309", bg: "#fef3c7" },
  abnormal: { label: "异常", score: 2, color: "#b91c1c", bg: "#fee2e2" },
};

export type HorseStatus = "运动马" | "休养马";

export interface Horse {
  id: string;
  code: string; // 马匹编号
  name: string; // 马名
  breed?: string; // 品种
  color?: string; // 毛色
  gender?: string; // 性别
  birthDate?: string; // 出生日期
  owner?: string; // 马主
  status: HorseStatus;
  notes?: string; // 备注
  createdAt: string;
}

export interface HoofCheck {
  condition: Condition;
  shape?: string; // 蹄形评估
  wear?: string; // 磨耗情况
  notes?: string; // 备注
}

export interface Inspection {
  id: string;
  horseId: string;
  date: string; // 检查日期 YYYY-MM-DD
  farrier?: string; // 蹄铁师
  gait?: string; // 步态问题描述
  gaitAbnormal?: boolean; // 异常步态标记
  hooves: Record<HoofKey, HoofCheck>;
  nextReviewDate?: string; // 下次复查日期
  photos: string[]; // 照片（压缩后的 dataURL）
  notes?: string;
  createdAt: string;
}

export interface ShoeRecord {
  id: string;
  horseId: string;
  date: string; // 换蹄日期
  hooves: HoofKey[]; // 本次更换的蹄位
  shoeType: string; // 蹄铁类型
  nailPosition?: string; // 钉位
  pad?: string; // 蹄垫/护具
  nextReviewDate?: string; // 下次复查日期
  notes?: string;
  createdAt: string;
}

export interface AppData {
  version: number;
  horses: Horse[];
  inspections: Inspection[];
  shoes: ShoeRecord[];
  settings: { lastFarrier?: string };
}

const STORAGE_KEY = "farrier-records-v1";
export const PREIMPORT_KEY = "farrier-records-preimport-v1";

export function emptyData(): AppData {
  return { version: 1, horses: [], inspections: [], shoes: [], settings: {} };
}

export function uid(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  ).toUpperCase();
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return emptyData();
    return {
      version: 1,
      horses: Array.isArray(parsed.horses) ? parsed.horses : [],
      inspections: Array.isArray(parsed.inspections) ? parsed.inspections : [],
      shoes: Array.isArray(parsed.shoes) ? parsed.shoes : [],
      settings: parsed.settings ?? {},
    };
  } catch {
    return emptyData();
  }
}

// 同步持久化：调用返回后数据即已写入浏览器存储。
export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// 导入前快照，用于撤销导入。
export function savePreimportSnapshot(data: AppData): void {
  try {
    localStorage.setItem(PREIMPORT_KEY, JSON.stringify(data));
  } catch {
    /* 快照失败不阻断导入 */
  }
}

export function loadPreimportSnapshot(): AppData | null {
  try {
    const raw = localStorage.getItem(PREIMPORT_KEY);
    return raw ? (JSON.parse(raw) as AppData) : null;
  } catch {
    return null;
  }
}

export function clearPreimportSnapshot(): void {
  localStorage.removeItem(PREIMPORT_KEY);
}

// ---------- 选择器 ----------

export function horseInspections(data: AppData, horseId: string): Inspection[] {
  return data.inspections
    .filter((i) => i.horseId === horseId)
    .sort((a, b) =>
      a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)
    );
}

export function horseShoes(data: AppData, horseId: string): ShoeRecord[] {
  return data.shoes
    .filter((s) => s.horseId === horseId)
    .sort((a, b) =>
      a.date === b.date ? b.createdAt.localeCompare(a.createdAt) : b.date.localeCompare(a.date)
    );
}

export interface HoofDelta {
  current: Condition | null;
  previous: Condition | null;
  delta: "up" | "down" | "same" | "first" | "none";
}

// 逐蹄对比最近两次检查：up=改善 down=恶化 same=持平 first=首次记录 none=无记录
export function hoofChanges(data: AppData, horseId: string): Record<HoofKey, HoofDelta> {
  const list = horseInspections(data, horseId);
  const latest = list[0];
  const previous = list[1];
  const result = {} as Record<HoofKey, HoofDelta>;
  for (const { key } of HOOVES) {
    const current = latest?.hooves[key]?.condition ?? null;
    const prevCond = previous?.hooves[key]?.condition ?? null;
    let delta: HoofDelta["delta"] = "none";
    if (current && !prevCond) delta = "first";
    else if (current && prevCond) {
      const diff = CONDITION_META[prevCond].score - CONDITION_META[current].score;
      delta = diff > 0 ? "up" : diff < 0 ? "down" : "same";
    }
    result[key] = { current, previous: prevCond, delta };
  }
  return result;
}

export function horseWorstCondition(data: AppData, horseId: string): Condition | null {
  const changes = hoofChanges(data, horseId);
  let worst: Condition | null = null;
  for (const { key } of HOOVES) {
    const c = changes[key].current;
    if (c && (!worst || CONDITION_META[c].score > CONDITION_META[worst].score)) {
      worst = c;
    }
  }
  return worst;
}

export interface Reminder {
  horse: Horse;
  date: string;
  status: "overdue" | "soon" | "scheduled";
  source: "检查" | "换蹄";
}

// 复查提醒：取每匹马最近一次记录（检查/换蹄）约定的下次复查日期。
export function reminders(data: AppData): Reminder[] {
  const today = todayStr();
  const soon = addDays(today, 7);
  const list: Reminder[] = [];
  for (const horse of data.horses) {
    const insp = horseInspections(data, horse.id)[0];
    const shoe = horseShoes(data, horse.id)[0];
    const candidates: { date: string; source: "检查" | "换蹄" }[] = [];
    if (insp?.nextReviewDate) candidates.push({ date: insp.nextReviewDate, source: "检查" });
    if (shoe?.nextReviewDate) candidates.push({ date: shoe.nextReviewDate, source: "换蹄" });
    if (candidates.length === 0) continue;
    candidates.sort((a, b) => b.date.localeCompare(a.date));
    const { date, source } = candidates[0];
    let status: Reminder["status"] = "scheduled";
    if (date < today) status = "overdue";
    else if (date <= soon) status = "soon";
    list.push({ horse, date, status, source });
  }
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

export interface Stats {
  horseCount: number;
  reminderCount: number;
  abnormalCount: number;
  monthShoeCount: number;
}

export function computeStats(data: AppData): Stats {
  const monthPrefix = todayStr().slice(0, 7);
  let abnormalCount = 0;
  for (const horse of data.horses) {
    if (horseWorstCondition(data, horse.id) === "abnormal") abnormalCount++;
  }
  return {
    horseCount: data.horses.length,
    reminderCount: reminders(data).length,
    abnormalCount,
    monthShoeCount: data.shoes.filter((s) => s.date.startsWith(monthPrefix)).length,
  };
}

// ---------- 备份导入 ----------

export interface BackupFile {
  app: string;
  version: number;
  exportedAt: string;
  data: AppData;
}

export function exportBackup(data: AppData): void {
  const payload: BackupFile = {
    app: "farrier-records",
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `蹄铁记录备份_${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export interface DuplicateMatch {
  imported: Horse;
  existing: Horse;
}

export function parseBackup(
  text: string,
  current: AppData
): { data: AppData; duplicates: DuplicateMatch[] } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: "文件不是有效的 JSON，请确认是本系统导出的备份文件。" };
  }
  const raw = parsed as Partial<BackupFile>;
  if (!raw || raw.app !== "farrier-records" || !raw.data) {
    return { error: "无法识别该备份文件：缺少 farrier-records 标记。" };
  }
  const d = raw.data;
  if (!Array.isArray(d.horses) || !Array.isArray(d.inspections) || !Array.isArray(d.shoes)) {
    return { error: "备份内容不完整：缺少马匹、检查或换蹄记录。" };
  }
  const imported: AppData = {
    version: 1,
    horses: d.horses.filter((h) => h && typeof h.code === "string" && typeof h.name === "string"),
    inspections: d.inspections.filter((i) => i && typeof i.horseId === "string"),
    shoes: d.shoes.filter((s) => s && typeof s.horseId === "string"),
    settings: d.settings ?? {},
  };
  const duplicates: DuplicateMatch[] = [];
  for (const h of imported.horses) {
    const existing = findHorse(current, horseKey(h));
    if (existing) duplicates.push({ imported: h, existing });
  }
  return { data: imported, duplicates };
}

export function horseKey(h: Horse): string {
  const code = h.code.trim().toLowerCase();
  return code || `name:${h.name.trim().toLowerCase()}`;
}

function findHorse(data: AppData, key: string): Horse | undefined {
  return data.horses.find((h) => horseKey(h) === key);
}

export interface ImportChoices {
  // key: 重复马匹的 horseKey；true=并入历史，false=保留现有记录（跳过）
  [key: string]: boolean;
}

export interface ImportResult {
  data: AppData;
  addedHorses: number;
  mergedHorses: number;
  skippedHorses: number;
  addedInspections: number;
  addedShoes: number;
}

// 按用户选择合并备份：
//  - 新马匹：直接加入
//  - 重复马匹选「并入历史」：旧检查/换蹄记录挂到现有马匹档案下，并补全空档案字段
//  - 重复马匹选「保留现有记录」：该马匹及其全部旧记录跳过
export function mergeBackup(
  current: AppData,
  imported: AppData,
  choices: ImportChoices
): ImportResult {
  const next: AppData = {
    version: 1,
    horses: current.horses.map((h) => ({ ...h })),
    inspections: current.inspections.map((i) => ({ ...i, hooves: { ...i.hooves } })),
    shoes: current.shoes.map((s) => ({ ...s, hooves: [...s.hooves] })),
    settings: { ...current.settings },
  };

  const idMap = new Map<string, string>(); // 备份马匹 id -> 新/现有 id
  let addedHorses = 0;
  let mergedHorses = 0;
  let skippedHorses = 0;

  for (const h of imported.horses) {
    const key = horseKey(h);
    const existing = findHorse(next, key);
    if (existing) {
      if (choices[key]) {
        // 并入历史：记录挂到现有马匹，补全空字段
        idMap.set(h.id, existing.id);
        mergedHorses++;
        for (const field of ["breed", "color", "gender", "birthDate", "owner", "notes"] as const) {
          if (!existing[field] && h[field]) {
            (existing as Record<string, unknown>)[field] = h[field];
          }
        }
      } else {
        skippedHorses++;
      }
    } else {
      const newId = uid();
      idMap.set(h.id, newId);
      next.horses.push({ ...h, id: newId, status: h.status === "休养马" ? "休养马" : "运动马" });
      addedHorses++;
    }
  }

  let addedInspections = 0;
  let addedShoes = 0;
  for (const insp of imported.inspections) {
    const target = idMap.get(insp.horseId);
    if (!target) continue; // 属于被跳过的马匹
    next.inspections.push({
      ...insp,
      id: uid(),
      horseId: target,
      hooves: { ...insp.hooves },
      photos: [...(insp.photos ?? [])],
    });
    addedInspections++;
  }
  for (const shoe of imported.shoes) {
    const target = idMap.get(shoe.horseId);
    if (!target) continue;
    next.shoes.push({ ...shoe, id: uid(), horseId: target, hooves: [...(shoe.hooves ?? [])] });
    addedShoes++;
  }

  return { data: next, addedHorses, mergedHorses, skippedHorses, addedInspections, addedShoes };
}

// 示例数据：一匹运动马 + 两次检查（右前蹄异常→观察，体现蹄况改善）+ 一次换蹄记录。
export function seedDemoData(): AppData {
  const horseId = uid();
  const d1 = addDays(todayStr(), -42);
  const d2 = addDays(todayStr(), -7);
  return {
    version: 1,
    horses: [
      {
        id: horseId,
        code: "HORSE-18",
        name: "疾风",
        breed: "纯血马",
        color: "栗色",
        gender: "骟马",
        status: "运动马",
        owner: "马术俱乐部",
        createdAt: new Date().toISOString(),
      },
    ],
    inspections: [
      {
        id: uid(),
        horseId,
        date: d1,
        farrier: "张师傅",
        gait: "右前蹄轻微跛行",
        gaitAbnormal: true,
        hooves: {
          LF: { condition: "good", shape: "蹄壁倾斜正常", wear: "均衡" },
          RF: { condition: "abnormal", shape: "蹄壁略直", wear: "外侧磨耗偏多", notes: "外侧蹄壁有裂纹约 1cm" },
          LH: { condition: "good", shape: "正常", wear: "均衡" },
          RH: { condition: "good", shape: "正常", wear: "均衡" },
        },
        nextReviewDate: addDays(d1, 14),
        photos: [],
        notes: "建议削蹄调整外侧角度，2 周后复查。",
        createdAt: new Date(d1).toISOString(),
      },
      {
        id: uid(),
        horseId,
        date: d2,
        farrier: "张师傅",
        gait: "跛行消失",
        gaitAbnormal: false,
        hooves: {
          LF: { condition: "good", shape: "正常", wear: "均衡" },
          RF: { condition: "watch", shape: "蹄壁角度改善", wear: "外侧磨耗减少", notes: "裂纹已愈合，继续观察" },
          LH: { condition: "good", shape: "正常", wear: "均衡" },
          RH: { condition: "good", shape: "正常", wear: "均衡" },
        },
        nextReviewDate: addDays(todayStr(), 14),
        photos: [],
        notes: "蹄况明显改善，维持当前削蹄周期。",
        createdAt: new Date(d2).toISOString(),
      },
    ],
    shoes: [
      {
        id: uid(),
        horseId,
        date: addDays(d1, 1),
        hooves: ["LF", "RF", "LH", "RH"],
        shoeType: "铝蹄铁",
        nailPosition: "前蹄全钉，后蹄 4 钉",
        pad: "右前蹄加护蹄垫",
        nextReviewDate: addDays(d1, 42),
        notes: "右前蹄减轻钉位压力",
        createdAt: new Date(addDays(d1, 1)).toISOString(),
      },
    ],
    settings: { lastFarrier: "张师傅" },
  };
}

// 照片压缩：限制最大边长、JPEG 质量，避免撑爆 localStorage。
export function compressImage(file: File, maxSize = 480, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
