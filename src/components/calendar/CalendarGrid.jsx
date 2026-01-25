import React, { useState } from 'react';
import { format, addDays, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayCell } from './DayCell';
import { useBookings } from '../../hooks/useBookings';

export function CalendarGrid({ onSelectDay }) {
    const { vehicles, bookings, tours } = useBookings();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedCell, setSelectedCell] = useState(null);

    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

    const handleDayClick = (dateStr, jeepId) => {
        setSelectedCell({ date: dateStr, jeepId });
        onSelectDay({ date: dateStr, jeepId });
    };

    const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
    const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));

    return (
        <div className="card w-full overflow-hidden">
            {/* Calendar Toolbar */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b">
                <div className="flex items-center gap-4">
                    <button onClick={prevWeek} className="btn btn-secondary p-1">
                        <ChevronLeft size={20} />
                    </button>
                    <h3 className="text-lg font-bold">
                        {format(startDate, 'MMMM yyyy')}
                        <span className="text-sm font-normal text-gray-500 ml-2">
                            Week of {format(startDate, 'MMM d')}
                        </span>
                    </h3>
                    <button onClick={nextWeek} className="btn btn-secondary p-1">
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">Go to:</span>
                    <input
                        type="date"
                        value={format(currentDate, 'yyyy-MM-dd')}
                        onChange={(e) => {
                            if (e.target.valueAsDate) setCurrentDate(e.target.valueAsDate);
                        }}
                        className="p-1 border rounded text-sm bg-gray-50 hover:bg-white transition-colors"
                    />
                </div>

                <div className="flex gap-2">
                    <div className="flex items-center gap-1 text-xs">
                        <div className="w-3 h-3 bg-gray-100 border"></div> <span>Empty</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                        <div className="w-3 h-3 bg-blue-100 border-none"></div> <span>Shared</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                        <div className="w-3 h-3 bg-gray-200 border border-dashed border-gray-400"></div> <span>Private</span>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="w-full overflow-x-auto">
                <div className="min-w-[800px]">
                    {/* Header Row */}
                    <div className="grid grid-cols-[150px_repeat(7,1fr)] gap-2 mb-2">
                        <div className="font-bold text-gray-400 text-sm uppercase flex items-end p-2">
                            Jeep
                        </div>
                        {weekDays.map(day => (
                            <div key={day.toString()} className="text-center p-2 bg-gray-50 rounded">
                                <div className="font-bold text-[var(--color-forest-green)]">{format(day, 'EEE')}</div>
                                <div className="text-sm">{format(day, 'd MMM')}</div>
                            </div>
                        ))}
                    </div>


                    {/* Vehicle Rows */}
                    <div className="space-y-2">
                        {vehicles.filter(v => v.isActive).map(vehicle => (
                            <div key={vehicle.id} className="grid grid-cols-[150px_repeat(7,1fr)] gap-2">
                                {/* Vehicle Header */}
                                <div className="flex flex-col justify-center p-2 bg-[var(--color-forest-green)] text-white rounded shadow-sm">
                                    <span className="font-bold truncate">{vehicle.name}</span>
                                    <span className="text-xs opacity-80 truncate">{vehicle.driverName || 'No Driver'}</span>
                                    <span className="text-[10px] opacity-60 mt-1">{vehicle.seatCapacity} Seats</span>
                                </div>

                                {/* Days */}
                                {weekDays.map(day => {
                                    const dateStr = format(day, "yyyy-MM-dd");
                                    return (
                                        <DayCell
                                            key={dateStr}
                                            day={day}
                                            jeepId={vehicle.id}
                                            onSelect={handleDayClick}
                                            isSelected={selectedCell?.date === dateStr && selectedCell?.jeepId === vehicle.id}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div></div></div>
    );
}
