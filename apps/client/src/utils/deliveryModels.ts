import type { ImplementationModel } from '@ai-roi-calc/engine';

export interface DeliveryModelInfo {
  id: ImplementationModel;
  label: string;
  description: string;
  watchOut: string;
}

export const DELIVERY_MODEL_INFO: DeliveryModelInfo[] = [
  {
    id: 'onshore',
    label: 'Onshore',
    description: 'Local team, no AI. With the same location mix as today, this is the status quo reference.',
    watchOut: 'Highest run cost; no productivity gain.',
  },
  {
    id: 'bcc-only',
    label: 'BCC only',
    description: 'Move the delivery share to a best-cost country. Same team size, lower rates.',
    watchOut: 'Transition and governance costs; no AI productivity gain.',
  },
  {
    id: 'onshore-ai',
    label: 'Onshore + AI',
    description: 'Local team augmented with AI, following the AI plan entered in roles and cost lines.',
    watchOut: 'Onshore rates remain; savings come from AI only.',
  },
  {
    id: 'ai-bcc',
    label: 'AI + BCC',
    description: 'AI plan delivered with a best-cost-country team. Combines both savings levers.',
    watchOut: 'Two changes at once raise transition risk.',
  },
  {
    id: 'ai-first',
    label: 'AI-first',
    description: 'Onshore with deeper AI adoption than the plan: more automation, fewer manual roles.',
    watchOut: 'Depends on AI maturity; validate adoption depth with a pilot.',
  },
];

export const deliveryModelInfo = (id: ImplementationModel): DeliveryModelInfo =>
  DELIVERY_MODEL_INFO.find(m => m.id === id) ?? DELIVERY_MODEL_INFO[2]!;
