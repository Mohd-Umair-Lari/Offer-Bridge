import { Suspense } from 'react';
import RoleSelectionModal from '@/components/auth/RoleSelectionModal';

export const metadata = {
  title: 'Choose Your Role - GoZivo',
  description: 'Select your role to get started',
};

function RoleSelectionLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F7FA] to-white flex items-center justify-center">
      <div className="text-gray-400">Loading...</div>
    </div>
  );
}

export default function RoleSelectionPage() {
  return (
    <Suspense fallback={<RoleSelectionLoading />}>
      <RoleSelectionModal />
    </Suspense>
  );
}
