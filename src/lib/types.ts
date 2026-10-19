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
  /** Number of chapters (or chapter parts) in this unit. */
  parts: number;
  /** Indexes of the parts the taker has marked as read. */
  progress: number[];
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
  releaseDays: number | null;
  /** The campaign's own dedication, shown up front instead of the default one. */
  dedication: { kind: DedicationKind; name: string } | null;
}

export interface Counts {
  free: number;
  taken: number;
  read: number;
  total: number;
}

export interface ActivityItem {
  kind: 'take' | 'read' | 'complete';
  name: string | null;
  count: number;
  at: string;
}

export interface CampaignState {
  campaign: PublicCampaign;
  units: PublicUnit[];
  dedications: { kind: DedicationKind; name: string }[];
  counts: Counts;
  activity: ActivityItem[];
  participants: number;
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
  dedication: { kind: DedicationKind; name: string } | null;
  kindLabel: string;
  openerName: string | null;
  round: number;
  deadline: string | null;
  participants: number;
  counts: Counts;
}

export interface MyUnit {
  id: number;
  label: string;
  sublabel: string | null;
  detail: string;
  ref: string;
  parts: number;
  progress: number[];
  status: 'taken' | 'read';
  campaignSlug: string;
  campaignTitle: string;
  campaignActive: boolean;
}

export interface ReaderUnit {
  dedication: { kind: DedicationKind; name: string } | null;
  id: number;
  label: string;
  detail: string;
  ref: string;
  parts: number;
  status: UnitStatus;
  mine: boolean;
  campaignSlug: string;
  campaignTitle: string;
  campaignActive: boolean;
}
