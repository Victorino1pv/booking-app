import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Home, Calendar, PieChart, Settings, LogOut, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { SearchBar } from '../common/SearchBar';

export function Layout() {
    return (
        <div className="flex h-screen bg-[var(--color-sand)] font-body text-[var(--color-text-main)]">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r flex flex-col shadow-lg z-20">
                <div className="p-6 border-b flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[var(--color-forest-green)] flex items-center justify-center text-white font-bold">
                        M
                    </div>
                    <span className="font-heading font-bold text-lg text-[var(--color-forest-green)]">
                        Madeira G&B
                    </span>
                </div>

                {/* Search */}
                <div className="p-4 border-b">
                    <SearchBar />
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <NavItem to="/" icon={Home} label="Home" />
                    <NavItem to="/calendar" icon={Calendar} label="Calendar" />
                    <NavItem to="/bookings" icon={Users} label="Management" />
                    <NavItem to="/reports" icon={PieChart} label="Reports" />
                    <NavItem to="/settings" icon={Settings} label="Settings" />
                </nav>

                <div className="p-4 border-t">
                    <button
                        onClick={() => {
                            if (confirm('Reset all data?')) {
                                localStorage.clear();
                                window.location.reload();
                            }
                        }}
                        className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Reset Data</span>
                    </button>
                    <div className="mt-4 flex items-center gap-3 px-4">
                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border-2 border-white shadow-sm">
                            <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="User" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-800">Victor Daniel</p>
                            <p className="text-xs text-gray-500">Admin</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                <Outlet />
            </main>
        </div>
    );
}

function NavItem({ to, icon: Icon, label }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) => clsx(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all",
                isActive
                    ? "bg-[var(--color-forest-green)] text-white shadow-md font-semibold"
                    : "text-gray-600 hover:bg-gray-50 hover:text-[var(--color-forest-green)]"
            )}
        >
            <Icon size={20} />
            <span>{label}</span>
        </NavLink>
    );
}
