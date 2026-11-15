import { create } from 'zustand';
import {
  compareAll,
  createDefaultInputs,
  recommendedPosture,
  type BusinessCaseInputs,
  type PostureId,
  type Readiness,
  type ReadinessAnswer,
  type TaskMix,
  type TierAssumptions,
  type TierId,
} from '@ai-roi-calc/bizcase';

export interface ExecState {
  inputs: BusinessCaseInputs;
  selectedPosture: PostureId | null;
  step: number;
  setInputs: (partial: Partial<BusinessCaseInputs>) => void;
  setTier: (tierId: TierId, partial: Partial<TierAssumptions>) => void;
  setTask: (id: TaskMix['id'], partial: Partial<TaskMix>) => void;
  setReadiness: (key: keyof Readiness, answer: ReadinessAnswer) => void;
  selectPosture: (id: PostureId) => void;
  setStep: (n: number) => void;
  reset: () => void;
}

/** The selected posture, or the recommended one when none is selected or the selection is no longer allowed. */
export function effectivePosture(inputs: BusinessCaseInputs, selected: PostureId | null): PostureId | null {
  const recommended = recommendedPosture(inputs);
  if (selected === null) return recommended;
  return compareAll(inputs)[selected].allowed ? selected : recommended;
}

export const useExecStore = create<ExecState>(set => ({
  inputs: createDefaultInputs(),
  selectedPosture: null,
  step: 1,
  setInputs: partial => set(state => ({ inputs: { ...state.inputs, ...partial } })),
  setTier: (tierId, partial) =>
    set(state => ({
      inputs: { ...state.inputs, tiers: { ...state.inputs.tiers, [tierId]: { ...state.inputs.tiers[tierId], ...partial } } },
    })),
  setTask: (id, partial) =>
    set(state => ({
      inputs: { ...state.inputs, tasks: state.inputs.tasks.map(t => (t.id === id ? { ...t, ...partial } : t)) },
    })),
  setReadiness: (key, answer) =>
    set(state => ({ inputs: { ...state.inputs, readiness: { ...state.inputs.readiness, [key]: answer } } })),
  selectPosture: id => set({ selectedPosture: id }),
  setStep: n => set({ step: n }),
  reset: () => set({ inputs: createDefaultInputs(), selectedPosture: null, step: 1 }),
}));
