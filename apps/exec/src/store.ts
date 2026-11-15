import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  compareAll,
  createDefaultInputs,
  recommendedPosture,
  validateInputs,
  type BusinessCaseInputs,
  type PostureId,
  type Readiness,
  type ReadinessAnswer,
  type TaskMix,
  type TierAssumptions,
  type TierId,
} from '@ai-roi-calc/bizcase';

export const DEFAULT_ASK = 'Approve a pilot on the highest-volume work to validate these assumptions.';
export const DEFAULT_NEXT_STEPS =
  '1. Replace placeholder assumptions with customer data.\n2. Confirm data and governance readiness.\n3. Run a pilot and measure the effect.';

const POSTURES: PostureId[] = ['local', 'hybrid', 'enterprise', 'frontier'];
const STORAGE_KEY = 'execcase.v1';

export interface ExecState {
  inputs: BusinessCaseInputs;
  selectedPosture: PostureId | null;
  step: number;
  ask: string;
  nextSteps: string;
  setInputs: (partial: Partial<BusinessCaseInputs>) => void;
  setTier: (tierId: TierId, partial: Partial<TierAssumptions>) => void;
  setTask: (id: TaskMix['id'], partial: Partial<TaskMix>) => void;
  setReadiness: (key: keyof Readiness, answer: ReadinessAnswer) => void;
  selectPosture: (id: PostureId) => void;
  setStep: (n: number) => void;
  setAsk: (text: string) => void;
  setNextSteps: (text: string) => void;
  reset: () => void;
}

/** The selected posture, or the recommended one when none is selected or the selection is no longer allowed. */
export function effectivePosture(inputs: BusinessCaseInputs, selected: PostureId | null): PostureId | null {
  const recommended = recommendedPosture(inputs);
  if (selected === null) return recommended;
  return compareAll(inputs)[selected].allowed ? selected : recommended;
}

interface Stored {
  inputs: BusinessCaseInputs;
  selectedPosture: PostureId | null;
  ask: string;
  nextSteps: string;
}

/** Shape and validity check for saved data. Anything that fails is ignored and the defaults are used. */
function isStored(value: unknown): value is Stored {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<Stored>;
  const i = v.inputs as BusinessCaseInputs | undefined;
  if (!i || typeof i !== 'object') return false;
  if (typeof i.teamSize !== 'number' || typeof i.loadedCostPerFteYear !== 'number') return false;
  if (typeof i.hoursPerFteMonth !== 'number' || typeof i.adoption !== 'number') return false;
  if (typeof i.cashShare !== 'number' || typeof i.rampMonths !== 'number') return false;
  if (!Array.isArray(i.tasks) || i.tasks.length !== 5 || !i.tiers || !i.readiness) return false;
  if (v.selectedPosture !== null && !POSTURES.includes(v.selectedPosture as PostureId)) return false;
  if (typeof v.ask !== 'string' || typeof v.nextSteps !== 'string') return false;
  return validateInputs(i).length === 0;
}

export const useExecStore = create<ExecState>()(
  persist(
    set => ({
      inputs: createDefaultInputs(),
      selectedPosture: null,
      step: 1,
      ask: DEFAULT_ASK,
      nextSteps: DEFAULT_NEXT_STEPS,
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
      setAsk: text => set({ ask: text }),
      setNextSteps: text => set({ nextSteps: text }),
      reset: () =>
        set({
          inputs: createDefaultInputs(),
          selectedPosture: null,
          step: 1,
          ask: DEFAULT_ASK,
          nextSteps: DEFAULT_NEXT_STEPS,
        }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // The step is navigation, not work to keep
      partialize: state => ({
        inputs: state.inputs,
        selectedPosture: state.selectedPosture,
        ask: state.ask,
        nextSteps: state.nextSteps,
      }),
      merge: (persisted, current) => {
        if (!isStored(persisted)) return current;
        return {
          ...current,
          inputs: persisted.inputs,
          selectedPosture: persisted.selectedPosture,
          ask: persisted.ask,
          nextSteps: persisted.nextSteps,
        };
      },
    },
  ),
);
