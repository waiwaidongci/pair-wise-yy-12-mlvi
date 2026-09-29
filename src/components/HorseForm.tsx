import { useState } from "react";
import type { Horse, HorseStatus } from "../store";
import { uid } from "../store";

interface Props {
  initial?: Horse;
  onSave: (horse: Horse) => void;
  onCancel: () => void;
}

const inputStyle: React.CSSProperties = { minHeight: 40 };

export default function HorseForm({ initial, onSave, onCancel }: Props) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [breed, setBreed] = useState(initial?.breed ?? "");
  const [color, setColor] = useState(initial?.color ?? "");
  const [gender, setGender] = useState(initial?.gender ?? "");
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? "");
  const [owner, setOwner] = useState(initial?.owner ?? "");
  const [status, setStatus] = useState<HorseStatus>(initial?.status ?? "运动马");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState("");

  const submit = () => {
    if (!code.trim()) return setError("请填写马匹编号");
    if (!name.trim()) return setError("请填写马名");
    onSave({
      id: initial?.id ?? uid(),
      code: code.trim(),
      name: name.trim(),
      breed: breed.trim() || undefined,
      color: color.trim() || undefined,
      gender: gender || undefined,
      birthDate: birthDate || undefined,
      owner: owner.trim() || undefined,
      status,
      notes: notes.trim() || undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    });
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal">
        <div className="heading">
          <div>
            <p>{initial ? "编辑档案" : "新增马匹"}</p>
            <h2>{initial ? initial.code : "马匹档案"}</h2>
          </div>
          <button className="primary" onClick={submit}>保存档案</button>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="field-grid">
          <label>
            <span>马匹编号 *</span>
            <input style={inputStyle} value={code} onChange={(e) => setCode(e.target.value)} placeholder="如 HORSE-32" />
          </label>
          <label>
            <span>马名 *</span>
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="如 疾风" />
          </label>
          <label>
            <span>品种</span>
            <input style={inputStyle} value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="如 纯血马" />
          </label>
          <label>
            <span>毛色</span>
            <input style={inputStyle} value={color} onChange={(e) => setColor(e.target.value)} placeholder="如 栗色" />
          </label>
          <label>
            <span>性别</span>
            <select style={inputStyle} value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">未填写</option>
              <option value="公马">公马</option>
              <option value="母马">母马</option>
              <option value="骟马">骟马</option>
            </select>
          </label>
          <label>
            <span>出生日期</span>
            <input type="date" style={inputStyle} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </label>
          <label>
            <span>马主</span>
            <input style={inputStyle} value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="马主姓名" />
          </label>
          <label>
            <span>状态</span>
            <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value as HorseStatus)}>
              <option value="运动马">运动马</option>
              <option value="休养马">休养马</option>
            </select>
          </label>
        </div>
        <label style={{ marginTop: 14 }}>
          <span>备注</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="习性、旧伤、注意事项等"
            rows={3}
          />
        </label>
        <div className="modal-actions">
          <button onClick={onCancel}>取消</button>
          <button className="primary" onClick={submit}>保存档案</button>
        </div>
      </div>
    </div>
  );
}
