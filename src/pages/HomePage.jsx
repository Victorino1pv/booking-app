import React from 'react';
import { useBookings } from '../hooks/useBookings';
import { useBookingModal } from '../context/BookingModalContext';
import { format } from 'date-fns';
import { Truck, Users, CalendarClock, ArrowRight, Ban } from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { BookingStatus, MAX_CAPACITY } from '../domain/models';

export function HomePage() {
    const { bookings, vehicles, tours } = useBookings();
    const { openCreate, openEdit, openBulkBlock } = useBookingModal();
    const today = new Date().toISOString().split('T')[0];

    // Filter Today's Active Bookings
    // Filter Today's Active Bookings
    const todayBookings = bookings.filter(b =>
        b.pickup && // check structure
        b.tourRunId.startsWith(today) &&
        b.status !== BookingStatus.CANCELLED
    );

    // Quick Stats
    const paxCount = todayBookings.reduce((sum, b) => sum + b.seats, 0);

    return (
        <div className="p-8 h-full overflow-y-auto bg-gray-50">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold font-heading text-[var(--color-forest-green)]">
                    Welcome back, Victor
                </h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => openBulkBlock()}
                        className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold shadow-sm hover:shadow-md hover:bg-gray-50 flex items-center gap-2 transition-all"
                    >
                        <Ban size={18} />
                        <span>Block Dates</span>
                    </button>
                    <button
                        onClick={() => openCreate(today)}
                        className="btn btn-primary shadow-lg flex items-center gap-2"
                    >
                        <CalendarClock size={20} />
                        Create Booking
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Today's Overview */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <CalendarClock size={20} className="text-[var(--color-ocean-blue)]" />
                                Today's Overview
                            </h2>
                            <span className="text-sm text-gray-500 font-medium">
                                {format(new Date(), 'EEEE, MMMM do')}
                            </span>
                        </div>

                        {(() => {
                            // 1. Date Normalization
                            const todayKey = format(new Date(), 'yyyy-MM-dd');

                            // 2. Filter & Combine
                            const dailyBookings = bookings.filter(b =>
                                b.tourRunId.startsWith(todayKey) &&
                                b.status !== BookingStatus.CANCELLED &&
                                b.status !== BookingStatus.NO_SHOW // Optional: exclude No-show if desired, user said "and No-show if you use it" -> likely yes
                            );

                            // 3. Sort by Pickup Time -> Vehicle -> Guest
                            dailyBookings.sort((a, b) => {
                                // Primary: Pickup Time
                                if (a.pickup?.time && b.pickup?.time) {
                                    if (a.pickup.time !== b.pickup.time) return a.pickup.time.localeCompare(b.pickup.time);
                                }
                                // Fallback: Vehicle Name
                                const vehicleA = vehicles.find(v => v.id === a.tourRunId.split('-').slice(3).join('-'))?.name || '';
                                const vehicleB = vehicles.find(v => v.id === b.tourRunId.split('-').slice(3).join('-'))?.name || '';
                                if (vehicleA !== vehicleB) return vehicleA.localeCompare(vehicleB);

                                // Fallback: Guest Name
                                return (a.leadGuestName || '').localeCompare(b.leadGuestName || '');
                            });

                            if (dailyBookings.length === 0) {
                                return (
                                    <div className="p-8 bg-gray-50 rounded-lg border border-dashed text-center text-gray-400">
                                        <Truck size={48} className="mx-auto mb-3 opacity-20" />
                                        <p>No tours scheduled for today.</p>
                                    </div>
                                );
                            }

                            return (
                                <div className="space-y-3">
                                    {dailyBookings.map(b => {
                                        // Lookup Context
                                        const vehicleId = b.tourRunId.split('-').slice(3).join('-');
                                        const vehicle = vehicles.find(v => v.id === vehicleId);
                                        const tour = tours.find(t => t.id === b.tourOptionId);

                                        return (
                                            <a
                                                href="#"
                                                key={b.id}
                                                onClick={(e) => { e.preventDefault(); openEdit(b.id); }}
                                                className="block p-4 border rounded-lg hover:border-[var(--color-forest-green)] transition-all cursor-pointer group bg-white hover:shadow-md"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        {/* Header: Time & Vehicle */}
                                                        <div className="flex items-center gap-2 text-sm mb-1">
                                                            <span className="font-mono font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                                                                {b.pickup?.time || 'Pending'}
                                                            </span>
                                                            <span className="text-gray-400">•</span>
                                                            <span className="font-bold text-gray-600 flex items-center gap-1">
                                                                <Truck size={14} />
                                                                {vehicle?.name || 'Unknown Vehicle'}
                                                            </span>
                                                            {b.pickup?.location && (
                                                                <>
                                                                    <span className="text-gray-400">•</span>
                                                                    <span className="text-gray-500 truncate max-w-[150px]" title={b.pickup.location}>
                                                                        {b.pickup.location}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>

                                                        {/* Main: Guest & Tour */}
                                                        <div className="font-bold text-[var(--color-forest-green)] text-lg flex items-center gap-2">
                                                            {b.leadGuestName}
                                                            <span className="text-sm font-normal text-gray-500">
                                                                ({b.seats} pax)
                                                            </span>
                                                        </div>

                                                        <div className="text-sm text-gray-600 mt-0.5 flex items-center gap-2">
                                                            <span className="font-medium text-gray-800">
                                                                {tour?.name || 'Unknown Tour'}
                                                            </span>
                                                            {/* Rate Type Badge */}
                                                            <span className={clsx(
                                                                "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border",
                                                                b.rateType === 'PRIVATE'
                                                                    ? "bg-gray-100 text-gray-800 border-gray-200"
                                                                    : "bg-blue-50 text-blue-700 border-blue-100"
                                                            )}>
                                                                {b.rateType}
                                                            </span>
                                                        </div>

                                                        {/* Inline Notes */}
                                                        {b.notes && b.notes.trim() !== "" && (
                                                            <div className="mt-2 text-xs text-gray-500 bg-yellow-50 p-2 rounded border border-yellow-100 flex gap-2 items-start">
                                                                <span className="font-bold text-yellow-700 uppercase text-[10px] mt-0.5">Note</span>
                                                                <span className="italic">"{b.notes}"</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Status Badge */}
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className={clsx(
                                                            "px-2 py-1 rounded text-xs font-bold uppercase",
                                                            b.status === 'CONFIRMED' && "bg-green-100 text-green-800",
                                                            b.status === 'TENTATIVE' && "bg-yellow-50 text-yellow-600 border border-yellow-200",
                                                            b.status === 'DONE' && "bg-blue-50 text-blue-700"
                                                        )}>
                                                            {b.status}
                                                        </span>
                                                        {b.paymentStatus && b.paymentStatus !== 'PENDING' && (
                                                            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                                                                {b.paymentStatus}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </a>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Right Column: Reminders & Stats */}
                <div className="space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm border text-center">
                            <div className="text-3xl font-bold text-[var(--color-forest-green)]">{todayBookings.length}</div>
                            <div className="text-xs text-gray-500 font-bold uppercase mt-1">Today's Tours</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border text-center">
                            <div className="text-3xl font-bold text-[var(--color-ocean-blue)]">{paxCount}</div>
                            <div className="text-xs text-gray-500 font-bold uppercase mt-1">Total Pax</div>
                        </div>
                    </div>

                    {/* Active Reminders */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border h-fit">
                        <h3 className="font-bold mb-4 text-gray-800">Reminders</h3>

                        {(() => {
                            const reminders = bookings.filter(b =>
                                b.reminder &&
                                b.reminder.text &&
                                b.reminder.date &&
                                b.status !== BookingStatus.CANCELLED &&
                                new Date(b.reminder.date) >= new Date().setHours(0, 0, 0, 0) // Future or Today
                            ).sort((a, b) => new Date(a.reminder.date) - new Date(b.reminder.date));

                            if (reminders.length === 0) {
                                return (
                                    <div className="text-center py-8 text-gray-400 text-sm">
                                        <p>No active reminders</p>
                                    </div>
                                );
                            }

                            return (
                                <div className="space-y-4">
                                    {reminders.map(b => {
                                        // Parse tourRunId to get params
                                        // Format: YYYY-MM-DD-jeep-ID
                                        // Assume last part is ID, rest is date? NO.
                                        // Standard: [date]-[jeepId]
                                        // Jeep IDs are "jeep-1", "jeep-2".
                                        // So: 2024-05-20-jeep-1
                                        // Date is first 3 parts? 
                                        // Better: use b.tourRunId.replace(`-${jeepId}`, '') ? No we don't know jeepId.
                                        // We know date is 10 chars YYYY-MM-DD.
                                        const date = b.tourRunId.substring(0, 10);
                                        const jeepId = b.tourRunId.substring(11);

                                        return (
                                            <a
                                                href="#"
                                                key={b.id}
                                                onClick={(e) => { e.preventDefault(); openEdit(b.id); }}
                                                className="block p-3 bg-yellow-50 rounded border border-yellow-100 hover:border-yellow-300 transition-colors"
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-bold text-sm text-gray-800">{b.leadGuestName}</span>
                                                    <span className="text-xs font-semibold text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded">
                                                        {format(new Date(b.reminder.date), 'MMM d')}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-600 line-clamp-2">{b.reminder.text}</p>
                                            </a>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>

                    <Link to="/calendar" className="block w-full p-4 bg-[var(--color-forest-green)] text-white font-bold rounded-xl text-center shadow-lg hover:bg-[#234a38] transition-colors flex items-center justify-center gap-2">
                        Go to Calendar <ArrowRight size={18} />
                    </Link>
                </div>
            </div>
        </div >
    );
}
