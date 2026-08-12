import { DashboardClient } from '@/components/dashboard/DashboardClient';

/** Server shell — interactive UI lives in client islands. */
export default function DashboardPage() {
  return <DashboardClient />;
}
