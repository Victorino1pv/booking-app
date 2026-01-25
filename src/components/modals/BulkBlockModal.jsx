import React, { useState } from 'react';
import { X, Calendar, AlertTriangle } from 'lucide-react';
import { useBookings } from '../../hooks/useBookings';
import clsx from 'clsx';

export function BulkBlockModal({ onClose }) {
    const { vehicles, blockVehicleRange } = useBookings();

    // Form State
    const [vehicleId, setVehicleId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');

    // Result State
    const [result, setResult] = useState(null); // { successCount, skippedDates }
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!vehicleId || !startDate || !endDate) return;

        setIsSubmitting(true);
        try {
            // Add small delay for UX if synchronous
            await new Promise(r => setTimeout(r, 500));

            const res = blockVehicleRange(vehicleId, startDate, endDate, reason || 'Unavailable');
            setResult(res);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (result) {
        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="p-6 text-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                            <Calendar size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Block Complete</h3>
                        <p className="text-gray-600 mb-6">
                            Successfully blocked <strong>{result.successCount}</strong> days.
                        </p>

                        {result.skippedDates.length > 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6 text-left">
                                <div className="flex gap-2 text-yellow-800 font-medium mb-1 items-center">
                                    <AlertTriangle size={16} />
                                    <span>Skipped {result.skippedDates.length} days (Occupied)</span>
                                </div>
                                <div className="text-xs text-yellow-700 max-h-24 overflow-y-auto">
                                    {result.skippedDates.join(', ')}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={onClose}
                            className="btn btn-primary w-full py-2"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h2 className="font-bold text-lg text-gray-800">Block Multiple Dates</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Vehicle</label>
                        <select
                            className="w-full p-2 border rounded bg-white"
                            value={vehicleId}
                            onChange={(e) => setVehicleId(e.target.value)}
                            required
                        >
                            <option value="">Select Vehicle...</option>
                            {vehicles.filter(v => v.isActive).map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Start Date</label>
                            <input
                                type="date"
                                className="w-full p-2 border rounded"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">End Date</label>
                            <input
                                type="date"
                                className="w-full p-2 border rounded"
                                value={endDate}
                                min={startDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Reason</label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded"
                            placeholder="e.g. Maintenance, Off Duty"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isSubmitting || !startDate || !endDate || !vehicleId}
                            className={clsx(
                                "w-full py-3 rounded-lg font-bold text-white transition-all shadow-md flex justify-center items-center gap-2",
                                (isSubmitting || !startDate || !endDate || !vehicleId) ? "bg-gray-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 hover:shadow-lg"
                            )}
                        >
                            {isSubmitting ? 'Blocking...' : 'Block Dates'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
