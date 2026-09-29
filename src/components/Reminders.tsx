import type { AppData } from "../store";
import { reminders } from "../store";

interface Props {
  data: AppData;
  onSelectHorse: (horseId: string) => void;
  onRecord: (horseId: string) => void;
}

const STATUS_META = {
  overdue: { label: "已逾期", color: "#b91c1c", bg: "#fee2e2" },
  soon: { label: "7 天内", color: "#b45309", bg: "#fef3c7" },
  scheduled: { label: "已安排", color: "#166534", bg: "#dcfce7" },
} as const;

export default function Reminders({ data, onSelectHorse, onRecord }: Props) {
  const list = reminders(data);

  return (
    <section className="panel">
      <div className="heading">
        <div>
          <p>复查提醒</p>
          <h2>待复查马匹</h2>
        </div>
        <span className="hoof-updated">共 {list.length} 匹有复查安排</span>
      </div>

      {list.length === 0 ? (
        <p className="empty-hint">
          暂无复查安排。新增蹄部检查或换蹄记录时填写「下次复查日期」，就会自动出现在这里。
        </p>
      ) : (
        <div className="reminder-list">
          {list.map(({ horse, date, status, source }) => {
            const meta = STATUS_META[status];
            return (
              <article key={horse.id} className="reminder-item">
                <div className="reminder-main" onClick={() => onSelectHorse(horse.id)}>
                  <b>{horse.code}</b>
                  <span>{horse.name}</span>
                  <em>{horse.status}</em>
                </div>
                <div className="reminder-date">
                  <span className="cond-pill" style={{ background: meta.bg, color: meta.color }}>
                    {meta.label}
                  </span>
                  <b>{date}</b>
                  <small>来源：{source}</small>
                </div>
                <button className="primary" onClick={() => onRecord(horse.id)}>记录检查</button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
