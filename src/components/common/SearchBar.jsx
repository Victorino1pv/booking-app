import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, Calendar, User, Phone, MapPin, FileText, CalendarClock } from 'lucide-react';
import { useBookings } from '../../hooks/useBookings';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export function SearchBar() {
    const { bookings, tours } = useBookings();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const results = useMemo(() => {
        if (!query || query.length < 2) return [];

        const lowerQuery = query.toLowerCase();

        return bookings.filter(b => {
            // Searchable fields
            return (
                b.leadGuestName?.toLowerCase().includes(lowerQuery) ||
                b.email?.toLowerCase().includes(lowerQuery) ||
                b.phone?.includes(lowerQuery) ||
                b.pickup?.location?.toLowerCase().includes(lowerQuery) ||
                b.notes?.toLowerCase().includes(lowerQuery)
            );
        }).sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate)); // Newest first
    }, [bookings, query]);

    const handleSelect = (booking) => {
        const date = booking.tourRunId.substring(0, 10);
        const jeepId = booking.tourRunId.substring(11);

        navigate(`/calendar?date=${date}&jeepId=${jeepId}&bookingId=${booking.id}`);
        setIsOpen(false);
        setQuery('');
    };

    return (
        <div className="relative w-full max-w-md" ref={wrapperRef}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                    type="text"
                    className="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-forest-green)] focus:bg-white transition-all"
                    placeholder="Search bookings..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                />
                {query && (
                    <button
                        onClick={() => { setQuery(''); setIsOpen(false); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Results Dropdown */}
            {isOpen && query.length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-96 overflow-y-auto z-50">
                    {results.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                            No bookings found for "{query}"
                        </div>
                    ) : (
                        <div className="py-2">
                            <div className="px-3 pb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                {results.length} Result{results.length !== 1 && 's'}
                            </div>
                            {results.map(b => (
                                <button
                                    key={b.id}
                                    onClick={() => handleSelect(b)}
                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-start gap-3 border-b last:border-0 border-gray-50 transition-colors"
                                >
                                    <div className={`mt-1 p-1.5 rounded-full ${b.status === 'CANCELLED' ? 'bg-red-100 text-red-600' :
                                        b.status === 'CONFIRMED' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        <User size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-gray-800 truncate">{b.leadGuestName}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase font-bold ${b.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'
                                                }`}>
                                                {b.status}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                            <div className="flex items-center gap-1" title="Tour Date">
                                                <Calendar size={12} />
                                                {format(new Date(b.tourRunId.substring(0, 10)), 'MMM d')}
                                            </div>
                                            <div className="flex items-center gap-1" title="Pax">
                                                <User size={12} />
                                                {b.seats}
                                            </div>
                                            {b.pickup && (
                                                <div className="flex items-center gap-1 truncate" title="Pickup">
                                                    <MapPin size={12} />
                                                    {b.pickup.location}
                                                </div>
                                            )}
                                        </div>

                                        {/* Tour Name & Icons */}
                                        <div className="mt-1 flex justify-between items-center">
                                            <span className="text-xs text-[var(--color-ocean-blue)] font-medium truncate pr-2">
                                                {tours.find(t => t.id === b.tourOptionId)?.name || 'Unknown Tour'}
                                            </span>

                                            <div className="flex gap-1">
                                                {b.notes && <FileText size={12} className="text-gray-400" />}
                                                {b.reminder && <CalendarClock size={12} className="text-yellow-500" />}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
