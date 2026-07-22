import React, { useState } from "react";
import { PlusIcon, TrashIcon, CheckIcon, EditIcon, DragHandleIcon } from "./Icons";
import { defaultWorkout } from "../data/defaultWorkout";
import SyncStatusIndicator from "./SyncStatusIndicator";

export default function RoutineManager({ workoutData, onUpdateWorkoutData, syncProps }) {
  const [selectedRoutineId, setSelectedRoutineId] = useState(() => {
    return workoutData.routines.length > 0 ? workoutData.routines[0].id : "";
  });
  
  const [editingExerciseId, setEditingExerciseId] = useState(null);
  
  // Exercise form state
  const [exerciseForm, setExerciseForm] = useState({
    name: "",
    sets: 3,
    reps: "10",
    rest: 60,
    observations: ""
  });

  const [isAdding, setIsAdding] = useState(false);

  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Routine CRUD Modals state
  const [isAddingRoutine, setIsAddingRoutine] = useState(false);
  const [isEditingRoutineName, setIsEditingRoutineName] = useState(false);

  const [newRoutineForm, setNewRoutineForm] = useState({
    id: "",
    name: ""
  });

  const [editRoutineForm, setEditRoutineForm] = useState({
    name: ""
  });

  const handleResetToDefault = () => {
    if (window.confirm("Deseja realmente restaurar as fichas padrão do KademIA? Suas personalizações atuais nas fichas serão perdidas (seu histórico de treinos salvos NÃO será afetado).")) {
      onUpdateWorkoutData(defaultWorkout);
      setSelectedRoutineId(defaultWorkout.routines[0].id);
    }
  };

  const selectedRoutine = workoutData.routines.find((r) => r.id === selectedRoutineId) || null;

  const handleStartAdd = () => {
    setExerciseForm({
      name: "",
      sets: 3,
      reps: "10",
      rest: 60,
      observations: ""
    });
    setIsAdding(true);
    setEditingExerciseId(null);
  };

  const handleStartEdit = (ex) => {
    setExerciseForm({
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      rest: ex.rest,
      observations: ex.observations || ""
    });
    setEditingExerciseId(ex.id);
    setIsAdding(false);
  };

  const handleSaveExercise = (e) => {
    e.preventDefault();
    if (!exerciseForm.name.trim() || !selectedRoutineId) return;

    const updatedRoutines = workoutData.routines.map((routine) => {
      if (routine.id !== selectedRoutineId) return routine;

      let updatedExercises;
      if (isAdding) {
        const newExercise = {
          id: `ex-${Date.now()}`,
          name: exerciseForm.name.trim(),
          sets: parseInt(exerciseForm.sets) || 3,
          reps: exerciseForm.reps.toString(),
          rest: parseInt(exerciseForm.rest) || 60,
          observations: exerciseForm.observations.trim()
        };
        updatedExercises = [...routine.exercises, newExercise];
      } else {
        updatedExercises = routine.exercises.map((ex) => {
          if (ex.id !== editingExerciseId) return ex;
          return {
            ...ex,
            name: exerciseForm.name.trim(),
            sets: parseInt(exerciseForm.sets) || 3,
            reps: exerciseForm.reps.toString(),
            rest: parseInt(exerciseForm.rest) || 60,
            observations: exerciseForm.observations.trim()
          };
        });
      }

      return {
        ...routine,
        exercises: updatedExercises
      };
    });

    onUpdateWorkoutData({
      ...workoutData,
      routines: updatedRoutines
    });

    setIsAdding(false);
    setEditingExerciseId(null);
  };

  const handleDeleteExercise = (exId) => {
    if (!window.confirm("Deseja realmente remover este exercício?")) return;

    const updatedRoutines = workoutData.routines.map((routine) => {
      if (routine.id !== selectedRoutineId) return routine;
      return {
        ...routine,
        exercises: routine.exercises.filter((ex) => ex.id !== exId)
      };
    });

    onUpdateWorkoutData({
      ...workoutData,
      routines: updatedRoutines
    });

    if (editingExerciseId === exId) {
      setEditingExerciseId(null);
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    if (e.dataTransfer.setDragImage && e.currentTarget.parentElement) {
      // Use the parent card as the drag image
      e.dataTransfer.setDragImage(e.currentTarget.parentElement, 20, 20);
    }
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (dropIndex) => {
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    
    const routineIdx = workoutData.routines.findIndex((r) => r.id === selectedRoutineId);
    if (routineIdx === -1) return;

    const routine = workoutData.routines[routineIdx];
    const exercises = [...routine.exercises];
    
    // Reordenar
    const draggedItem = exercises[draggedIndex];
    exercises.splice(draggedIndex, 1);
    exercises.splice(dropIndex, 0, draggedItem);
    
    const updatedRoutines = [...workoutData.routines];
    updatedRoutines[routineIdx] = { ...routine, exercises };
    
    onUpdateWorkoutData({
      ...workoutData,
      routines: updatedRoutines
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Ficha CRUD handlers
  const handleCreateRoutine = (e) => {
    e.preventDefault();
    const id = newRoutineForm.id.trim().toUpperCase();
    const name = newRoutineForm.name.trim();

    if (!id || !name) return;
    if (workoutData.routines.some((r) => r.id === id)) {
      alert(`Já existe uma Ficha com a identificação "${id}". Escolha outra (ex: E, F).`);
      return;
    }

    const newRoutine = {
      id,
      name,
      exercises: []
    };

    onUpdateWorkoutData({
      ...workoutData,
      routines: [...workoutData.routines, newRoutine]
    });

    setSelectedRoutineId(id);
    setIsAddingRoutine(false);
    setNewRoutineForm({ id: "", name: "" });
  };

  const handleRenameRoutine = (e) => {
    e.preventDefault();
    const name = editRoutineForm.name.trim();
    if (!name) return;

    const updatedRoutines = workoutData.routines.map((r) => {
      if (r.id === selectedRoutineId) {
        return { ...r, name };
      }
      return r;
    });

    onUpdateWorkoutData({
      ...workoutData,
      routines: updatedRoutines
    });

    setIsEditingRoutineName(false);
  };

  const handleDeleteRoutine = () => {
    if (workoutData.routines.length <= 1) {
      alert("Você precisa ter pelo menos uma Ficha de treino activa.");
      return;
    }

    if (!window.confirm(`Deseja realmente apagar a Ficha ${selectedRoutineId} (${selectedRoutine?.name})?\nTodos os exercícios cadastrados nela serão excluídos permanentemente!`)) {
      return;
    }

    const updatedRoutines = workoutData.routines.filter((r) => r.id !== selectedRoutineId);
    onUpdateWorkoutData({
      ...workoutData,
      routines: updatedRoutines
    });

    setSelectedRoutineId(updatedRoutines[0].id);
  };

  const openRenameModal = () => {
    if (!selectedRoutine) return;
    setEditRoutineForm({ name: selectedRoutine.name });
    setIsEditingRoutineName(true);
  };

  return (
    <div className="routine-manager-container animate-fade-in">
      <header className="routine-manager-header">
        <h2 className="routine-manager-title">Gerenciar Fichas</h2>
        {syncProps && (
          <SyncStatusIndicator
            status={syncProps.status}
            lastSync={syncProps.lastSync}
            isOnline={syncProps.isOnline}
            onSync={syncProps.onSync}
          />
        )}
      </header>

      {/* Routine Selector Tabs */}
      <div className="routine-tabs-wrapper">
        <div className="routine-tabs">
          {workoutData.routines.map((r) => (
            <button
              key={r.id}
              className={`routine-tab-btn ${r.id === selectedRoutineId ? "active" : ""}`}
              onClick={() => {
                setSelectedRoutineId(r.id);
                setIsAdding(false);
                setEditingExerciseId(null);
              }}
            >
              Treino {r.id}
            </button>
          ))}
        </div>
      </div>

      {/* Routine CRUD Actions */}
      <div className="routine-action-buttons">
        <button className="btn-routine-action edit" onClick={openRenameModal} disabled={!selectedRoutine}>
          Renomear Ficha
        </button>
        <button className="btn-routine-action delete" onClick={handleDeleteRoutine} disabled={!selectedRoutine}>
          Excluir Ficha
        </button>
        <button className="btn-routine-action add" onClick={() => setIsAddingRoutine(true)}>
          Nova Ficha +
        </button>
        <button className="btn-routine-action reset" onClick={handleResetToDefault}>
          Restaurar Padrão
        </button>
      </div>

      {selectedRoutine ? (
        <div className="routine-details-wrapper">
          <div className="routine-meta-info">
            <h3>{selectedRoutine.name}</h3>
            <span className="exercise-count-badge">
              {selectedRoutine.exercises.length} exercícios
            </span>
          </div>

          {/* Add/Edit Exercise Form */}
          {(isAdding || editingExerciseId) && (
            <form className="exercise-form glass animate-slide-up" onSubmit={handleSaveExercise}>
              <h4 className="form-title">
                {isAdding ? "Adicionar Exercício" : "Editar Exercício"}
              </h4>

              <div className="form-group">
                <label className="form-label">Nome do Exercício</label>
                <input
                  type="text"
                  className="input-field"
                  value={exerciseForm.name}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, name: e.target.value })}
                  placeholder="Ex: Supino Inclinado c/ Halteres"
                  required
                />
              </div>

              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">Séries</label>
                  <input
                    type="number"
                    className="input-field"
                    value={exerciseForm.sets}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, sets: parseInt(e.target.value) || "" })}
                    min="1"
                    max="10"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Repetições</label>
                  <input
                    type="text"
                    className="input-field"
                    value={exerciseForm.reps}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, reps: e.target.value })}
                    placeholder="10 ou 10-12"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Descanso (s)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={exerciseForm.rest}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, rest: parseInt(e.target.value) || "" })}
                    min="10"
                    max="300"
                    placeholder="Ex: 60"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Observações / Dicas de Execução</label>
                <input
                  type="text"
                  className="input-field"
                  value={exerciseForm.observations}
                  onChange={(e) => setExerciseForm({ ...exerciseForm, observations: e.target.value })}
                  placeholder="Ex: Controle de descida, foco na contração"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingExerciseId(null);
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-lime">
                  <CheckIcon size={16} /> Salvar
                </button>
              </div>
            </form>
          )}

          {/* Exercises List */}
          {!isAdding && !editingExerciseId && (
            <div className="manager-exercises-list">
              <button className="btn btn-primary add-ex-btn" onClick={handleStartAdd}>
                <PlusIcon size={18} /> Adicionar Exercício
              </button>

              {selectedRoutine.exercises.length === 0 ? (
                <p className="no-exercises-text">Nenhum exercício cadastrado nesta ficha. Arraste exercícios aqui ou adicione novos.</p>
              ) : (
                <div className="drag-drop-instructions">
                  💡 Arraste e solte os cartões para reordenar a sequência de treino.
                </div>
              )}

              <div className="exercises-drag-container">
                {selectedRoutine.exercises.map((ex, idx) => (
                  <div
                    key={ex.id}
                    className={`manager-exercise-item glass ${draggedIndex === idx ? "dragging" : ""} ${dragOverIndex === idx ? "drag-over" : ""}`}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                  >
                    <div
                      className="drag-handle-wrapper"
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragEnd={handleDragEnd}
                    >
                      <DragHandleIcon size={18} className="drag-icon" />
                    </div>

                    <div className="ex-info">
                      <h5 className="ex-name">{ex.name}</h5>
                      <div className="ex-meta">
                        <span>{ex.sets}x{ex.reps}</span> • <span>{ex.rest}s descanso</span>
                      </div>
                      {ex.observations && (
                        <span className="ex-obs-tag">{ex.observations}</span>
                      )}
                    </div>
                    
                    <div className="ex-actions">
                      <button className="btn-icon edit" onClick={() => handleStartEdit(ex)} title="Editar exercício">
                        <EditIcon size={16} />
                      </button>
                      <button className="btn-icon delete" onClick={() => handleDeleteExercise(ex.id)} title="Excluir exercício">
                        <TrashIcon size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="no-exercises-text">Nenhuma ficha cadastrada no momento. Clique em "Nova Ficha" para começar.</p>
      )}

      {/* Modal Nova Ficha */}
      {isAddingRoutine && (
        <div className="routine-modal-overlay">
          <div className="routine-modal animate-slide-up">
            <h3 className="modal-title">Criar Nova Ficha de Treino</h3>
            <form onSubmit={handleCreateRoutine}>
              <div className="form-group">
                <label className="form-label">Identificação/Sigla (Ex: E, F, G)</label>
                <input
                  type="text"
                  className="input-field"
                  maxLength="2"
                  value={newRoutineForm.id}
                  onChange={(e) => setNewRoutineForm({ ...newRoutineForm, id: e.target.value })}
                  placeholder="Ex: E"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Nome do Treino / Músculo Foco</label>
                <input
                  type="text"
                  className="input-field"
                  value={newRoutineForm.name}
                  onChange={(e) => setNewRoutineForm({ ...newRoutineForm, name: e.target.value })}
                  placeholder="Ex: Ombros e Triceps"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddingRoutine(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Criar Ficha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Nome da Ficha */}
      {isEditingRoutineName && (
        <div className="routine-modal-overlay">
          <div className="routine-modal animate-slide-up">
            <h3 className="modal-title">Renomear Ficha {selectedRoutineId}</h3>
            <form onSubmit={handleRenameRoutine}>
              <div className="form-group">
                <label className="form-label">Nome do Treino / Músculo Foco</label>
                <input
                  type="text"
                  className="input-field"
                  value={editRoutineForm.name}
                  onChange={(e) => setEditRoutineForm({ name: e.target.value })}
                  placeholder="Ex: Peito e Triceps"
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditingRoutineName(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .routine-manager-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 20px 16px;
        }

        .routine-manager-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 10px;
        }

        .routine-manager-title {
          font-size: 1.5rem;
          color: var(--color-text-primary);
        }

        .routine-tabs-wrapper {
          width: 100%;
          overflow-x: auto;
          scrollbar-width: none;
        }
        
        .routine-tabs-wrapper::-webkit-scrollbar {
          display: none;
        }

        .routine-tabs {
          display: flex;
          background: var(--glass-bg);
          backdrop-filter: blur(var(--glass-blur));
          -webkit-backdrop-filter: blur(var(--glass-blur));
          border: 1px solid var(--glass-border);
          border-radius: 14px;
          padding: 4px;
          gap: 4px;
          min-width: max-content;
          width: 100%;
          box-shadow: 0 4px 12px var(--glass-shadow);
        }

        .routine-tab-btn {
          flex: 1;
          background: none;
          border: none;
          color: var(--color-text-secondary);
          font-family: var(--font-title);
          font-weight: 700;
          font-size: 0.85rem;
          padding: 10px 16px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .routine-tab-btn.active {
          background: var(--accent-purple);
          color: var(--color-on-accent);
          box-shadow: 0 4px 12px var(--accent-purple-glow);
        }

        .routine-action-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1.3fr;
          gap: 6px;
          margin-bottom: 4px;
        }

        .btn-routine-action {
          padding: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          border-radius: 10px;
          border: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.04);
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: none;
        }

        .btn-routine-action:hover:not(:disabled) {
          border-color: var(--border-hover);
          background: var(--accent-active);
          color: var(--color-text-primary);
          transform: translateY(-1px);
        }

        .btn-routine-action:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: none;
        }

        .btn-routine-action:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          box-shadow: none;
        }

        .btn-routine-action.delete:hover:not(:disabled) {
          border-color: var(--status-error);
          color: var(--status-error);
          background: var(--status-error-glow);
          box-shadow: none;
        }



        .routine-details-wrapper {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .routine-meta-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 10px;
        }

        .routine-meta-info h3 {
          font-size: 1.15rem;
          color: var(--color-text-primary);
        }

        .exercise-count-badge {
          background: var(--bg-primary);
          color: var(--color-text-secondary);
          padding: 4px 10px;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid var(--border-color);
        }

        /* Exercise Form */
        .exercise-form {
          padding: 18px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .form-title {
          font-size: 1.1rem;
          color: var(--color-text-primary);
          margin-bottom: 4px;
        }

        .form-row-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 10px;
        }

        .form-actions button {
          flex: 1;
        }

        /* Exercises List */
        .manager-exercises-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .add-ex-btn {
          width: 100%;
          padding: 12px;
          border-radius: 100px;
        }

        .no-exercises-text {
          color: var(--color-text-muted);
          font-size: 0.9rem;
          text-align: center;
          margin: 24px 0;
          font-style: italic;
        }

        .drag-drop-instructions {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
          text-align: center;
          padding: 4px;
          background: var(--bg-primary);
          border-radius: 8px;
          border: 1px dashed var(--border-color);
        }

        .exercises-drag-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .manager-exercise-item {
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: grab;
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
        }

        .manager-exercise-item:active {
          cursor: grabbing;
        }

        .manager-exercise-item.dragging {
          opacity: 0.4;
          transform: scale(0.98);
          border: 1px dashed var(--accent-purple);
        }

        .manager-exercise-item.drag-over {
          border-top: 2px solid var(--accent-purple);
          background: var(--bg-primary);
        }

        .drag-handle-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-muted);
          padding-right: 4px;
          flex-shrink: 0;
        }

        .drag-icon {
          opacity: 0.6;
        }

        .ex-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
          min-width: 0;
        }

        .ex-name {
          font-size: 0.95rem;
          color: var(--color-text-primary);
          font-family: var(--font-body);
        }

        .ex-meta {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }

        .ex-obs-tag {
          font-size: 0.75rem;
          color: var(--accent-lime);
          font-weight: 500;
          display: inline-block;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ex-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .btn-icon {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          color: var(--color-text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          transition: all 0.2s;
        }

        .btn-icon:hover {
          background: var(--bg-card-hover);
          color: var(--color-text-primary);
        }

        .btn-icon.edit:hover {
          border-color: var(--accent-purple);
          color: var(--accent-purple);
        }

        .btn-icon.delete:hover {
          border-color: var(--status-error);
          color: var(--status-error);
        }

        /* Modals style */
        .routine-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(31, 31, 31, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 20px;
        }

        .routine-modal {
          width: 100%;
          max-width: 340px;
          padding: 24px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 28px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .modal-title {
          font-size: 1.15rem;
          color: var(--color-text-primary);
          font-family: var(--font-title);
          font-weight: 700;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 8px;
        }

        .modal-actions button {
          flex: 1;
        }
      `}</style>
    </div>
  );
}
