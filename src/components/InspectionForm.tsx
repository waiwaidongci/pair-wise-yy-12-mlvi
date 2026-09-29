import { useRef, useState } from "react";
import type { Condition, HoofKey, Inspection } from "../store";
import {
  CONDITION_META,
  HOOVES,
  addDays,
  compressImage,
  todayStr,
  uid,
} from "../store";

interface Props {
  horseId: string;
  horseName: string;
  defaultFarrier?: string;
  onSave: (inspection: Inspection) => void;
  onCancel: () => void;
}

type HoofFormState = Record<HoofKey, { condition: Condition; shape: string; wear: string; notes: string }>;

const inputStyle: React.CSSProperties = { minHeight: 38 };

export default function InspectionForm({ horseId, horseName, defaultFarrier, onSave, onCancel }: Props) {
  const [date, setDate] = useState(todayStr());
  const [farrier, setFarrier] = useState(defaultFarrier ?? "");
  const [gait, setGait] = useState("");
  const [gaitAbnormal, setGaitAbnormal] = useState(false);
  const [hooves, setHooves] = useState<HoofFormState>(() => ({
    LF: { condition: "good", shape: "", wear: "", notes: "" },
    RF: { condition: "good", shape: "", wear: "", notes: "" },
    LH: { condition: "good", shape: "", wear: "", notes: "" },
    RH: { condition: "good", shape: "", wear: "", notes: "" },
  }));
  const [nextReview, setNextReview] = useState(addDays(todayStr(), 14));
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [savingPhoto, setSavingPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const setHoof = (key: HoofKey, patch: Partial<HoofFormState[HoofKey]>) =>
    setHooves((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setSavingPhoto(true);
    try {
      const imgs: string[] = [];
      for (const f of Array.from(files)) {
        if (photos.length + imgs.length >= 4) break;
        if (!f.type.startsWith("image/")) continue;
        imgs.push(await compressImage(f));
      }
      setPhotos((p) => [...p, ...imgs].slice(0, 4));
    } catch {
      setError("照片处理失败，请换一张图片试试。");
    } finally {
      setSavingPhoto(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = () => {
    if (!date) return setError("请选择检查日期");
    const anyAbnormal = HOOVES.some((h) => hooves[h.key].condition === "abnormal");
    onSave({
      id: uid(),
      horseId,
      date,
      farrier: farrier.trim() || undefined,
      gait: gait.trim() || undefined,
      gaitAbnormal: gaitAbnormal || anyAbnormal,
      hooves: {
        LF: { ...hooves.LF },
        RF: { ...hooves.RF },
        LH: { ...hooves.LH },
        RH: { ...hooves.RH },
      },
      nextReviewDate: nextReview || undefined,
      photos,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal modal-wide">
        <div className="heading">
          <div>
            <p>新增蹄部检查</p>
            <h2>{horseName}</h2>
          </div>
          <button className="primary" onClick={submit}>保存检查</button>
        </div>
        {error && <p className="form-error">{error}</p>}

        <div className="field-grid">
          <label>
            <span>检查日期 *</span>
            <input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            <span>蹄铁师</span>
            <input style={inputStyle} value={farrier} onChange={(e) => setFarrier(e.target.value)} placeholder="检查人姓名" />
          </label>
        </div>

        <div className="gait-row">
          <label className="gait-input">
            <span>步态问题</span>
            <input
              style={inputStyle}
              value={gait}
              onChange={(e) => setGait(e.target.value)}
              placeholder="如：右前蹄跛行、转弯不稳"
            />
          </label>
          <button
            type="button"
            className={gaitAbnormal ? "abnormal-toggle on" : "abnormal-toggle"}
            onClick={() => setGaitAbnormal((v) => !v)}
          >
            {gaitAbnormal ? "✓ 异常步态标记" : "标记异常步态"}
          </button>
        </div>

        <p className="section-label">四蹄状况（左前 / 右前 / 左后 / 右后）</p>
        <div className="hoof-form-grid">
          {HOOVES.map(({ key, label }) => (
            <div className="hoof-form-card" key={key}>
              <h4>{label}</h4>
              <div className="condition-radios">
                {(Object.keys(CONDITION_META) as Condition[]).map((c) => (
                  <button
                    type="button"
                    key={c}
                    className={hooves[key].condition === c ? "cond-btn active" : "cond-btn"}
                    style={
                      hooves[key].condition === c
                        ? { background: CONDITION_META[c].bg, color: CONDITION_META[c].color, borderColor: CONDITION_META[c].color }
                        : undefined
                    }
                    onClick={() => setHoof(key, { condition: c })}
                  >
                    {CONDITION_META[c].label}
                  </button>
                ))}
              </div>
              <input
                style={{ ...inputStyle, marginTop: 8 }}
                value={hooves[key].shape}
                onChange={(e) => setHoof(key, { shape: e.target.value })}
                placeholder="蹄形评估（如：蹄壁倾斜正常）"
              />
              <input
                style={{ ...inputStyle, marginTop: 6 }}
                value={hooves[key].wear}
                onChange={(e) => setHoof(key, { wear: e.target.value })}
                placeholder="磨耗情况（如：外侧磨耗偏多）"
              />
              <input
                style={{ ...inputStyle, marginTop: 6 }}
                value={hooves[key].notes}
                onChange={(e) => setHoof(key, { notes: e.target.value })}
                placeholder="备注（裂纹、钉位等）"
              />
            </div>
          ))}
        </div>

        <div className="field-grid" style={{ marginTop: 14 }}>
          <label>
            <span>下次复查日期</span>
            <input type="date" style={inputStyle} value={nextReview} onChange={(e) => setNextReview(e.target.value)} />
          </label>
          <label>
            <span>整体备注</span>
            <input style={inputStyle} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="本次检查总结" />
          </label>
        </div>

        <p className="section-label">蹄部照片（最多 4 张，自动压缩）</p>
        <div className="photo-row">
          {photos.map((src, i) => (
            <div className="photo-thumb" key={i}>
              <img src={src} alt={`蹄部照片${i + 1}`} />
              <button type="button" className="photo-del" onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}>
                ×
              </button>
            </div>
          ))}
          {photos.length < 4 && (
            <button type="button" className="photo-add" onClick={() => fileRef.current?.click()} disabled={savingPhoto}>
              {savingPhoto ? "处理中…" : "＋ 添加照片"}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => onFiles(e.target.files)}
          />
        </div>

        <div className="modal-actions">
          <button onClick={onCancel}>取消</button>
          <button className="primary" onClick={submit}>保存检查</button>
        </div>
      </div>
    </div>
  );
}
