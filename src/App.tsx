import { useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";
import {
  AppData,
  Horse,
  Inspection,
  Reminder,
  ShoeRecord,
  computeStats,
  exportBackup,
  loadData,
  mergeBackup,
  parseBackup,
  reminders,
  saveData,
  savePreimportSnapshot,
  clearPreimportSnapshot,
  seedDemoData,
  ImportChoices,
  ImportResult,
  DuplicateMatch,
  horseWorstCondition,
  CONDITION_META,
} from "./store";
import HorseForm from "./components/HorseForm";
import InspectionForm from "./components/InspectionForm";
import ShoeForm from "./components/ShoeForm";
import ImportDialog from "./components/ImportDialog";
import HorseDetail from "./components/HorseDetail";
import Reminders from "./components/Reminders";

type Modal =
  | { type: "horse"; horse?: Horse }
  | { type: "inspection"; horseId: string }
  | { type: "shoe"; horseId: string }
  | null;

interface PendingImport {
  data: AppData;
  duplicates: DuplicateMatch[];
  fileName: string;
}

type Filter = "all" | "abnormal" | "运动马" | "休养马";

export default function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [view, setView] = useState<"horses" | "reminders">("horses");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [modal, setModal] = useState<Modal>(null);
  const [flashInspection, setFlashInspection] = useState<Inspection | null>(null);
  const [flashShoe, setFlashShoe] = useState<ShoeRecord | null>(null);
  const [savedAt, setSavedAt] = useState<Date>(new Date());
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<AppData | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  // 同步落盘：setItem 返回即持久化，关页不丢已提交内容。
  const persist = (next: AppData) => {
    saveData(next);
    setData(next);
    setSavedAt(new Date());
  };

  // 兜底：页面隐藏/关闭前再冲刷一次（正常流程每次保存已同步写入）。
  useEffect(() => {
    const flush = () => saveData(dataRef.current);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
    return () => {
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  const stats = computeStats(data);
  const reminderMap = useMemo(() => {
    const m = new Map<string, Reminder>();
    for (const r of reminders(data)) m.set(r.horse.id, r);
    return m;
  }, [data]);

  const filteredHorses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.horses
      .filter((h) => {
        if (filter === "abnormal" && horseWorstCondition(data, h.id) !== "abnormal") return false;
        if (filter === "运动马" && h.status !== "运动马") return false;
        if (filter === "休养马" && h.status !== "休养马") return false;
        if (q && !h.code.toLowerCase().includes(q) && !h.name.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => a.code.localeCompare(b.code, "zh"));
  }, [data, search, filter]);

  const selected = data.horses.find((h) => h.id === selectedId) ?? null;

  // ---------- 示例数据 ----------

  const loadDemo = () => {
    const demo = seedDemoData();
    persist(demo);
    setSelectedId(demo.horses[0].id);
    setView("horses");
  };

  // ---------- 保存处理 ----------

  const handleSaveHorse = (horse: Horse) => {
    const exists = data.horses.some((h) => h.id === horse.id);
    const next: AppData = exists
      ? { ...data, horses: data.horses.map((h) => (h.id === horse.id ? horse : h)) }
      : { ...data, horses: [...data.horses, horse] };
    persist(next);
    setModal(null);
    setSelectedId(horse.id);
    setView("horses");
  };

  const handleSaveInspection = (insp: Inspection) => {
    const next: AppData = {
      ...data,
      inspections: [...data.inspections, insp],
      settings: { lastFarrier: insp.farrier ?? data.settings.lastFarrier },
    };
    try {
      persist(next);
    } catch (e) {
      alert("保存失败：浏览器存储空间不足，请删除部分照片后重试。");
      return;
    }
    setModal(null);
    setSelectedId(insp.horseId);
    setView("horses");
    setFlashShoe(null);
    setFlashInspection(insp);
  };

  const handleSaveShoe = (shoe: ShoeRecord) => {
    let next: AppData;
    try {
      next = { ...data, shoes: [...data.shoes, shoe] };
      persist(next);
    } catch {
      alert("保存失败：浏览器存储空间不足，请重试。");
      return;
    }
    setModal(null);
    setSelectedId(shoe.horseId);
    setView("horses");
    setFlashInspection(null);
    setFlashShoe(shoe);
  };

  // ---------- 备份 ----------

  const onPickFile = async (file: File) => {
    const text = await file.text();
    const result = parseBackup(text, data);
    if ("error" in result) {
      alert(result.error);
      return;
    }
    setPendingImport({ ...result, fileName: file.name });
  };

  const confirmImport = (choices: ImportChoices) => {
    if (!pendingImport) return;
    savePreimportSnapshot(data);
    const result = mergeBackup(data, pendingImport.data, choices);
    try {
      persist(result.data);
    } catch {
      alert("导入失败：浏览器存储空间不足。");
      return;
    }
    setUndoSnapshot(data);
    setImportResult(result);
    setPendingImport(null);
    if (selectedId && !result.data.horses.some((h) => h.id === selectedId)) setSelectedId(null);
  };

  const undoImport = () => {
    if (!undoSnapshot) return;
    persist(undoSnapshot);
    clearPreimportSnapshot();
    setUndoSnapshot(null);
    setImportResult(null);
  };

  // ---------- 渲染 ----------

  return (
    <main className="app">
      <header className="app-header">
        <div className="header-title">
          <p>蹄铁师工作台 · 数据保存在本机浏览器</p>
          <h1>马术蹄铁修整档案</h1>
        </div>
        <div className="header-actions">
          <span className="save-state">
            <span className="save-dot" />
            已保存 {savedAt.toLocaleTimeString("zh-CN")}
          </span>
          <button onClick={() => exportBackup(data)}>导出备份</button>
          <button className="primary" onClick={() => fileRef.current?.click()}>导入备份</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </header>

      <section className="metrics">
        <article
          className="metric-card metric-clickable"
          onClick={() => {
            setView("horses");
            setFilter("all");
          }}
        >
          <small>马匹档案</small>
          <strong>{stats.horseCount}</strong>
        </article>
        <article
          className="metric-card metric-clickable"
          onClick={() => setView("reminders")}
        >
          <small>待复查</small>
          <strong>{stats.reminderCount}</strong>
        </article>
        <article
          className="metric-card metric-clickable"
          onClick={() => {
            setView("horses");
            setFilter(filter === "abnormal" ? "all" : "abnormal");
          }}
        >
          <small>异常蹄况</small>
          <strong>{stats.abnormalCount}</strong>
        </article>
        <article className="metric-card">
          <small>本月换蹄</small>
          <strong>{stats.monthShoeCount}</strong>
        </article>
      </section>

      {view === "reminders" ? (
        <Reminders
          data={data}
          onSelectHorse={(id) => {
            setSelectedId(id);
            setView("horses");
            setFlashInspection(null);
            setFlashShoe(null);
          }}
          onRecord={(id) => setModal({ type: "inspection", horseId: id })}
        />
      ) : (
        <div className="workspace">
          <aside className="panel sidebar">
            <button
              className="primary sidebar-add"
              onClick={() => setModal({ type: "horse" })}
            >
              ＋ 新增马匹档案
            </button>
            <input
              className="sidebar-search"
              placeholder="搜索编号或马名"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="chips">
              {(["all", "abnormal", "运动马", "休养马"] as Filter[]).map((f) => (
                <button
                  key={f}
                  className={filter === f ? "chip active" : "chip"}
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "全部" : f === "abnormal" ? "异常蹄况" : f}
                </button>
              ))}
            </div>

            <div className="horse-list">
              {filteredHorses.length === 0 && (
                <p className="empty-hint">
                  {data.horses.length === 0
                    ? "还没有马匹档案，点击上方按钮新增第一匹马。"
                    : "没有符合条件的马匹。"}
                </p>
              )}
              {filteredHorses.map((h) => {
                const worst = horseWorstCondition(data, h.id);
                const reminder = reminderMap.get(h.id);
                return (
                  <button
                    key={h.id}
                    className={selectedId === h.id ? "horse-item active" : "horse-item"}
                    onClick={() => {
                      setSelectedId(h.id);
                      setFlashInspection(null);
                      setFlashShoe(null);
                    }}
                  >
                    <span className="horse-item-main">
                      <b>{h.code}</b>
                      <span>{h.name}</span>
                    </span>
                    <span className="horse-item-tags">
                      {worst && (
                        <span
                          className="cond-dot"
                          style={{ background: CONDITION_META[worst].color }}
                          title={`蹄况：${CONDITION_META[worst].label}`}
                        />
                      )}
                      <span className={h.status === "运动马" ? "tag tag-active" : "tag tag-rest"}>
                        {h.status}
                      </span>
                      {reminder && (
                        <span
                          className={
                            reminder.status === "overdue"
                              ? "tag tag-overdue"
                              : reminder.status === "soon"
                                ? "tag tag-soon"
                                : "tag"
                          }
                        >
                          {reminder.status === "overdue"
                            ? "已逾期"
                            : reminder.status === "soon"
                              ? "待复查"
                              : `复查 ${reminder.date.slice(5)}`}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="detail-wrap">
            {selected ? (
              <HorseDetail
                data={data}
                horse={selected}
                flashInspection={flashInspection}
                flashShoe={flashShoe}
                onAddInspection={() => setModal({ type: "inspection", horseId: selected.id })}
                onAddShoe={() => setModal({ type: "shoe", horseId: selected.id })}
                onEdit={() => setModal({ type: "horse", horse: selected })}
              />
            ) : (
              <section className="panel empty-detail">
                <h2>开始记录今天的修蹄工作</h2>
                <p>
                  从左侧选择一匹马查看档案与蹄况变化，或新增马匹档案。
                  所有检查、换蹄记录都保存在当前浏览器中，关页不丢失；换设备时可导出备份迁移。
                </p>
                <div className="empty-actions">
                  <button className="primary" onClick={() => setModal({ type: "horse" })}>
                    ＋ 新增马匹档案
                  </button>
                  {data.horses.length > 0 && (
                    <button onClick={() => fileRef.current?.click()}>导入旧备份</button>
                  )}
                  {data.horses.length === 0 && (
                    <button onClick={loadDemo}>先看看示例档案</button>
                  )}
                </div>
              </section>
            )}
          </section>
        </div>
      )}

      {modal?.type === "horse" && (
        <HorseForm
          initial={modal.horse}
          onSave={handleSaveHorse}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === "inspection" && (
        <InspectionForm
          horseId={modal.horseId}
          horseName={data.horses.find((h) => h.id === modal.horseId)?.name ?? ""}
          defaultFarrier={data.settings.lastFarrier}
          onSave={handleSaveInspection}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === "shoe" && (
        <ShoeForm
          horseId={modal.horseId}
          horseName={data.horses.find((h) => h.id === modal.horseId)?.name ?? ""}
          onSave={handleSaveShoe}
          onCancel={() => setModal(null)}
        />
      )}

      {pendingImport && (
        <ImportDialog
          imported={pendingImport.data}
          duplicates={pendingImport.duplicates}
          fileName={pendingImport.fileName}
          onConfirm={confirmImport}
          onCancel={() => setPendingImport(null)}
        />
      )}

      {importResult && (
        <div className="snackbar">
          <span>
            导入完成：新增马匹 {importResult.addedHorses} 匹，并入历史 {importResult.mergedHorses} 匹，
            保留现有 {importResult.skippedHorses} 匹；检查 {importResult.addedInspections} 条、换蹄{" "}
            {importResult.addedShoes} 条。
          </span>
          <button onClick={undoImport}>撤销导入</button>
          <button className="snackbar-close" onClick={() => setImportResult(null)}>×</button>
        </div>
      )}
    </main>
  );
}
