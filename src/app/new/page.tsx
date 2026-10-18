import type { Metadata } from 'next';
import { NewCampaignWizard } from './NewCampaignWizard';

export const metadata: Metadata = { title: 'חלוקה חדשה' };

export default function NewCampaignPage() {
  return <NewCampaignWizard />;
}
