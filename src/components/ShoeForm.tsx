import { useState } from "react";
import type { HoofKey, ShoeRecord } from "../store";
import { HOOVES, addDays, todayStr, uid } from "../store";

interface Props {
  horseId: string;
  horseName: string;
  defaultFarrier?: string;
  onSave: (shoe: ShoeRecord) => void;
  onCancel: () => void;
}

const inputStyle: React.CSSProperties = { minHeight: 38 };
const SHOE_TYPES = ["铝蹄铁", "钢蹄铁", "塑胶蹄铁", "蹄铁+蹄垫", "其他"];

export default function ShoeForm({ horseId, horseName, onSave, onCancel }: Props) {
  const [date, setDate] = useState(todayStr());
  const [hooves, setHooves] = useState<HoofKey[]>(["LF", "RF", "LH", "RH"]);
  const [shoeType, setShoeType] = useState(SHOE_TYPES[0]);
  const [nailPosition, setNailPosition] = useState("");
  const [pad, setPad] = useState("");
  const [nextReview, setNextReview] = useState(addDays(todayStr(), 14));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const toggleHoof = (key: HoofKey) =>
    setHooves((prev) => (prev.includes(key) ? prev.filter((h) => h !== key) : [...prev, key]));

  const submit = () => {
    if (!date) return setError("请选择换蹄日期");
    if (hooves.length === 0) return setError("请选择本次更换的蹄位");
    onSave({
      id: uid(),
      horseId,
      date,
      hooves,
      shoeType: shoeType.trim() || "未填写",
      nailPosition: nailPosition.trim() || undefined,
      pad: pad.trim() || undefined,
      nextReviewDate: nextReview || undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal">
        <div className="heading">
          <div>
            <p>新增蹄铁更换</p>
            <h2>{horseName}</h2>
          </div>
          <button className="primary" onClick={submit}>保存换蹄</button>
        </div>
        {error && <p className="form-error">{error}</p>}

        <div className="field-grid">
          <label>
            <span>换蹄日期 *</span>
            <input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            <span>蹄铁类型</span>
            <select style={inputStyle} value={shoeType} onChange={(e) => setShoeType(e.target.value)}>
              {SHOE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>

        <p className="section-label">本次更换蹄位（点选切换）</p>
        <div className="hoof-picker">
          {HOOVES.map(({ key, short }) => (
            <button
              type="button"
              key={key}
              className={hooves.includes(key) ? "hoof-pick on" : "hoof-pick"}
              onClick={() => toggleHoof(key)}
            >
              {short}
            </button>
          ))}
        </div>

        <div className="field-grid" style={{ marginTop: 14 }}>
          <label>
            <span>钉位</span>
            <input style={inputStyle} value={nailPosition} onChange={(e) => setNailPosition(e.target.value)} placeholder="如：前蹄全钉、后蹄 4 钉" />
          </label>
          <label>
            <span>蹄垫 / 护具</span>
            <input style={inputStyle} value={pad} onChange={(e) => setPad(e.target.value)} placeholder="如：加护蹄垫" />
          </label>
          <label>
            <span>下次复查日期</span>
            <input type="date" style={inputStyle} value={nextReview} onChange={(e) => setNextReview(e.target.value)} />
          </label>
          <label>
            <span>备注</span>
            <input style={inputStyle} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="其他说明" />
          </label>
        </div>

        <div className="modal-actions">
          <button onClick={onCancel}>取消</button>
          <button className="primary" onClick={submit}>保存换蹄</button>
        </div>
      </div>
    </div>
  );
}
