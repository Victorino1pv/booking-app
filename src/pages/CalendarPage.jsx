import React, { useState } from 'react';
import { Calendar, Ban, Plus } from 'lucide-react';
import { CalendarGrid } from '../components/calendar/CalendarGrid';
import { useSearchParams } from 'react-router-dom';
import { useBookings } from '../hooks/useBookings';
import { useBookingModal } from '../context/BookingModalContext';
import { getTourRunState } from '../domain/rules';
import { DayOverviewModal } from '../components/calendar/DayOverviewModal';

export function CalendarPage() {
    const { openCreate, openEdit, openBulkBlock } = useBookingModal();
    const [searchParams] = useSearchParams();
    const { jeeps, bookings, vehicleBlocks } = useBookings();
    const [dayOverview, setDayOverview] = useState(null);

    // Deep Linking
    React.useEffect(() => {
        const date = searchParams.get('date');
        const bookingId = searchParams.get('bookingId');
        const create = searchParams.get('create');

        if (bookingId) {
            openEdit(bookingId);
        } else if (create === 'true' && date) {
            openCreate(date);
        }
    }, [searchParams, openCreate, openEdit]);

    return (
        <div className="flex flex-col h-full bg-[var(--color-sand)] p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Calendar className="text-[var(--color-earth)]" size={24} />
                    <h2 className="text-2xl font-semibold">Bookings Calendar</h2>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => openBulkBlock()}
                        className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold shadow-sm hover:shadow-md hover:bg-gray-50 flex items-center gap-2 transition-all"
                    >
                        <Ban size={18} />
                        <span>Block Dates</span>
                    </button>
                    <button
                        onClick={() => openCreate(new Date().toISOString().split('T')[0])}
                        className="btn btn-primary px-4 py-2 rounded-lg font-bold shadow-sm hover:shadow-md flex items-center gap-2 transition-all"
                    >
                        <Plus size={20} />
                        <span>New Booking</span>
                    </button>
                </div>
            </div>

            <div className="h-full overflow-hidden">
                <div className="h-full overflow-y-auto pb-20">
                    <CalendarGrid onSelectDay={(selection) => {
                        // Always open the overview modal to allow viewing details, blocking, or adding bookings
                        // (Previously this auto-opened the create form for empty days, but that prevented blocking)
                        setDayOverview({ date: selection.date, jeepId: selection.jeepId });
                    }} />
                </div>
            </div>

            {/* Day Overview Modal */}
            {dayOverview && (
                <DayOverviewModal
                    date={dayOverview.date}
                    jeepId={dayOverview.jeepId}
                    onClose={() => setDayOverview(null)}
                    onEditBooking={(id) => {
                        setDayOverview(null);
                        openEdit(id);
                    }}
                    onCreateBooking={(d, j) => {
                        setDayOverview(null);
                        openCreate(d, j);
                    }}
                />
            )}
        </div>
    );
}
