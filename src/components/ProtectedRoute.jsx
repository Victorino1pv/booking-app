import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-[var(--color-sand)]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-[var(--color-forest-green)] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[var(--color-forest-green)] font-bold animate-pulse">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
