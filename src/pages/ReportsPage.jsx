import React, { useState, useMemo } from 'react';
import { useBookings } from '../hooks/useBookings';
import { ReportFilters } from '../components/reports/ReportFilters';
import { ReportResults } from '../components/reports/ReportResults';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { BarChart3, Users, Globe, LayoutList } from 'lucide-react';
import clsx from 'clsx';
import { BookingStatus } from '../domain/models';

export function ReportsPage() {
    const { bookings, tours, agents, marketSources, vehicles, settings } = useBookings();

    // Default Date Range: Current Month
    const defaultFilters = {
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
        tourId: [],
        agentId: [],
        marketSourceId: [],
        paymentStatus: [],
        status: [BookingStatus.CONFIRMED, BookingStatus.TENTATIVE, BookingStatus.DONE] // default active
    };

    const [draftFilters, setDraftFilters] = useState(defaultFilters);
    const [appliedFilters, setAppliedFilters] = useState(defaultFilters);

    const [activeTab, setActiveTab] = useState('bookings'); // bookings, agents, sources

    const handleFilterChange = (field, value) => {
        setDraftFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleGenerate = () => {
        setAppliedFilters(draftFilters);
    };

    const handleReset = () => {
        setDraftFilters(defaultFilters);
        setAppliedFilters(defaultFilters);
    };

    // Filter Logic
    const filteredBookings = useMemo(() => {
        return bookings.filter(b => {
            // ... existing filter logic ...
            // 1. Date Range (Inclusive, based on Tour Date)
            // b.tourRunId starts with YYYY-MM-DD
            const tourDate = b.tourRunId?.substring(0, 10);
            if (!tourDate) return false;

            // Simple string compare often works for ISO dates, but using robust interval check
            const dateCheck = tourDate >= appliedFilters.startDate && tourDate <= appliedFilters.endDate;
            if (!dateCheck) return false;

            // 2. Multi-Select Filters (AND Logic, if array has items)
            if (appliedFilters.tourId.length > 0 && !appliedFilters.tourId.includes(b.tourOptionId)) return false;

            // Handle 'DIRECT' agent explicitly? Filter stores 'DIRECT' for null/empty
            const bAgent = b.agentId || 'DIRECT';
            if (appliedFilters.agentId.length > 0 && !appliedFilters.agentId.includes(bAgent)) return false;

            if (appliedFilters.marketSourceId.length > 0 && !appliedFilters.marketSourceId.includes(b.marketSourceId)) return false;

            // 3. Status
            if (appliedFilters.status.length > 0 && !appliedFilters.status.includes(b.status)) return false;

            // 4. Payment Status
            if (appliedFilters.paymentStatus && appliedFilters.paymentStatus.length > 0 && !appliedFilters.paymentStatus.includes(b.paymentStatus)) return false;

            return true;
        });
    }, [bookings, appliedFilters]);

    // Sorting Logic
    const [sortConfig, setSortConfig] = useState({ field: 'DATE', direction: 'DESC' });

    const sortedBookings = useMemo(() => {
        let sorted = [...filteredBookings];
        sorted.sort((a, b) => {
            let valA_primary, valB_primary;
            let valA_secondary, valB_secondary;
            let dir_secondary = 'ASC'; // Default tie-breaker direction

            if (sortConfig.field === 'DATE') {
                // Primary: Date
                valA_primary = a.tourRunId;
                valB_primary = b.tourRunId;

                // Secondary: Guest Name (Always A-Z for consistenty)
                valA_secondary = (a.leadGuestName || '').toLowerCase();
                valB_secondary = (b.leadGuestName || '').toLowerCase();
                dir_secondary = 'ASC';
            } else {
                // Primary: Guest Name
                valA_primary = (a.leadGuestName || '').toLowerCase();
                valB_primary = (b.leadGuestName || '').toLowerCase();

                // Secondary: Date (Always Newest First for history)
                valA_secondary = a.tourRunId;
                valB_secondary = b.tourRunId;
                dir_secondary = 'DESC'; // Newest (larger string) first
            }

            // 1. Primary Sort
            if (valA_primary < valB_primary) return sortConfig.direction === 'ASC' ? -1 : 1;
            if (valA_primary > valB_primary) return sortConfig.direction === 'ASC' ? 1 : -1;

            // 2. Secondary Sort (Tie-Breaker)
            if (valA_secondary < valB_secondary) return dir_secondary === 'ASC' ? -1 : 1;
            if (valA_secondary > valB_secondary) return dir_secondary === 'ASC' ? 1 : -1;

            return 0;
        });
        return sorted;
    }, [filteredBookings, sortConfig]);

    const tabs = [
        { id: 'bookings', label: 'Bookings List', icon: LayoutList },
        { id: 'agents', label: 'Agent Revenue', icon: Users },
        { id: 'sources', label: 'Market Sources', icon: Globe },
    ];

    return (
        <div className="h-full overflow-y-auto w-full">
            <div className="p-6 max-w-[1600px] mx-auto animate-in fade-in duration-300">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 print:hidden">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <BarChart3 className="text-[var(--color-forest-green)]" size={32} />
                            Reports
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Analyze booking performance and revenue. <br />
                            <span className="text-xs font-mono bg-yellow-100 text-yellow-800 px-1 rounded">
                                Applied: {appliedFilters.startDate} to {appliedFilters.endDate}
                            </span>
                        </p>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex bg-gray-100 p-1 rounded-lg mt-4 md:mt-0">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                                    activeTab === tab.id
                                        ? "bg-white text-[var(--color-forest-green)] shadow-sm"
                                        : "text-gray-600 hover:text-gray-900"
                                )}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Filters */}
                <ReportFilters
                    filters={draftFilters}
                    onFilterChange={handleFilterChange}
                    onGenerate={handleGenerate}
                    onReset={handleReset}
                    availableTours={tours}
                    availableAgents={agents}
                    availableSources={marketSources}
                    availableVehicles={vehicles}
                    sortConfig={sortConfig}
                    onSortChange={setSortConfig}
                />

                {/* Results */}
                <ReportResults
                    type={activeTab}
                    filteredBookings={sortedBookings}
                    tours={tours}
                    agents={agents}
                    marketSources={marketSources}
                    dateRange={{ startDate: appliedFilters.startDate, endDate: appliedFilters.endDate }}
                    settings={settings}
                />
            </div>
        </div>
    );
}
