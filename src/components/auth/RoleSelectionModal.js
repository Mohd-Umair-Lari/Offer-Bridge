"use client";
import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShoppingBag, CreditCard, Zap } from 'lucide-react';

export default function RoleSelectionModal() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const roles = [
    {
      id: 'customer',
      label: 'Consumer',
      description: 'Browse offers and create purchase requests',
      icon: <ShoppingBag size={32} />,
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: 'provider',
      label: 'Card Provider',
      description: 'Manage cards and fulfill requests',
      icon: <CreditCard size={32} />,
      color: 'from-purple-500 to-purple-600',
    },
    {
      id: 'customer_provider',
      label: 'Both Roles',
      description: 'Use both consumer and provider features',
      icon: <Zap size={32} />,
      color: 'from-amber-500 to-amber-600',
    },
  ];

  const handleRoleSelection = async (role) => {
    if (loading) return;
    setSelectedRole(role);
    setLoading(true);
    setError('');

    try {
      console.log('[RoleSelection] Saving role:', role);
      
      // Get user session
      const sessionRes = await fetch('/api/auth/session');
      const session = await sessionRes.json();
      
      if (!session?.user?.email) {
        throw new Error('No session found');
      }

      // Save role to database
      const res = await fetch('/api/auth/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session.user.email,
          role: role,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save role');
      }

      console.log('[RoleSelection] Role saved successfully');
      
      // Redirect to dashboard
      setTimeout(() => {
        router.push('/');
      }, 500);
    } catch (err) {
      console.error('[RoleSelection] Error:', err);
      setError(err.message || 'Failed to save role. Please try again.');
      setLoading(false);
      setSelectedRole(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F7FA] to-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#1a1a2e] mb-2">Choose Your Role</h1>
          <p className="text-gray-600">
            Select how you'd like to use GoZivo. You can change this later in settings.
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {roles.map((role) => {
            const isSelected = selectedRole === role.id;
            const isProcessing = loading && isSelected;

            return (
              <button
                key={role.id}
                onClick={() => handleRoleSelection(role.id)}
                disabled={loading}
                className={`relative p-6 rounded-2xl border-2 transition-all duration-300 transform hover:scale-105 ${
                  isSelected
                    ? 'border-[#185FA5] bg-[#E6F1FB] shadow-lg'
                    : 'border-gray-200 bg-white hover:border-[#185FA5]'
                } ${loading && !isSelected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {/* Background gradient accent */}
                <div
                  className={`absolute inset-0 opacity-10 rounded-2xl bg-gradient-to-br ${role.color}`}
                />

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center gap-4">
                  {/* Icon */}
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-white bg-gradient-to-br ${role.color}`}
                  >
                    {isProcessing ? (
                      <Loader2 size={24} className="animate-spin" />
                    ) : (
                      role.icon
                    )}
                  </div>

                  {/* Label */}
                  <h3 className="text-lg font-bold text-[#1a1a2e]">{role.label}</h3>

                  {/* Description */}
                  <p className="text-sm text-gray-600 text-center">{role.description}</p>

                  {/* Checkmark */}
                  {isSelected && (
                    <div className="mt-2 w-6 h-6 bg-[#185FA5] rounded-full flex items-center justify-center">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-blue-700 text-sm">
            <strong>Tip:</strong> If you select both roles, you'll have access to consumer features (browse, request)
            and provider features (manage cards, fulfill requests).
          </p>
        </div>
      </div>
    </div>
  );
}
