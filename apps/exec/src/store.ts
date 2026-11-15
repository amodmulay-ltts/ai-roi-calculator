import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  applyWorkTemplate,
  compareAll,
  createDefaultInputs,
  isBusinessCaseInputs,
  recommendedPosture,
  validateInputs,
  type BusinessCaseInputs,
  type PostureId,
  type Readiness,
  type ReadinessAnswer,
  type TaskMix,
  type TierAssumptions,
  type TierId,
  type WorkPhase,
} from '@ai-roi-calc/bizcase';

export const DEFAULT_ASK = 'Approve a pilot on the highest-volume work to validate these assumptions.';
export const DEFAULT_NEXT_STEPS =
  '1. Replace placeholder assumptions with customer data.\n2. Confirm data and governance readiness.\n3. Run a pilot and measure the effect.';

const POSTURES: PostureId[] = ['local', 'hybrid', 'enterprise', 'frontier'];
const STORAGE_KEY = 'execcase.v1';

/** The template id once the phases or work have been changed by hand. */
export const CUSTOM_TEMPLATE_ID = 'custom';

function uniqueTaskId(tasks: TaskMix[]): string {
  const taken = new Set(tasks.map(t => t.id));
  let n = 1;
  while (taken.has(`work-${n}`)) n += 1;
  return `work-${n}`;
}

function uniquePhaseName(phases: WorkPhase[]): string {
  const taken = new Set(phases.map(p => p.name));
  if (!taken.has('New phase')) return 'New phase';
  let n = 2;
  while (taken.has(`New phase ${n}`)) n += 1;
  return `New phase ${n}`;
}

export interface ExecState {
  inputs: BusinessCaseInputs;
  selectedPosture: PostureId | null;
  step: number;
  ask: string;
  nextSteps: string;
  setInputs: (partial: Partial<BusinessCaseInputs>) => void;
  setTier: (tierId: TierId, partial: Partial<TierAssumptions>) => void;
  setTask: (id: TaskMix['id'], partial: Partial<TaskMix>) => void;
  /** Replaces the phases and work with a ready-made template, keeping everything else entered. */
  applyTemplate: (templateId: string) => void;
  /** Changes one phase. Renaming it moves its work with it. */
  setPhase: (index: number, partial: Partial<WorkPhase>) => void;
  addPhase: () => void;
  /** Removes a phase, and the work in it. */
  removePhase: (index: number) => void;
  addTask: (phaseName: string) => void;
  removeTask: (id: TaskMix['id']) => void;
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
  if (!isBusinessCaseInputs(v.inputs)) return false;
  if (v.selectedPosture !== null && !POSTURES.includes(v.selectedPosture as PostureId)) return false;
  if (typeof v.ask !== 'string' || typeof v.nextSteps !== 'string') return false;
  return validateInputs(v.inputs).length === 0;
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
      applyTemplate: templateId => set(state => ({ inputs: applyWorkTemplate(state.inputs, templateId) })),
      setPhase: (index, partial) =>
        set(state => {
          const current = state.inputs.phases[index];
          if (!current) return state;
          const renamed = partial.name !== undefined && partial.name !== current.name;
          return {
            inputs: {
              ...state.inputs,
              // Renaming a phase is a change of structure; changing its AI use is only a change of value
              workTemplateId: renamed ? CUSTOM_TEMPLATE_ID : state.inputs.workTemplateId,
              phases: state.inputs.phases.map((p, i) => (i === index ? { ...p, ...partial } : p)),
              tasks: renamed
                ? state.inputs.tasks.map(t => (t.phase === current.name ? { ...t, phase: partial.name as string } : t))
                : state.inputs.tasks,
            },
          };
        }),
      addPhase: () =>
        set(state => ({
          inputs: {
            ...state.inputs,
            workTemplateId: CUSTOM_TEMPLATE_ID,
            phases: [...state.inputs.phases, { name: uniquePhaseName(state.inputs.phases), aiUse: 0.5 }],
          },
        })),
      removePhase: index =>
        set(state => {
          const doomed = state.inputs.phases[index];
          if (!doomed) return state;
          return {
            inputs: {
              ...state.inputs,
              workTemplateId: CUSTOM_TEMPLATE_ID,
              phases: state.inputs.phases.filter((_, i) => i !== index),
              tasks: state.inputs.tasks.filter(t => t.phase !== doomed.name),
            },
          };
        }),
      addTask: phaseName =>
        set(state => ({
          inputs: {
            ...state.inputs,
            workTemplateId: CUSTOM_TEMPLATE_ID,
            tasks: [
              ...state.inputs.tasks,
              { id: uniqueTaskId(state.inputs.tasks), name: 'New work', phase: phaseName, share: 0, difficulty: 'routine' },
            ],
          },
        })),
      removeTask: id =>
        set(state => ({
          inputs: {
            ...state.inputs,
            workTemplateId: CUSTOM_TEMPLATE_ID,
            tasks: state.inputs.tasks.filter(t => t.id !== id),
          },
        })),
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
