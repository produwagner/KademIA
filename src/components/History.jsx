import React, { useState } from "react";
import { TrashIcon, CalendarIcon, ClockIcon, InfoIcon, CheckIcon } from "./Icons";
import SyncStatusIndicator from "./SyncStatusIndicator";

// Local inline chevrons for month navigation
const ChevronLeftIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function History({ history, syncProps }) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  // Calendar calculations
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  // Fill calendar cells
  const prevMonthIndex = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonthIndex);

  const cells = [];

  // Previous month filler days
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({
      day: daysInPrevMonth - i,
      month: prevMonthIndex,
      year: prevYear,
      isCurrentMonth: false
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({
      day: i,
      month: currentMonth,
      year: currentYear,
      isCurrentMonth: true
    });
  }

  // Next month filler days
  const nextMonthIndex = currentMonth === 11 ? 0 : currentMonth + 1;
  const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
  const totalCells = cells.length;
  const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remainingCells; i++) {
    cells.push({
      day: i,
      month: nextMonthIndex,
      year: nextYear,
      isCurrentMonth: false
    });
  }

  const navigateMonth = (direction) => {
    if (direction === "prev") {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear((y) => y - 1);
      } else {
        setCurrentMonth((m) => m - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear((y) => y + 1);
      } else {
        setCurrentMonth((m) => m + 1);
      }
    }
  };

  const handleCellClick = (cell) => {
    const newDate = new Date(cell.year, cell.month, cell.day);
    setSelectedDate(newDate);
    if (!cell.isCurrentMonth) {
      setCurrentMonth(cell.month);
      setCurrentYear(cell.year);
    }
  };

  // Group workouts by date string "YYYY-MM-DD"
  const getWorkoutsForCell = (cell) => {
    return history.filter((item) => {
      const d = new Date(item.date);
      return (
        d.getDate() === cell.day &&
        d.getMonth() === cell.month &&
        d.getFullYear() === cell.year
      );
    });
  };

  const selectedDayWorkouts = history.filter((item) => {
    const d = new Date(item.date);
    return (
      d.getDate() === selectedDate.getDate() &&
      d.getMonth() === selectedDate.getMonth() &&
      d.getFullYear() === selectedDate.getFullYear()
    );
  });

  const isToday = (cell) => {
    const today = new Date();
    return (
      today.getDate() === cell.day &&
      today.getMonth() === cell.month &&
      today.getFullYear() === cell.year
    );
  };

  const isSelected = (cell) => {
    return (
      selectedDate.getDate() === cell.day &&
      selectedDate.getMonth() === cell.month &&
      selectedDate.getFullYear() === cell.year
    );
  };

  const formatSelectedDateTitle = (date) => {
    const weekday = date.toLocaleDateString("pt-BR", { weekday: "long" });
    const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const day = date.getDate();
    const month = MONTHS[date.getMonth()];
    return `${capitalizedWeekday}, ${day} de ${month}`;
  };

  const formatSessionTime = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="history-container animate-fade-in">
      <header className="history-header">
        <h2 className="history-title">Histórico</h2>
        {syncProps && (
          <SyncStatusIndicator
            status={syncProps.status}
            lastSync={syncProps.lastSync}
            isOnline={syncProps.isOnline}
            onSync={syncProps.onSync}
          />
        )}
      </header>

      {history.length === 0 ? (
        <div className="empty-history glass">
          <CalendarIcon size={32} className="empty-icon" />
          <p>Nenhum treino registrado ainda.</p>
          <span>Complete seu primeiro treino para começar a registrar sua evolução!</span>
        </div>
      ) : (
        <div className="history-content-wrapper">
          {/* Calendar Widget */}
          <div className="calendar-widget glass">
            <div className="calendar-header">
              <span className="current-month-year">
                {MONTHS[currentMonth]} {currentYear}
              </span>
              <div className="calendar-nav-buttons">
                <button className="calendar-nav-btn" onClick={() => navigateMonth("prev")} aria-label="Mês anterior">
                  <ChevronLeftIcon size={16} />
                </button>
                <button className="calendar-nav-btn" onClick={() => navigateMonth("next")} aria-label="Próximo mês">
                  <ChevronRightIcon size={16} />
                </button>
              </div>
            </div>

            <div className="calendar-weekdays-row">
              {WEEKDAYS.map((day) => (
                <div key={day} className="weekday-label">{day}</div>
              ))}
            </div>

            <div className="calendar-grid">
              {cells.map((cell, idx) => {
                const cellWorkouts = getWorkoutsForCell(cell);
                const hasWorkout = cellWorkouts.length > 0;
                
                return (
                  <button
                    key={idx}
                    className={`calendar-cell ${cell.isCurrentMonth ? "current-month" : "other-month"} ${isToday(cell) ? "today" : ""} ${isSelected(cell) ? "selected" : ""}`}
                    onClick={() => handleCellClick(cell)}
                  >
                    <span className="day-number">{cell.day}</span>
                    <div className="calendar-badge-container">
                      {cellWorkouts.map((wk, wIdx) => (
                        <span key={wIdx} className="calendar-workout-letter" title={wk.routineName}>
                          {wk.routineId}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Workouts List */}
          <div className="selected-day-details">
            <h3 className="selected-day-title">
              {formatSelectedDateTitle(selectedDate)}
            </h3>

            {selectedDayWorkouts.length === 0 ? (
              <div className="no-workouts-day">
                <p>Nenhum treino realizado nesta data.</p>
              </div>
            ) : (
              <div className="day-workouts-list">
                {selectedDayWorkouts.map((session, sIdx) => {
                  const totalVolume = session.exercises?.reduce((acc, ex) => {
                    return acc + (ex.setsData?.reduce((sum, set) => sum + (parseFloat(set.load) || 0) * (parseInt(set.reps) || 0), 0) || 0);
                  }, 0) || 0;

                  return (
                    <div key={session.id || sIdx} className="history-day-card glass animate-slide-up">
                      <div className="day-card-header">
                        <div>
                          <span className="hist-routine-tag">{session.routineId}</span>
                          <h4 className="hist-routine-name">
                            {session.routineName.replace("Treino " + session.routineId + " - ", "")}
                          </h4>
                        </div>
                        <span className="hist-time-tag">
                          {formatSessionTime(session.date)}
                        </span>
                      </div>

                      <div className="hist-meta-summary">
                        <div className="meta-badge">
                          <ClockIcon size={12} />
                          <span>{session.duration} min</span>
                        </div>
                        <div className="meta-badge">
                          <span>Vol: {totalVolume.toLocaleString()} kg</span>
                        </div>
                      </div>

                      {session.notes && (
                        <div className="hist-note-snippet">
                          <InfoIcon size={12} />
                          <span>{session.notes}</span>
                        </div>
                      )}

                      <div className="hist-details">
                        <h5 className="details-title">Exercícios Realizados</h5>
                        <div className="details-exercises-list">
                          {session.exercises?.map((ex, exIdx) => (
                            <div key={exIdx} className="details-ex-item">
                              <span className="details-ex-name">{ex.name}</span>
                              <div className="details-sets-list">
                                {ex.setsData?.map((set, setIdx) => (
                                  <div key={setIdx} className={`details-set-bubble ${set.completed ? "ok" : "nok"}`}>
                                    <span className="set-num">{set.setNum}ª</span>
                                    <span className="set-val">
                                      {set.load ? `${set.load}kg` : "--"} × {set.reps || "0"}
                                    </span>
                                    {set.completed ? (
                                      <span className="set-check-ok">✓</span>
                                    ) : (
                                      <span className="set-check-nok">✗</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .history-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 20px 16px;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 10px;
        }

        .history-title {
          font-size: 1.5rem;
          color: var(--color-text-primary);
        }

        .btn-clear-history {
          background: none;
          border: none;
          color: var(--color-text-muted);
          font-size: 0.85rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          font-weight: 500;
        }

        .btn-clear-history:hover {
          color: var(--status-error);
        }

        .empty-history {
          padding: 40px 20px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .empty-icon {
          color: var(--color-text-muted);
          opacity: 0.4;
        }

        .empty-history p {
          color: var(--color-text-primary);
          font-weight: 600;
          font-size: 1.1rem;
        }

        .empty-history span {
          color: var(--color-text-secondary);
          font-size: 0.85rem;
          line-height: 1.4;
        }

        .history-content-wrapper {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Calendar Styling */
        .calendar-widget {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 4px;
        }

        .current-month-year {
          font-family: var(--font-title);
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--color-text-primary);
          text-transform: capitalize;
        }

        .calendar-nav-buttons {
          display: flex;
          gap: 4px;
        }

        .calendar-nav-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
          color: var(--color-text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .calendar-nav-btn:hover {
          background: var(--bg-card-hover);
          border-color: var(--accent-purple);
        }

        .calendar-weekdays-row {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-text-secondary);
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 6px;
        }

        .weekday-label {
          padding: 2px 0;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }

        .calendar-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 6px 2px;
          background: none;
          border: 1px solid transparent;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          min-height: 52px;
        }

        .calendar-cell:hover {
          background: var(--bg-card-hover);
        }

        .calendar-cell.current-month {
          color: var(--color-text-primary);
        }

        .calendar-cell.other-month {
          color: var(--color-text-muted);
          opacity: 0.4;
        }

        .calendar-cell.today {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
        }

        .calendar-cell.today .day-number {
          font-weight: 800;
          color: var(--accent-purple);
        }

        .calendar-cell.selected {
          border: 1.5px solid var(--accent-purple);
          background: var(--accent-purple-glow);
        }

        .day-number {
          font-size: 0.85rem;
          font-weight: 600;
        }

        .calendar-badge-container {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 2px;
          width: 100%;
        }

        .calendar-workout-letter {
          width: 15px;
          height: 15px;
          border-radius: 50%;
          background: var(--accent-purple);
          color: var(--color-on-accent);
          font-size: 0.65rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }

        /* Selected Day details */
        .selected-day-details {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .selected-day-title {
          font-size: 1.1rem;
          font-family: var(--font-title);
          color: var(--color-text-primary);
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 6px;
        }

        .no-workouts-day {
          padding: 24px 16px;
          text-align: center;
          color: var(--color-text-muted);
          font-style: italic;
          font-size: 0.9rem;
        }

        .day-workouts-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .history-day-card {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .day-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .hist-routine-tag {
          font-family: var(--font-title);
          font-weight: 800;
          font-size: 0.75rem;
          color: var(--accent-lime);
          background: var(--accent-purple-glow);
          padding: 2px 6px;
          border-radius: 4px;
          margin-right: 8px;
          display: inline-block;
          vertical-align: middle;
        }

        .hist-routine-name {
          font-size: 0.95rem;
          color: var(--color-text-primary);
          display: inline-block;
          vertical-align: middle;
        }

        .hist-time-tag {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          font-weight: 600;
        }

        .hist-meta-summary {
          display: flex;
          gap: 8px;
        }

        .meta-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          font-weight: 600;
        }

        .hist-note-snippet {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--accent-purple-glow);
          padding: 6px 8px;
          border-radius: 6px;
          font-size: 0.8rem;
          color: var(--accent-purple);
        }

        .hist-details {
          border-top: 1px solid var(--border-color);
          padding-top: 12px;
        }

        .details-title {
          font-size: 0.85rem;
          color: var(--color-text-primary);
          margin-bottom: 8px;
          font-weight: 700;
        }

        .details-exercises-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .details-ex-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .details-ex-name {
          font-size: 0.85rem;
          color: var(--color-text-secondary);
          font-weight: 600;
        }

        .details-sets-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .details-set-bubble {
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 2px 6px;
          font-size: 0.75rem;
        }

        .details-set-bubble.nok {
          opacity: 0.7;
          border-style: dashed;
        }

        .details-set-bubble .set-num {
          color: var(--color-text-muted);
          font-weight: 600;
        }

        .details-set-bubble .set-val {
          color: var(--color-text-primary);
          font-weight: 700;
        }

        .set-check-ok {
          color: var(--status-success);
          font-weight: bold;
        }

        .set-check-nok {
          color: var(--status-error);
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}
