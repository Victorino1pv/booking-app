import React from 'react';
import { Ban } from 'lucide-react';
import { useBookings } from '../../hooks/useBookings';
import { MAX_CAPACITY } from '../../domain/models';
import { getTourRunState } from '../../domain/rules';
import { format } from 'date-fns';
import clsx from 'clsx';

export function DayCell({ day, jeepId, onSelect, isSelected }) {
    const { bookings, tours, vehicleBlocks, vehicles } = useBookings();

    const vehicle = vehicles.find(v => v.id === jeepId);
    const capacity = vehicle?.seatCapacity || MAX_CAPACITY;

    // Get the state of this specific tour run (Jeep + Day)
    const runState = getTourRunState(
        bookings,
        format(day, 'yyyy-MM-dd'),
        jeepId,
        null,
        capacity,
        vehicleBlocks
    );

    const isToday = format(new Date(), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');

    // Get Tour Name if exists
    const tourName = runState.tourOptionId ? tours.find(t => t.id === runState.tourOptionId)?.name : null;

    return (
        <div
            onClick={() => onSelect(format(day, 'yyyy-MM-dd'), jeepId)}
            role="button"
            aria-label={runState.isBlocked
                ? `Vehicle unavailable on ${format(day, 'MMM d')}: ${runState.blockReason || 'No reason'}`
                : `Select ${format(day, 'MMM d')}`}
            className={clsx(
                "border rounded p-2 h-24 relative cursor-pointer transition-all overflow-hidden group",
                "hover:shadow-md",
                isToday ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white",
                runState.isFull && "opacity-75 bg-gray-100",
                runState.isBlocked && "bg-red-600 text-white hover:bg-red-700"
            )}
        >
            <div className="font-bold text-gray-500 text-xs mb-1">{format(day, 'd')}</div>

            {/* Content */}
            {/* Content */}
            {runState.type ? (
                <div className="text-sm">
                    <div className="font-bold text-gray-800 truncate">{tourName}</div>
                    <div className="flex items-center gap-1 mt-1">
                        <span className={`text-xs px-1 rounded ${runState.type === 'SHARED' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-800'}`}>
                            {runState.type}
                        </span>
                        {runState.type === 'SHARED' && (
                            <span className="text-xs text-gray-500">{runState.occupiedSeats}/{MAX_CAPACITY}</span>
                        )}
                    </div>
                </div>
            ) : runState.isBlocked ? (
                <div
                    className="h-full w-full absolute inset-0 flex items-center justify-center p-1"
                    title={`Unavailable: ${runState.blockReason || 'No reason provided'}. Click to manage.`}
                >
                    <span
                        className="font-bold text-white text-xs uppercase tracking-wide"
                        style={{ fontFamily: 'var(--font-heading)' }}
                    >
                        BLOCKED
                    </span>
                </div>
            ) : (
                <div className="text-center text-gray-400 text-xs mt-4">
                    -
                </div>
            )}
        </div>
    );
}
