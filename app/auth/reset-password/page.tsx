'use client';

import { useState, useEffect } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [hasSession, setHasSession] = useState(false);

    useEffect(() => {
        // Check initial session
        supabaseClient.auth.getSession().then(({ data: { session } }) => {
            if (session) setHasSession(true);
        });

        // Listen for changes
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth Event:", event);
            if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
                setHasSession(!!session);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    async function handleUpdatePassword(e: React.FormEvent) {
        e.preventDefault();

        if (!hasSession) {
            // Try one last time to get session
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) {
                setStatus('error');
                setMessage("Session expired or invalid link. Please request a new password reset.");
                return;
            }
        }

        if (password !== confirmPassword) {
            setStatus('error');
            setMessage("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            setStatus('error');
            setMessage("Password must be at least 6 characters long");
            return;
        }

        setLoading(true);
        setStatus('idle');
        setMessage('');

        try {
            // Get session token
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session?.access_token) {
                throw new Error("Session invalid");
            }

            const { resetPasswordAction } = await import("@/app/actions/auth"); // Dynamic import to avoid client-side clutter issues if any, or just import at top? 
            // Better to import at top but let's see if we can do it here or just add import. 
            // Wait, server actions can be imported in client components.

            const result = await resetPasswordAction(session.access_token, password);

            if (result.error) throw new Error(result.error);

            setStatus('success');
            setMessage('Password updated successfully! Redirecting...');

            // Fetch user role to redirect correctly
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
                // We need to know if they are admin or candidate.
                const { data: profile } = await supabaseClient
                    .from('profiles')
                    .select('role') // This assumes 'profiles' table has 'role'. If not, we might need a backup since we removed 'role' from profiles insert earlier?
                    // Wait, earlier I removed 'role' from profile insert in auth.ts because schema.sql didn't have it in my memory.
                    // But here I'm querying it. 
                    // To be safe, I should just default to CANDIDATE if query fails, or rely on metadata if I added it there.
                    // I added role to user_metadata in auth.ts.
                    .eq('id', user.id)
                    .single();

                // Fallback to metadata
                const role = profile?.role || user.user_metadata?.role || 'candidate';

                setTimeout(() => {
                    if (role === 'ADMIN') {
                        router.push('/admin/dashboard');
                    } else {
                        router.push('/candidate/application');
                    }
                }, 2000);
            } else {
                setTimeout(() => router.push('/auth/login'), 2000);
            }

        } catch (err: any) {
            console.error('Password update error:', err);
            setStatus('error');
            setMessage(err.message || "Failed to update password.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-6 text-center">Set New Password</h2>

                {status === 'processing' && (
                    <div className="p-4 mb-4 text-sm bg-blue-50 text-blue-700 rounded">
                        Verifying secure link...
                    </div>
                )}

                {message && (
                    <div className={`p-4 rounded mb-6 text-sm ${status === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            placeholder="••••••••"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 rounded-lg font-semibold text-white transition shadow-md
                            ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {loading ? 'Updating Password...' : 'Update Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
