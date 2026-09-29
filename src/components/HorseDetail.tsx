import { useState } from "react";
import type { AppData, Horse, Inspection, ShoeRecord } from "../store";
import { CONDITION_META, HOOVES, hoofChanges, horseInspections, horseShoes } from "../store";

interface Props {
  data: AppData;
  horse: Horse;
  flashInspection?: Inspection | null;
  flashShoe?: ShoeRecord | null;
  onAddInspection: () => void;
  onAddShoe: () => void;
  onEdit: () => void;
}

const DELTA_TEXT: Record<string, string> = {
  up: "较上次改善",
  down: "较上次恶化",
  same: "与上次持平",
  first: "首次记录",
  none: "暂无检查",
};

export default function HorseDetail({
  data,
  horse,
  flashInspection,
  flashShoe,
  onAddInspection,
  onAddShoe,
  onEdit,
}: Props) {
  const [tab, setTab] = useState<"inspections" | "shoes">("inspections");
  const changes = hoofChanges(data, horse.id);
  const inspections = horseInspections(data, horse.id);
  const shoes = horseShoes(data, horse.id);
  const latest = inspections[0];

  const deltaOf = (key: string) => {
    const d = changes[key as keyof typeof changes];
    if (!d || d.delta === "none") return null;
    const color =
      d.delta === "up" ? "#166534" : d.delta === "down" ? "#b91c1c" : d.delta === "first" ? "#2563eb" : "#64748b";
    const arrow = d.delta === "up" ? "↑" : d.delta === "down" ? "↓" : d.delta === "same" ? "→" : "★";
    return (
      <span className="hoof-delta" style={{ color }}>
        {arrow} {DELTA_TEXT[d.delta]}
      </span>
    );
  };

  return (
    <div className="detail">
      <section className="panel detail-head">
        <div className="detail-title">
          <div>
            <p>马匹档案</p>
            <h2>
              {horse.code} <span className="detail-name">{horse.name}</span>
              <span className={horse.status === "运动马" ? "badge badge-active" : "badge badge-rest"}>
                {horse.status}
              </span>
            </h2>
            <p className="detail-meta">
              {[horse.gender, horse.breed, horse.color, horse.birthDate ? `出生 ${horse.birthDate}` : null, horse.owner ? `马主 ${horse.owner}` : null]
                .filter(Boolean)
                .join(" · ") || "暂无补充信息"}
            </p>
            {horse.notes && <p className="detail-notes">备注：{horse.notes}</p>}
          </div>
          <div className="detail-actions">
            <button className="primary" onClick={onAddInspection}>＋ 新增检查</button>
            <button onClick={onAddShoe}>更换蹄铁</button>
            <button onClick={onEdit}>编辑档案</button>
          </div>
        </div>
      </section>

      {flashInspection && (
        <section className="panel flash-banner">
          <strong>✓ 蹄部检查已保存</strong>
          <span>
            {flashInspection.date}
            {flashInspection.farrier ? ` · ${flashInspection.farrier}` : ""} · 与上次检查相比：
          </span>
          <div className="flash-hooves">
            {HOOVES.map(({ key, short }) => {
              const d = changes[key];
              return (
                <span key={key} className="flash-hoof">
                  {short} {deltaOf(key)}
                </span>
              );
            })}
          </div>
        </section>
      )}
      {flashShoe && (
        <section className="panel flash-banner flash-shoe">
          <strong>✓ 换蹄记录已保存</strong>
          <span>
            {flashShoe.date} · {flashShoe.hooves.map((h) => HOOVES.find((x) => x.key === h)?.short).join("、")} ·{" "}
            {flashShoe.shoeType}
            {flashShoe.nextReviewDate ? ` · 下次复查 ${flashShoe.nextReviewDate}` : ""}
          </span>
        </section>
      )}

      <section className="panel">
        <div className="heading">
          <div>
            <p>四蹄状况</p>
            <h2>蹄况总览</h2>
          </div>
          <span className="hoof-updated">
            {latest ? `最近检查：${latest.date}` : "尚未做过蹄部检查"}
          </span>
        </div>
        <div className="hoof-grid">
          {HOOVES.map(({ key, label }) => {
            const c = changes[key].current;
            const check = latest?.hooves[key];
            return (
              <div className="hoof-card" key={key} style={c ? { borderTopColor: CONDITION_META[c].color } : undefined}>
                <div className="hoof-card-head">
                  <b>{label}</b>
                  {c ? (
                    <span className="cond-pill" style={{ background: CONDITION_META[c].bg, color: CONDITION_META[c].color }}>
                      {CONDITION_META[c].label}
                    </span>
                  ) : (
                    <span className="cond-pill cond-none">无记录</span>
                  )}
                </div>
                {check ? (
                  <>
                    {check.shape && <p>蹄形：{check.shape}</p>}
                    {check.wear && <p>磨耗：{check.wear}</p>}
                    {check.notes && <p>备注：{check.notes}</p>}
                  </>
                ) : (
                  <p className="hoof-empty">暂无检查数据</p>
                )}
                <div className="hoof-card-delta">{deltaOf(key)}</div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="tabs">
          <button className={tab === "inspections" ? "tab active" : "tab"} onClick={() => setTab("inspections")}>
            检查记录 ({inspections.length})
          </button>
          <button className={tab === "shoes" ? "tab active" : "tab"} onClick={() => setTab("shoes")}>
            蹄铁历史 ({shoes.length})
          </button>
        </div>

        {tab === "inspections" ? (
          inspections.length === 0 ? (
            <p className="empty-hint">还没有检查记录，点击右上角「新增检查」开始。</p>
          ) : (
            <div className="timeline">
              {inspections.map((insp) => (
                <article key={insp.id} className="timeline-item">
                  <div className="timeline-dot" />
                  <div className="timeline-body">
                    <div className="timeline-head">
                      <b>{insp.date}</b>
                      {insp.farrier && <span>{insp.farrier}</span>}
                      {insp.gaitAbnormal && <span className="badge badge-gait">异常步态</span>}
                      {insp.nextReviewDate && <span className="badge badge-review">复查 {insp.nextReviewDate}</span>}
                    </div>
                    {insp.gait && <p className="timeline-gait">步态：{insp.gait}</p>}
                    <div className="timeline-hooves">
                      {HOOVES.map(({ key, short }) => {
                        const hc = insp.hooves[key];
                        return (
                          <span
                            key={key}
                            className="timeline-hoof"
                            style={{ background: CONDITION_META[hc.condition].bg, color: CONDITION_META[hc.condition].color }}
                          >
                            {short} {CONDITION_META[hc.condition].label}
                          </span>
                        );
                      })}
                    </div>
                    {(insp.hooves.LF.shape || insp.hooves.RF.shape || insp.hooves.LH.shape || insp.hooves.RH.shape) && (
                      <p className="timeline-note">
                        蹄形：
                        {HOOVES.map(({ key, short }) =>
                          insp.hooves[key].shape ? `${short} ${insp.hooves[key].shape}` : null
                        )
                          .filter(Boolean)
                          .join("；")}
                      </p>
                    )}
                    {insp.notes && <p className="timeline-note">备注：{insp.notes}</p>}
                    {insp.photos.length > 0 && (
                      <div className="photo-row">
                        {insp.photos.map((src, i) => (
                          <a key={i} href={src} target="_blank" rel="noreferrer">
                            <img src={src} alt={`蹄部照片${i + 1}`} />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )
        ) : shoes.length === 0 ? (
          <p className="empty-hint">还没有换蹄记录，点击「更换蹄铁」登记。</p>
        ) : (
          <div className="timeline">
            {shoes.map((shoe) => (
              <article key={shoe.id} className="timeline-item">
                <div className="timeline-dot dot-shoe" />
                <div className="timeline-body">
                  <div className="timeline-head">
                    <b>{shoe.date}</b>
                    <span className="badge badge-shoe">{shoe.shoeType}</span>
                    {shoe.nextReviewDate && <span className="badge badge-review">复查 {shoe.nextReviewDate}</span>}
                  </div>
                  <p className="timeline-gait">
                    更换蹄位：
                    {shoe.hooves.map((h) => HOOVES.find((x) => x.key === h)?.short).join("、")}
                  </p>
                    {shoe.nailPosition && <p className="timeline-note">钉位：{shoe.nailPosition}</p>}
                    {shoe.pad && <p className="timeline-note">蹄垫/护具：{shoe.pad}</p>}
                    {shoe.notes && <p className="timeline-note">备注：{shoe.notes}</p>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
