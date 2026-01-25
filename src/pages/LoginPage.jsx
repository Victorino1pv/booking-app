import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock } from 'lucide-react';

export function LoginPage() {
    const { signIn } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await signIn(email, password);
            navigate('/');
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--color-sand)] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md p-8 rounded-xl shadow-lg border border-gray-100">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-[var(--color-forest-green)] rounded-lg flex items-center justify-center text-white mx-auto mb-4">
                        <Lock size={24} />
                    </div>
                    <h1 className="text-2xl font-bold font-heading text-[var(--color-forest-green)]">Welcome Back</h1>
                    <p className="text-gray-500 text-sm mt-1">Sign in to manage bookings</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded text-sm mb-4 border border-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[var(--color-forest-green)] outline-none transition-all"
                            placeholder="user@example.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[var(--color-forest-green)] outline-none transition-all"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[var(--color-forest-green)] text-white font-bold py-3 rounded-lg hover:bg-[#244a39] transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-gray-400">
                    Protected by Supabase Auth
                </div>
            </div>
        </div>
    );
}
