import React, { useState, useEffect } from "react";
import { CheckIcon, ClockIcon, InfoIcon, PlayIcon } from "./Icons";
import Timer from "./Timer";
import { exerciseGifs } from "../data/exerciseGifs";

// Helper to check if exercise is cardio
const isCardioEx = (name) => {
  return /cardio|corrida|trote|esteira|caminhada|bike|bicicleta|elíptico|running|spinning/i.test(name);
};

export default function ActiveWorkout({ routine, history, onSaveWorkout, onCancelWorkout }) {
  const [exercisesState, setExercisesState] = useState([]);
  const [activeTimer, setActiveTimer] = useState(null);
  const [startTime, setStartTime] = useState(() => new Date());
  const [notes, setNotes] = useState("");
  const [isFinishing, setIsFinishing] = useState(false);
  const [expandedGifExId, setExpandedGifExId] = useState(null);

  const toggleGif = (exId) => {
    setExpandedGifExId(prev => (prev === exId ? null : exId));
  };

  useEffect(() => {
    // Check if there is a saved active workout state for this routine
    try {
      const saved = localStorage.getItem("kademia_active_workout_state");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.routineId === routine.id) {
          setExercisesState(parsed.exercisesState);
          setStartTime(new Date(parsed.startTime));
          setNotes(parsed.notes || "");
          console.log("Restaurou treino ativo salvo para ficha:", routine.id);
          return; // Skip normal initialization
        }
      }
    } catch (e) {
      console.error("Erro ao carregar active workout state do localStorage:", e);
    }

    // Default initialization: look up previous sets data from history for each exercise in this routine
    const getPreviousExerciseData = (exerciseName) => {
      for (const session of history) {
        const found = session.exercises?.find(
          (ex) => ex.name.toLowerCase() === exerciseName.toLowerCase()
        );
        if (found && found.setsData && found.setsData.length > 0) {
          return found.setsData;
        }
      }
      return null;
    };

    // Initialize state for each exercise and its sets
    const initialExercises = routine.exercises.map((ex) => {
      const prevSets = getPreviousExerciseData(ex.name);
      const isCardio = isCardioEx(ex.name);
      
      return {
        ...ex,
        setsData: Array.from({ length: ex.sets }).map((_, idx) => {
          // Find matching set in previous workout, fallback to last available set if this is an extra set
          const prevSet = prevSets && prevSets[idx] ? prevSets[idx] : (prevSets && prevSets.length > 0 ? prevSets[prevSets.length - 1] : null);
          
          return {
            setNum: idx + 1,
            load: prevSet ? prevSet.load : (ex.load || ""),
            // If cardio, default to "Corrida", otherwise try to load last reps or parsed defaults
            reps: prevSet && prevSet.reps ? prevSet.reps : (isCardio ? "Corrida" : (ex.reps.includes("-") ? ex.reps.split("-")[1] : ex.reps)),
            completed: false
          };
        })
      };
    });

    setExercisesState(initialExercises);
  }, [routine, history]);

  // Persist active workout progress in real-time
  useEffect(() => {
    if (exercisesState && exercisesState.length > 0) {
      localStorage.setItem(
        "kademia_active_workout_state",
        JSON.stringify({
          routineId: routine.id,
          exercisesState,
          startTime: startTime.toISOString(),
          notes
        })
      );
    }
  }, [exercisesState, startTime, notes, routine.id]);

  // Handle checking/unchecking a set
  const handleSetCheck = (exIdx, setIdx) => {
    const updated = [...exercisesState];
    const set = updated[exIdx].setsData[setIdx];
    const newCompletedState = !set.completed;
    
    set.completed = newCompletedState;
    setExercisesState(updated);

    // If marked completed, start the rest timer
    if (newCompletedState) {
      const isLastExercise = exIdx === exercisesState.length - 1;
      const isLastSet = setIdx === updated[exIdx].setsData.length - 1;
      
      if (!(isLastExercise && isLastSet)) {
        setActiveTimer({
          duration: updated[exIdx].rest || 60,
          exerciseName: updated[exIdx].name
        });
      }
    }
  };

  const handleSetDataChange = (exIdx, setIdx, field, value) => {
    const updated = [...exercisesState];
    updated[exIdx].setsData[setIdx][field] = value;
    setExercisesState(updated);
  };

  // Adjust values using buttons (+ / -)
  const adjustSetValue = (exIdx, setIdx, field, delta) => {
    const updated = [...exercisesState];
    const currentValue = parseFloat(updated[exIdx].setsData[setIdx][field]) || 0;
    const newValue = Math.max(0, currentValue + delta);
    
    updated[exIdx].setsData[setIdx][field] = field === "reps"
      ? Math.round(newValue).toString()
      : (Number.isInteger(newValue) ? newValue.toString() : newValue.toFixed(1));

    setExercisesState(updated);
  };

  // Add a new set to the exercise card
  const handleAddSet = (exIdx) => {
    const updated = [...exercisesState];
    const sets = updated[exIdx].setsData;
    const lastSet = sets[sets.length - 1];
    const isCardio = isCardioEx(updated[exIdx].name);

    sets.push({
      setNum: sets.length + 1,
      load: lastSet ? lastSet.load : "",
      reps: lastSet ? lastSet.reps : (isCardio ? "Corrida" : ""),
      completed: false
    });

    updated[exIdx].sets = sets.length;
    setExercisesState(updated);
  };

  // Remove the last set from the exercise card
  const handleRemoveSet = (exIdx) => {
    const updated = [...exercisesState];
    const sets = updated[exIdx].setsData;
    if (sets.length > 1) {
      sets.pop();
      updated[exIdx].sets = sets.length;
      setExercisesState(updated);
    }
  };

  // Swap exercise orders in the middle of a workout
  const moveExercise = (index, direction) => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === exercisesState.length - 1) return;

    const updated = [...exercisesState];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    // Swap elements
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    setExercisesState(updated);
  };

  const handleFinishWorkout = () => {
    setIsFinishing(true);
  };

  const handleSaveConfirm = () => {
    const endTime = new Date();
    const durationMs = endTime - startTime;
    const durationMin = Math.round(durationMs / 60000);

    const completedExercises = exercisesState.map((ex) => ({
      name: ex.name,
      sets: ex.sets,
      setsData: ex.setsData.map((s) => ({
        setNum: s.setNum,
        load: s.load,
        reps: s.reps,
        completed: s.completed
      }))
    }));

    // Clear active workout state on finish
    localStorage.removeItem("kademia_active_workout_state");

    onSaveWorkout({
      routineId: routine.id,
      routineName: routine.name,
      date: new Date().toISOString(),
      duration: durationMin,
      notes: notes,
      exercises: completedExercises
    });
  };

  return (
    <div className="active-workout-container animate-fade-in">
      {/* Timer overlay if active */}
      {activeTimer && (
        <Timer
          duration={activeTimer.duration}
          onFinish={() => setActiveTimer(null)}
          onCancel={() => setActiveTimer(null)}
        />
      )}

      {/* Header */}
      <header className="active-workout-header">
        <div>
          <span className="routine-tag-large">{routine.id}</span>
          <h2 className="routine-title-large">{routine.name}</h2>
        </div>
        <button className="btn-cancel" onClick={onCancelWorkout}>
          Desistir
        </button>
      </header>

      {/* Exercises List */}
      {!isFinishing ? (
        <>
          <div className="exercises-list-wrapper">
            {exercisesState.map((ex, exIdx) => {
              const isCardio = isCardioEx(ex.name);
              return (
                <div key={ex.id} className="exercise-workout-card glass">
                  <div className="ex-card-header">
                    <div className="ex-card-title-container">
                      <h4 className="ex-card-title">{ex.name}</h4>
                      {exerciseGifs[ex.name] && (
                        <button
                          className={`btn-show-gif ${expandedGifExId === ex.id ? "active" : ""}`}
                          onClick={() => toggleGif(ex.id)}
                          title="Ver execução em 3D"
                          type="button"
                        >
                          <PlayIcon size={12} />
                        </button>
                      )}
                    </div>
                    
                    <div className="ex-card-header-actions">
                      {/* Exercise Reordering Buttons */}
                      <div className="ex-order-buttons">
                        <button
                          type="button"
                          className="btn-order-move"
                          onClick={() => moveExercise(exIdx, "up")}
                          disabled={exIdx === 0}
                          title="Mover exercício para cima"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                        </button>
                        <button
                          type="button"
                          className="btn-order-move"
                          onClick={() => moveExercise(exIdx, "down")}
                          disabled={exIdx === exercisesState.length - 1}
                          title="Mover exercício para baixo"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </button>
                      </div>
                      
                      <div className="ex-card-meta">
                        <ClockIcon size={14} /> <span>{ex.rest}s descanso</span>
                      </div>
                    </div>
                  </div>

                  {ex.observations && (
                    <div className="ex-card-observations">
                      <InfoIcon size={14} /> <span>{ex.observations}</span>
                    </div>
                  )}

                  {expandedGifExId === ex.id && exerciseGifs[ex.name] && (
                    <div className="exercise-gif-drawer animate-slide-down">
                      <img
                        src={exerciseGifs[ex.name]}
                        alt={ex.name}
                        className="exercise-gif"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Grid Headers (Adaptable for Cardio vs Strength) */}
                  <div className="sets-grid-header">
                    <span>SÉRIE</span>
                    <span>{isCardio ? "DISTÂNCIA" : "CARGA"}</span>
                    <span>{isCardio ? "TIPO" : "REPETIÇÕES"}</span>
                    <span>STATUS</span>
                  </div>

                  {/* Sets Rows */}
                  <div className="sets-rows">
                    {ex.setsData.map((set, setIdx) => (
                      <div key={setIdx} className={`set-row ${set.completed ? "completed" : ""}`}>
                        <span className="set-number-label">{set.setNum}ª</span>
                        
                        {/* Weight or Distance Input (No Spinners) */}
                        <div className="input-with-suffix">
                          <input
                            type="number"
                            step={isCardio ? "0.1" : "1"}
                            pattern="[0-9]*"
                            inputMode="decimal"
                            className="set-input load"
                            value={set.load}
                            disabled={set.completed}
                            onChange={(e) => handleSetDataChange(exIdx, setIdx, "load", e.target.value)}
                            placeholder="0"
                          />
                          <span className="suffix">{isCardio ? "km" : "kg"}</span>
                        </div>

                        {/* Reps Spinner or Cardio Type Select */}
                        {isCardio ? (
                          <div className="cardio-type-container">
                            <select
                              className="set-input reps cardio-select"
                              value={set.reps || "Corrida"}
                              disabled={set.completed}
                              onChange={(e) => handleSetDataChange(exIdx, setIdx, "reps", e.target.value)}
                            >
                              <option value="Corrida">Corrida</option>
                              <option value="Caminhada">Caminhada</option>
                              <option value="Trote">Trote</option>
                              <option value="Misto">Misto</option>
                            </select>
                          </div>
                        ) : (
                          <div className="input-spinner-container">
                            <button 
                              type="button" 
                              className="btn-spinner dec" 
                              disabled={set.completed}
                              onClick={() => adjustSetValue(exIdx, setIdx, "reps", -1)}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              pattern="[0-9]*"
                              inputMode="numeric"
                              className="set-input reps reps-no-suffix"
                              value={set.reps}
                              disabled={set.completed}
                              onChange={(e) => handleSetDataChange(exIdx, setIdx, "reps", e.target.value)}
                              placeholder="0"
                            />
                            <button 
                              type="button" 
                              className="btn-spinner inc" 
                              disabled={set.completed}
                              onClick={() => adjustSetValue(exIdx, setIdx, "reps", 1)}
                            >
                              +
                            </button>
                          </div>
                        )}

                        <button
                          className={`btn-check-set ${set.completed ? "checked" : ""}`}
                          onClick={() => handleSetCheck(exIdx, setIdx)}
                        >
                          <CheckIcon size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add / Delete Set buttons */}
                  <div className="sets-actions-row">
                    <button 
                      type="button"
                      className="btn-set-action remove" 
                      onClick={() => handleRemoveSet(exIdx)} 
                      disabled={ex.setsData.length <= 1}
                    >
                      - Remover Série
                    </button>
                    <button 
                      type="button"
                      className="btn-set-action add" 
                      onClick={() => handleAddSet(exIdx)}
                    >
                      + Adicionar Série
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button className="btn btn-lime finish-workout-btn" onClick={handleFinishWorkout}>
            Finalizar Treino
          </button>
        </>
      ) : (
        /* Finish Workout Screen */
        <div className="finish-workout-card glass animate-slide-up">
          <h3 className="finish-title">Treino Concluído!</h3>
          <p className="finish-desc">Deseja adicionar alguma anotação sobre o treino de hoje?</p>

          <div className="form-group">
            <label className="form-label" htmlFor="workout-notes">Observações / Como se sentiu</label>
            <textarea
              id="workout-notes"
              className="input-field textarea-field"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Treino muito produtivo. Consegui aumentar 2kg no agachamento."
              rows={4}
            />
          </div>

          <div className="finish-actions">
            <button className="btn btn-secondary" onClick={() => setIsFinishing(false)}>
              Voltar ao Treino
            </button>
            <button className="btn btn-primary" onClick={handleSaveConfirm}>
              Salvar Treino
            </button>
          </div>
        </div>
      )}

      <style>{`
        .active-workout-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 20px 16px;
          min-height: 100vh;
        }

        .active-workout-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 10px;
        }

        .routine-tag-large {
          font-family: var(--font-title);
          font-weight: 800;
          font-size: 0.9rem;
          color: var(--accent-purple);
          background: rgba(11, 87, 208, 0.08);
          padding: 4px 8px;
          border-radius: 6px;
          display: inline-block;
          margin-bottom: 4px;
        }

        .routine-title-large {
          font-size: 1.5rem;
          color: var(--color-text-primary);
        }

        .btn-cancel {
          background: rgba(197, 34, 31, 0.05);
          border: 1px solid rgba(197, 34, 31, 0.2);
          color: var(--status-error);
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
          transition: all 0.2s;
          margin-right: 48px; /* Evita colisão com o botão de tema */
        }

        .btn-cancel:hover {
          background: rgba(197, 34, 31, 0.1);
        }

        .exercises-list-wrapper {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .exercise-workout-card {
          padding: 16px;
        }

        .ex-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }

        .ex-card-title {
          font-size: 1.1rem;
          color: var(--color-text-primary);
          max-width: 70%;
        }

        .ex-card-header-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
          flex-shrink: 0;
        }

        .ex-order-buttons {
          display: flex;
          gap: 4px;
        }

        .btn-order-move {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          color: var(--color-text-secondary);
          border-radius: 6px;
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          padding: 0;
        }

        .btn-order-move:hover:not(:disabled) {
          border-color: var(--accent-purple);
          color: var(--accent-purple);
          background: var(--bg-card-hover);
        }

        .btn-order-move:disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }

        .ex-card-meta {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }

        .ex-card-observations {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          color: var(--accent-lime);
          background: var(--accent-purple-glow);
          padding: 8px 10px;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .sets-grid-header {
          display: grid;
          grid-template-columns: 0.4fr 1.0fr 1.6fr 0.6fr;
          gap: 6px;
          font-size: 0.7rem;
          color: var(--color-text-muted);
          font-weight: 700;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
          padding: 0 4px;
        }

        .sets-rows {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .set-row {
          display: grid;
          grid-template-columns: 0.4fr 1.0fr 1.6fr 0.6fr;
          gap: 6px;
          align-items: center;
          padding: 8px;
          border-radius: 10px;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          transition: all 0.2s;
        }

        .set-row.completed {
          background: var(--accent-purple-glow);
          border-color: var(--accent-lime-glow);
        }

        .set-number-label {
          font-family: var(--font-title);
          font-weight: 700;
          color: var(--color-text-secondary);
          padding-left: 4px;
        }

        /* Spinner container and buttons */
        .input-spinner-container {
          display: flex;
          align-items: center;
          gap: 4px;
          width: 100%;
        }

        .btn-spinner {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: none;
          background: var(--clay-bg-neutral);
          color: var(--color-text-primary);
          font-size: 0.95rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          user-select: none;
          transition: all 0.15s ease;
          padding: 0;
          flex-shrink: 0;
          box-shadow: 
            0 2px 4px var(--clay-neutral-shadow),
            inset 0 1px 2px var(--clay-neutral-inner-light),
            inset 0 -1px 2px var(--clay-neutral-inner-dark);
        }

        .btn-spinner:hover:not(:disabled) {
          background: var(--bg-card-hover);
          transform: translateY(-1px);
        }

        .btn-spinner:active:not(:disabled) {
          transform: translateY(1px);
          box-shadow: 
            0 1px 2px var(--clay-neutral-shadow),
            inset 0 0.5px 1px var(--clay-neutral-inner-light),
            inset 0 -0.5px 1px var(--clay-neutral-inner-dark);
        }

        .btn-spinner:disabled {
          opacity: 0.35;
          cursor: not-allowed;
          box-shadow: none;
        }

        .input-with-suffix {
          position: relative;
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 0;
        }

        .set-input {
          width: 100%;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 8px 8px;
          color: var(--color-text-primary);
          text-align: right;
          font-family: var(--font-body);
          font-size: 0.9rem;
          font-weight: 600;
          transition: all 0.2s;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.03);
        }

        .set-input.load {
          padding-right: 28px;
        }

        .set-input.reps {
          padding-right: 40px;
        }

        .set-input.reps-no-suffix {
          padding-right: 8px !important;
          text-align: center !important;
          flex: 1;
          min-width: 0;
        }

        .set-input:disabled {
          color: var(--color-text-secondary);
          border-color: transparent;
          background: transparent;
          box-shadow: none;
        }

        .set-input:focus {
          outline: none;
          border-color: var(--border-focus);
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.03), 0 0 0 2px var(--accent-purple-glow);
        }

        .suffix {
          position: absolute;
          right: 6px;
          font-size: 0.72rem;
          color: var(--color-text-muted);
          pointer-events: none;
        }

        /* Cardio Select styling */
        .cardio-type-container {
          width: 100%;
        }

        .cardio-select {
          text-align: center;
          text-align-last: center;
          padding-right: 8px !important;
          cursor: pointer;
        }

        /* Sets action row buttons */
        .sets-actions-row {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 12px;
          padding: 0 4px;
        }

        .btn-set-action {
          background: var(--clay-bg-neutral);
          border: 1px solid var(--border-color);
          font-family: var(--font-body);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          padding: 6px 12px;
          border-radius: 8px;
          transition: all 0.2s;
          box-shadow: 
            0 2px 4px var(--clay-neutral-shadow),
            inset 0 1px 2px var(--clay-neutral-inner-light),
            inset 0 -1px 2px var(--clay-neutral-inner-dark);
        }

        .btn-set-action.add {
          color: var(--status-success);
          border-color: var(--accent-lime-glow);
        }

        .btn-set-action.add:hover {
          background: var(--accent-purple-glow);
          transform: translateY(-1px);
        }

        .btn-set-action.remove {
          color: var(--status-error);
          border-color: rgba(197, 34, 31, 0.15);
        }

        .btn-set-action.remove:hover {
          background: rgba(197, 34, 31, 0.04);
          transform: translateY(-1px);
        }

        .btn-set-action:disabled {
          opacity: 0.3;
          cursor: not-allowed;
          background: transparent;
          box-shadow: none;
          border-color: var(--border-color);
        }

        .btn-check-set {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: var(--clay-bg-neutral);
          border: 1px solid var(--border-color);
          color: var(--color-text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          justify-self: center;
          flex-shrink: 0;
          box-shadow: 
            0 2px 4px var(--clay-neutral-shadow),
            inset 0 1px 2px var(--clay-neutral-inner-light),
            inset 0 -1px 2px var(--clay-neutral-inner-dark);
        }

        .btn-check-set:hover {
          border-color: var(--accent-lime);
          color: var(--accent-lime);
          transform: translateY(-1px);
        }

        .btn-check-set:active {
          transform: translateY(1px);
        }

        .btn-check-set.checked {
          background: var(--clay-bg-primary);
          border-color: var(--clay-bg-primary);
          color: var(--color-on-accent);
          box-shadow: 
            0 3px 8px var(--clay-shadow-outer),
            inset 0 1.5px 3px var(--clay-inner-light),
            inset 0 -1.5px 3px var(--clay-inner-dark);
        }

        .finish-workout-btn {
          width: 100%;
          padding: 15px;
          margin-top: 10px;
          font-size: 1.1rem;
          border-radius: 12px;
        }

        /* Finish Card */
        .finish-workout-card {
          padding: 24px;
          text-align: center;
        }

        .finish-title {
          font-size: 1.6rem;
          color: var(--color-text-primary);
          margin-bottom: 8px;
        }

        .finish-desc {
          font-size: 0.95rem;
          color: var(--color-text-secondary);
          margin-bottom: 24px;
        }

        .textarea-field {
          resize: none;
        }

        .finish-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }

        .finish-actions button {
          flex: 1;
        }

        .ex-card-title-container {
          display: flex;
          align-items: center;
          gap: 10px;
          max-width: 80%;
        }

        .btn-show-gif {
          background: rgba(11, 87, 208, 0.06);
          border: 1px solid rgba(11, 87, 208, 0.15);
          color: var(--accent-purple);
          border-radius: 50%;
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 0;
          flex-shrink: 0;
        }

        .btn-show-gif:hover {
          background: rgba(11, 87, 208, 0.15);
          transform: scale(1.08);
        }

        .btn-show-gif.active {
          background: var(--accent-purple);
          border-color: var(--accent-purple);
          color: white;
          transform: rotate(90deg);
        }

        .exercise-gif-drawer {
          display: flex;
          justify-content: center;
          align-items: center;
          background: rgba(0, 0, 0, 0.02);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 10px;
          margin-top: 8px;
          margin-bottom: 16px;
          overflow: hidden;
        }

        .dark-theme .exercise-gif-drawer {
          background: rgba(255, 255, 255, 0.01);
        }

        .exercise-gif {
          max-width: 100%;
          max-height: 180px;
          border-radius: 8px;
          object-fit: contain;
          mix-blend-mode: multiply;
        }

        .dark-theme .exercise-gif {
          filter: invert(0.9) hue-rotate(180deg);
          mix-blend-mode: normal;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide-down {
          animation: slideDown 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
