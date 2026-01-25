import React, { useMemo, useState } from 'react';
import { useBookings } from '../../hooks/useBookings';
import { getTourRunState } from '../../domain/rules';
import { RateType, BookingStatus } from '../../domain/models';
import { X, User, Calendar, Plus, Edit, Ban, Unlock } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

export function DayOverviewModal({ date, jeepId, onClose, onEditBooking, onCreateBooking }) {
    const { bookings, tours, vehicles, vehicleBlocks, blockVehicle, unblockVehicle } = useBookings();
    const [showBlockForm, setShowBlockForm] = useState(false);
    const [blockReason, setBlockReason] = useState('');

    const tourRunState = useMemo(() => {
        return getTourRunState(bookings, date, jeepId, null, 6, vehicleBlocks);
    }, [bookings, date, jeepId, vehicleBlocks]);

    const vehicleName = vehicles.find(v => v.id === jeepId)?.name || 'Vehicle';
    const tourName = tours.find(t => t.id === tourRunState.tourOptionId)?.name || 'Unknown Tour';

    const canAddBooking = !tourRunState.isFull && !tourRunState.isBlocked && tourRunState.type !== RateType.PRIVATE;
    const canBlock = tourRunState.activeBookings.length === 0 && !tourRunState.isBlocked;

    const handleBlock = () => {
        if (!blockReason.trim()) return;
        blockVehicle({
            vehicleId: jeepId,
            date: date,
            reason: blockReason
        });
        setShowBlockForm(false);
        setBlockReason('');
    };

    const handleUnblock = () => {
        if (tourRunState.blockId) {
            unblockVehicle(tourRunState.blockId);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border">
                {/* Header */}
                <div className={clsx(
                    "text-white p-6 flex justify-between items-start",
                    tourRunState.isBlocked ? "bg-gray-800" : "bg-[var(--color-forest-green)]"
                )}>
                    <div>
                        <div className="flex items-center gap-2 opacity-80 text-sm mb-1">
                            <Calendar size={14} />
                            {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                        </div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            {vehicleName}
                            {tourRunState.isBlocked && <Ban size={20} className="text-red-400" />}
                        </h2>
                        <div className="mt-2 inline-flex items-center gap-2 text-sm bg-white/20 px-2 py-1 rounded">
                            <span className="font-semibold">
                                {tourRunState.isBlocked ? 'UNAVAILABLE' : (tourRunState.type || 'EMPTY')}
                            </span>
                            {!tourRunState.isBlocked && tourRunState.type && (
                                <>
                                    <span>•</span>
                                    <span>{tourName}</span>
                                </>
                            )}
                            {tourRunState.type === RateType.SHARED && (
                                <>
                                    <span>•</span>
                                    <span>{tourRunState.occupiedSeats} / {vehicles.find(v => v.id === jeepId)?.seatCapacity || 6} Seats</span>
                                </>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {tourRunState.isBlocked ? (
                        <div className="text-center py-8 space-y-4">
                            <div className="bg-red-50 text-red-800 p-4 rounded-lg border border-red-100">
                                <h3 className="font-bold mb-1">Vehicle Unavailable</h3>
                                <p className="text-sm">{tourRunState.blockReason || 'No reason provided'}</p>
                            </div>
                            <button
                                onClick={handleUnblock}
                                className="btn bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-2 mx-auto px-4 py-2 rounded-lg transition-colors border"
                            >
                                <Unlock size={16} />
                                Unblock Vehicle
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tourRunState.activeBookings.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 italic">No active bookings for this vehicle.</div>
                            ) : (
                                tourRunState.activeBookings.map(b => (
                                    <button
                                        key={b.id}
                                        onClick={() => onEditBooking(b.id)}
                                        className="w-full text-left border rounded-lg p-3 hover:bg-gray-50 transition-colors flex justify-between items-center group"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-gray-800">{b.leadGuestName}</span>
                                                <span className="text-sm text-gray-500">{b.seats} pax</span>
                                                {/* Status Badge */}
                                                <span className={clsx(
                                                    "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                                                    b.status === 'CONFIRMED' && "bg-green-100 text-green-800",
                                                    b.status === 'TENTATIVE' && "bg-white border border-yellow-500 text-yellow-600",
                                                    b.status === 'DONE' && "bg-green-50 text-green-700",
                                                    b.status === 'CANCELLED' && "bg-gray-100 text-gray-400"
                                                )}>
                                                    {b.status.substring(0, 3)}
                                                </span>
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-3">
                                                <span>{b.phone}</span>
                                            </div>
                                        </div>
                                        <div className="text-[var(--color-forest-green)] opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Edit size={16} />
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    )}

                    {/* Footer / Actions */}
                    <div className="mt-8 space-y-3">
                        {canAddBooking && (
                            <button
                                onClick={() => onCreateBooking(date, jeepId)}
                                className="w-full btn btn-primary py-3 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
                            >
                                <Plus size={18} />
                                Add Booking
                            </button>
                        )}

                        {/* Block Action (Only if empty and not blocking form) */}
                        {canBlock && !showBlockForm && (
                            <button
                                onClick={() => setShowBlockForm(true)}
                                className="w-full btn bg-red-50 text-red-600 hover:bg-red-100 py-2 border border-red-100 flex items-center justify-center gap-2 transition-colors"
                            >
                                <Ban size={16} />
                                Block as Unavailable
                            </button>
                        )}

                        {/* Block Logic Form */}
                        {showBlockForm && (
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 animate-in slide-in-from-top-2 duration-200">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for blocking</label>
                                <input
                                    autoFocus
                                    type="text"
                                    className="w-full p-2 border rounded mb-3 text-sm"
                                    placeholder="e.g. Maintenance, Driver Off..."
                                    value={blockReason}
                                    onChange={e => setBlockReason(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleBlock}
                                        disabled={!blockReason.trim()}
                                        className="flex-1 btn bg-red-600 hover:bg-red-700 text-white py-1.5 text-sm"
                                    >
                                        Confirm Block
                                    </button>
                                    <button
                                        onClick={() => setShowBlockForm(false)}
                                        className="btn bg-white border hover:bg-gray-50 text-gray-600 py-1.5 px-3 text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {!canAddBooking && !tourRunState.isBlocked && !canBlock && (
                            <div className="w-full bg-gray-100 text-gray-500 py-3 rounded-lg text-center text-sm font-medium border border-dashed border-gray-300">
                                {tourRunState.type === RateType.PRIVATE ? 'Day is Private' : 'Day is Full'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
