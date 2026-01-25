import React, { useState } from 'react';
import { useBookings } from '../hooks/useBookings';
import { useBookingModal } from '../context/BookingModalContext';
import { useGuestModal } from '../context/GuestModalContext';
import { Search, User, Calendar, MoreHorizontal, Filter, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { BookingStatus } from '../domain/models';

export function BookingsPage() {
    const { bookings, guests, marketSources, tours } = useBookings();
    const { openEdit, openCreate } = useBookingModal();
    const { openGuestProfile } = useGuestModal();

    const getTourName = (id) => tours.find(t => t.id === id)?.name || 'Unknown Tour';
    const [activeTab, setActiveTab] = useState('bookings');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterSource, setFilterSource] = useState('ALL');

    // Date Range Filters
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    // Reset page when filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterStatus, filterSource, filterDateFrom, filterDateTo, activeTab]);

    // --- Bookings Logic ---
    const filteredBookings = bookings.filter(b => {
        // Search
        const matchesSearch =
            b.leadGuestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.bookingRef?.toString().includes(searchTerm) ||
            b.id.includes(searchTerm);

        // Filter Status
        const matchesStatus = filterStatus === 'ALL' || b.status === filterStatus;

        // Filter Source
        const matchesSource = filterSource === 'ALL' || b.marketSourceId === filterSource;

        // Filter Date Range
        const tourDate = b.tourRunId.substring(0, 10);
        const matchesDateFrom = !filterDateFrom || tourDate >= filterDateFrom;
        const matchesDateTo = !filterDateTo || tourDate <= filterDateTo;

        return matchesSearch && matchesStatus && matchesSource && matchesDateFrom && matchesDateTo;
    }).sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate)); // Newest first

    // --- Guests Logic ---
    const filteredGuests = guests.filter(g => {
        return (
            g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.phone.includes(searchTerm) ||
            g.email?.toLowerCase().includes(searchTerm)
        );
    });

    // Pagination Logic
    const totalPages = Math.ceil((activeTab === 'bookings' ? filteredBookings.length : filteredGuests.length) / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

    const paginatedBookings = filteredBookings.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    const paginatedGuests = filteredGuests.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return (
        <div className="h-full flex flex-col bg-gray-50">
            {/* Header */}
            <div className="p-8 pb-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold font-heading text-[var(--color-forest-green)]">Management</h1>
                    <div className="flex gap-3">
                        {activeTab === 'bookings' && (
                            <button
                                onClick={() => openCreate(new Date().toISOString().split('T')[0])}
                                className="btn btn-primary shadow-lg flex items-center gap-2"
                            >
                                <Plus size={18} />
                                New Booking
                            </button>
                        )}
                        <div className="flex bg-white rounded-lg p-1 shadow-sm border">
                            <button
                                onClick={() => setActiveTab('bookings')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'bookings' ? 'bg-[var(--color-forest-green)] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Bookings
                            </button>
                            <button
                                onClick={() => setActiveTab('guests')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'guests' ? 'bg-[var(--color-forest-green)] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Guests
                            </button>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl shadow-sm border">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder={activeTab === 'bookings' ? "Search by name, ref, or ID..." : "Search by name, phone, email..."}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--color-forest-green)] focus:border-transparent outline-none"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {activeTab === 'bookings' && (
                        <>
                            {/* Date Filter */}
                            <div className="flex items-center gap-2 border-l pl-4">
                                <span className="text-xs font-bold text-gray-500 uppercase">From</span>
                                <input
                                    type="date"
                                    className="p-1 border rounded text-sm bg-gray-50 hover:bg-white"
                                    value={filterDateFrom}
                                    onChange={e => setFilterDateFrom(e.target.value)}
                                />
                                <span className="text-xs font-bold text-gray-500 uppercase">To</span>
                                <input
                                    type="date"
                                    className="p-1 border rounded text-sm bg-gray-50 hover:bg-white"
                                    value={filterDateTo}
                                    onChange={e => setFilterDateTo(e.target.value)}
                                />
                                {(filterDateFrom || filterDateTo) && (
                                    <button
                                        onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }}
                                        className="text-xs text-red-500 hover:underline ml-1"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-2 border-l pl-4">
                                <Filter size={16} className="text-gray-400" />
                                <select
                                    className="p-2 text-sm border-none bg-transparent font-medium text-gray-600 focus:ring-0 cursor-pointer"
                                    value={filterStatus}
                                    onChange={e => setFilterStatus(e.target.value)}
                                >
                                    <option value="ALL">All Status</option>
                                    {Object.values(BookingStatus).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            <div className="flex items-center gap-2 border-l pl-4">
                                <select
                                    className="p-2 text-sm border-none bg-transparent font-medium text-gray-600 focus:ring-0 cursor-pointer"
                                    value={filterSource}
                                    onChange={e => setFilterSource(e.target.value)}
                                >
                                    <option value="ALL">All Sources</option>
                                    {marketSources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-8 pb-4">
                {activeTab === 'bookings' ? (
                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">Ref</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">Date</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">Vehicle</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">Tour</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">Status</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">Payment</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">Guest</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">Pax</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {paginatedBookings.map(booking => {
                                    const sourceName = marketSources.find(s => s.id === booking.marketSourceId)?.name || 'Unknown';
                                    const vehicleNum = booking.tourRunId.split('-').pop();

                                    return (
                                        <tr
                                            key={booking.id}
                                            onClick={() => openEdit(booking.id)}
                                            className="hover:bg-gray-50 transition-colors group cursor-pointer"
                                        >
                                            <td className="p-4 font-mono text-sm text-gray-500">#{booking.bookingRef || '---'}</td>
                                            <td className="p-4 text-sm font-medium">
                                                {format(new Date(booking.tourRunId.substring(0, 10)), 'EEE dd MMM')}
                                            </td>
                                            <td className="p-4 font-mono text-sm text-gray-600">Vehicle {vehicleNum}</td>
                                            <td className="p-4 text-sm">{getTourName(booking.tourOptionId)}</td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <BookingStatusBadge status={booking.status} />
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <PaymentStatusBadge status={booking.paymentStatus} />
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-gray-800">{booking.leadGuestName}</div>
                                                <div className="text-xs text-gray-500">{booking.phone}</div>
                                            </td>
                                            <td className="p-4 text-sm">{booking.seats}</td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openEdit(booking.id); }}
                                                    className="p-2 hover:bg-gray-200 rounded-full inline-flex text-gray-400 hover:text-gray-700"
                                                >
                                                    <Calendar size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {paginatedBookings.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="p-8 text-center text-gray-500 italic">No bookings found matching filters.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    // GUESTS TAB
                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">Ref</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">Name</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">Nationality</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">Contact</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm">History(Calc)</th>
                                    <th className="p-4 font-semibold text-gray-600 text-sm text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {paginatedGuests.map(guest => {
                                    // Calculate history on the fly for now (or could use cached prop)
                                    const guestBookings = bookings.filter(b => b.guestId === guest.id);

                                    return (
                                        <tr key={guest.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-mono text-sm text-gray-500">{guest.profileRef || '---'}</td>
                                            <td className="p-4 font-bold text-gray-800">
                                                {guest.title ? <span className="text-gray-500 font-normal mr-1">{guest.title}</span> : ''}
                                                {guest.name}
                                            </td>
                                            <td className="p-4 text-sm text-gray-600">{guest.nationality || '-'}</td>
                                            <td className="p-4">
                                                <div className="text-sm text-gray-800">{guest.phone}</div>
                                                <div className="text-xs text-gray-500">{guest.email}</div>
                                            </td>
                                            <td className="p-4 text-sm">
                                                <span className="font-bold">{guestBookings.length}</span> bookings
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => openGuestProfile(guest.id)}
                                                    className="text-sm font-semibold text-[var(--color-forest-green)] hover:underline"
                                                >
                                                    View Profile
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {paginatedGuests.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-500 italic">No guests found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls */}
                <div className="flex justify-between items-center mt-4 px-2">
                    <div className="text-sm text-gray-500">
                        Showing {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, (activeTab === 'bookings' ? filteredBookings.length : filteredGuests.length))} of {(activeTab === 'bookings' ? filteredBookings.length : filteredGuests.length)}
                    </div>

                    {totalPages > 1 && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border rounded bg-white disabled:opacity-50 text-sm font-medium hover:bg-gray-50"
                            >
                                Previous
                            </button>
                            <span className="px-3 py-1 text-sm font-bold text-gray-700 bg-gray-100 rounded">
                                {currentPage}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 border rounded bg-white disabled:opacity-50 text-sm font-medium hover:bg-gray-50"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function BookingStatusBadge({ status }) {
    const colors = {
        [BookingStatus.TENTATIVE]: 'bg-yellow-100 text-yellow-800',
        [BookingStatus.CONFIRMED]: 'bg-green-100 text-green-800',
        [BookingStatus.DONE]: 'bg-blue-100 text-blue-800',
        [BookingStatus.CANCELLED]: 'bg-red-100 text-red-800',
    };
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
            {status}
        </span>
    );
}

function PaymentStatusBadge({ status }) {
    const colors = {
        'PENDING': 'bg-gray-100 text-gray-600',
        'PAID': 'bg-green-100 text-green-800', // Legacy/Fallback
        'CASH': 'bg-green-50 text-green-700 border border-green-200',
        'CARD': 'bg-purple-50 text-purple-700 border border-purple-200',
        'PAYPAL': 'bg-blue-50 text-blue-700 border border-blue-200',
        'BANK_TRANSFER': 'bg-indigo-50 text-indigo-700 border border-indigo-200',
        'COMPLIMENTARY': 'bg-pink-100 text-pink-800',
    };
    // Default for new statuses not yet in map if any
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${colors[status] || 'bg-gray-100 text-gray-500'}`}>
            {status}
        </span>
    );
}
