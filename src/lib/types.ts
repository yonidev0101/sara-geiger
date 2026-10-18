import type { Kind } from './divisions';

export type UnitStatus = 'free' | 'taken' | 'read';
export type DedicationKind = 'ilui' | 'refua' | 'hatzlacha';

export const DEDICATION_LABELS: Record<DedicationKind, string> = {
  ilui: 'לעילוי נשמת',
  refua: 'לרפואת',
  hatzlacha: 'להצלחת',
};

export interface PublicUnit {
  id: number;
  idx: number;
  label: string;
  sublabel: string | null;
  detail: string;
  group: string;
  ref: string;
  status: UnitStatus;
  takerName: string | null;
  mine: boolean;
}

export interface PublicCampaign {
  slug: string;
  title: string;
  kind: Kind;
  kindLabel: string;
  openerName: string | null;
  deadline: string | null;
  round: number;
  completedRounds: number;
  status: 'active' | 'closed';
  isPublic: boolean;
  autoRenew: boolean;
}

export interface Counts {
  free: number;
  taken: number;
  read: number;
  total: number;
}

export interface CampaignState {
  campaign: PublicCampaign;
  units: PublicUnit[];
  dedications: { kind: DedicationKind; name: string }[];
  counts: Counts;
}

export interface AdminUnit extends PublicUnit {
  takenAt: string | null;
  readAt: string | null;
}

export interface AdminState extends CampaignState {
  units: AdminUnit[];
  adminDedications: { id: number; kind: DedicationKind; name: string; hidden: boolean }[];
}

export interface CampaignSummary {
  slug: string;
  title: string;
  kindLabel: string;
  openerName: string | null;
  round: number;
  counts: Counts;
}
