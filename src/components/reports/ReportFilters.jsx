import React from 'react';
import { Filter, Calendar, Users, Briefcase, MapPin } from 'lucide-react';
import clsx from 'clsx';
import { BookingStatus, PaymentStatus } from '../../domain/models';

export function ReportFilters({
    filters,
    onFilterChange,
    onGenerate,
    onReset,
    availableAgents,
    availableSources,
    availableVehicles,
    sortConfig,
    onSortChange,
    availableTours
}) {
    // Helpers
    const handleMultiChange = (field, value) => {
        const current = filters[field] || [];
        const exists = current.includes(value);
        let updated;
        if (exists) {
            updated = current.filter(v => v !== value);
        } else {
            updated = [...current, value];
        }
        onFilterChange(field, updated);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6 print:hidden">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                {/* Date Range (Required) */}
                <div className="md:col-span-2 grid grid-cols-2 gap-4 border-r pr-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start Date</label>
                        <input
                            type="date"
                            className="w-full p-2 border rounded font-mono text-sm"
                            value={filters.startDate}
                            onChange={e => onFilterChange('startDate', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End Date</label>
                        <input
                            type="date"
                            className="w-full p-2 border rounded font-mono text-sm"
                            value={filters.endDate}
                            onChange={e => onFilterChange('endDate', e.target.value)}
                        />
                    </div>

                    {/* Sorting Controls */}
                    <div className="md:col-span-2 grid grid-cols-2 gap-4 pl-4 border-l md:border-l-0 lg:border-l">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sort By</label>
                            <select
                                className="w-full p-2 border rounded text-sm"
                                value={sortConfig.field}
                                onChange={e => onSortChange({ ...sortConfig, field: e.target.value })}
                            >
                                <option value="DATE">Tour Date</option>
                                <option value="GUEST">Guest Name</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Order</label>
                            <select
                                className="w-full p-2 border rounded text-sm"
                                value={sortConfig.direction}
                                onChange={e => onSortChange({ ...sortConfig, direction: e.target.value })}
                            >
                                <option value="DESC">Newest / Z-A</option>
                                <option value="ASC">Oldest / A-Z</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Multi Select Filters */}
                <div className="md:col-span-2 space-y-3">
                    {/* Dropdowns Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                        {/* Status Dropdown */}
                        <select
                            className={clsx("w-full p-2 border rounded text-sm", (filters.status || []).length > 0 && !(filters.status.includes(BookingStatus.CONFIRMED) && filters.status.includes(BookingStatus.TENTATIVE) && filters.status.includes(BookingStatus.DONE)) ? "border-blue-500 bg-blue-50" : "")}
                            onChange={e => {
                                const val = e.target.value;
                                if (val === 'ALL') {
                                    // Set to Active statuses
                                    onFilterChange('status', [BookingStatus.CONFIRMED, BookingStatus.TENTATIVE, BookingStatus.DONE]);
                                } else if (val === 'CANCELLED') {
                                    // Set to ONLY Cancelled
                                    onFilterChange('status', [BookingStatus.Cancelled]);
                                } else {
                                    // Specific status
                                    onFilterChange('status', [val]);
                                }
                            }}
                            value={(filters.status || []).includes(BookingStatus.Cancelled) && (filters.status || []).length === 1 ? 'CANCELLED' :
                                (filters.status || []).length >= 3 ? 'ALL' :
                                    (filters.status || [])[0] || 'ALL'}
                        >
                            <option value="ALL">All Active</option>
                            <option value={BookingStatus.TENTATIVE}>{BookingStatus.TENTATIVE}</option>
                            <option value={BookingStatus.CONFIRMED}>{BookingStatus.CONFIRMED}</option>
                            <option value={BookingStatus.DONE}>{BookingStatus.DONE}</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>

                        {/* Payment Status Dropdown */}
                        <select
                            className={clsx("w-full p-2 border rounded text-sm", (filters.paymentStatus || []).length > 0 && "border-blue-500 bg-blue-50")}
                            onChange={e => e.target.value && handleMultiChange('paymentStatus', e.target.value)}
                            value=""
                        >
                            <option value="">Filter Payment ({(filters.paymentStatus || []).length})</option>
                            {Object.values(PaymentStatus).map(s => (
                                <option key={s} value={s} disabled={(filters.paymentStatus || []).includes(s)}>
                                    {s}
                                </option>
                            ))}
                        </select>

                        {/* Tours */}
                        <select
                            className={clsx("w-full p-2 border rounded text-sm", (filters.tourId || []).length > 0 && "border-blue-500 bg-blue-50")}
                            onChange={e => e.target.value && handleMultiChange('tourId', e.target.value)}
                            value="" // Always reset after select
                        >
                            <option value="">Filter Tour ({(filters.tourId || []).length})</option>
                            {availableTours.map(t => (
                                <option key={t.id} value={t.id} disabled={(filters.tourId || []).includes(t.id)}>
                                    {t.name}
                                </option>
                            ))}
                        </select>

                        {/* Agents */}
                        <select
                            className={clsx("w-full p-2 border rounded text-sm", (filters.agentId || []).length > 0 && "border-blue-500 bg-blue-50")}
                            onChange={e => e.target.value && handleMultiChange('agentId', e.target.value)}
                            value=""
                        >
                            <option value="">Filter Agent ({(filters.agentId || []).length})</option>
                            <option value="DIRECT" disabled={(filters.agentId || []).includes('DIRECT')}>Direct / No Agent</option>
                            {availableAgents.map(a => (
                                <option key={a.id} value={a.id} disabled={(filters.agentId || []).includes(a.id)}>
                                    {a.name}
                                </option>
                            ))}
                        </select>

                        {/* Market Sources */}
                        <select
                            className={clsx("w-full p-2 border rounded text-sm", (filters.marketSourceId || []).length > 0 && "border-blue-500 bg-blue-50")}
                            onChange={e => e.target.value && handleMultiChange('marketSourceId', e.target.value)}
                            value=""
                        >
                            <option value="">Filter Source ({(filters.marketSourceId || []).length})</option>
                            {availableSources.map(s => (
                                <option key={s.id} value={s.id} disabled={(filters.marketSourceId || []).includes(s.id)}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Active Filters Display */}
                    <div className="flex flex-wrap gap-2 min-h-[24px]">
                        {[
                            ...(filters.tourId || []).map(id => ({ id, type: 'tourId', label: availableTours.find(t => t.id === id)?.name })),
                            ...(filters.agentId || []).map(id => ({ id, type: 'agentId', label: id === 'DIRECT' ? 'Direct' : availableAgents.find(a => a.id === id)?.name })),
                            ...(filters.marketSourceId || []).map(id => ({ id, type: 'marketSourceId', label: availableSources.find(s => s.id === id)?.name })),
                            ...(filters.paymentStatus || []).map(id => ({ id, type: 'paymentStatus', label: id }))
                        ].map(item => (
                            <span key={`${item.type}-${item.id}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs shadow-sm animated-in fade-in zoom-in">
                                {item.label || item.id}
                                <button
                                    onClick={() => handleMultiChange(item.type, item.id)}
                                    className="hover:text-blue-900"
                                >
                                    &times;
                                </button>
                            </span>
                        ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 pt-2 border-t mt-2">
                        <button
                            onClick={onGenerate}
                            disabled={filters.startDate > filters.endDate}
                            className={clsx(
                                "px-4 py-2 rounded-md font-medium text-white shadow-sm transition-colors flex items-center gap-2",
                                filters.startDate > filters.endDate
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-[var(--color-forest-green)] hover:bg-[var(--color-forest-green)]/90"
                            )}
                        >
                            <Calendar size={16} />
                            Generate Report
                        </button>

                        <button
                            onClick={onReset}
                            className="px-4 py-2 rounded-md font-medium text-gray-700 bg-white border hover:bg-gray-50 transition-colors"
                        >
                            Reset Defaults
                        </button>

                        {filters.startDate > filters.endDate && (
                            <span className="text-xs text-red-500 font-medium animate-pulse">
                                Start Date cannot be after End Date
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
