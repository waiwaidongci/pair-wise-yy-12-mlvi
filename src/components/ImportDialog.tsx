import { useState } from "react";
import type { AppData, DuplicateMatch, ImportChoices } from "../store";
import { HOOVES } from "../store";

interface Props {
  imported: AppData;
  duplicates: DuplicateMatch[];
  fileName: string;
  onConfirm: (choices: ImportChoices) => void;
  onCancel: () => void;
}

export default function ImportDialog({ imported, duplicates, fileName, onConfirm, onCancel }: Props) {
  // 默认并入历史（旧备份并入现有档案），蹄铁师可逐匹改为保留现有记录
  const [choices, setChoices] = useState<ImportChoices>(() => {
    const init: ImportChoices = {};
    for (const d of duplicates) init[d.imported.code.trim().toLowerCase() || `name:${d.imported.name.trim().toLowerCase()}`] = true;
    return init;
  });

  const keyOf = (d: DuplicateMatch) =>
    d.imported.code.trim().toLowerCase() || `name:${d.imported.name.trim().toLowerCase()}`;

  const newHorses = imported.horses.filter(
    (h) => !duplicates.some((d) => keyOf(d) === (h.code.trim().toLowerCase() || `name:${h.name.trim().toLowerCase()}`))
  );

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal">
        <div className="heading">
          <div>
            <p>导入备份</p>
            <h2>{fileName}</h2>
          </div>
        </div>

        <div className="import-summary">
          <span>新马匹 <b>{newHorses.length}</b> 匹</span>
          <span>重复马匹 <b>{duplicates.length}</b> 匹</span>
          <span>检查记录 <b>{imported.inspections.length}</b> 条</span>
          <span>换蹄记录 <b>{imported.shoes.length}</b> 条</span>
        </div>

        {duplicates.length > 0 && (
          <>
            <p className="section-label">
              以下马匹与本机已有档案为同一匹马，请选择处理方式：
            </p>
            <div className="dup-list">
              {duplicates.map((d) => {
                const key = keyOf(d);
                const merge = choices[key];
                return (
                  <div className="dup-row" key={key}>
                    <div className="dup-info">
                      <b>{d.imported.code}</b>
                      <span>{d.imported.name}</span>
                      <em>
                        现有：{d.existing.code} {d.existing.name}
                      </em>
                    </div>
                    <div className="dup-options">
                      <label className={merge ? "dup-opt" : "dup-opt active"}>
                        <input
                          type="radio"
                          name={key}
                          checked={!merge}
                          onChange={() => setChoices((c) => ({ ...c, [key]: false }))}
                        />
                        保留现有记录
                        <small>跳过备份中该马匹及其全部记录</small>
                      </label>
                      <label className={merge ? "dup-opt active" : "dup-opt"}>
                        <input
                          type="radio"
                          name={key}
                          checked={merge}
                          onChange={() => setChoices((c) => ({ ...c, [key]: true }))}
                        />
                        并入历史
                        <small>旧检查、换蹄记录挂到现有档案下</small>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {duplicates.length === 0 && (
          <p className="import-allnew">备份中的马匹均为本机没有的档案，将全部作为新马匹导入。</p>
        )}

        <p className="import-hint">
          提示：导入前会自动保存当前数据快照，导入后可随时撤销。蹄位说明：{HOOVES.map((h) => h.short).join(" / ")}。
        </p>

        <div className="modal-actions">
          <button onClick={onCancel}>取消</button>
          <button className="primary" onClick={() => onConfirm(choices)}>确认导入</button>
        </div>
      </div>
    </div>
  );
}
