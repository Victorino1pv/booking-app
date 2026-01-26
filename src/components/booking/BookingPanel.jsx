import React, { useState, useEffect, useMemo } from 'react';
import { useBookings } from '../../hooks/useBookings';
import { generateUUID } from '../../services/storage';
import { checkAvailability, calculatePrice, validateBooking, getTourRunState } from '../../domain/rules';
import { RateType, BookingStatus, PaymentStatus, MAX_CAPACITY } from '../../domain/models';
import { X, Check, Info, ArrowLeft, Trash2, Search, User, UserPlus, MapPin, Calendar, Truck, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';

export function BookingPanel({ date, jeepId: propJeepId, onClose, initialBookingId }) {
    const { bookings, tours, addBooking, updateBooking, removeBooking, vehicles, marketSources, guests, agents, rates, vehicleBlocks } = useBookings();

    // Selection State
    const [activeTab, setActiveTab] = useState('profile');

    // Default Market Source
    const defaultMarketSource = marketSources.find(s => s.isActive)?.id || '';

    // Form State
    const [formData, setFormData] = useState({
        // Profile
        guestId: '',
        leadGuestName: '', // Kept for backward compat / search display
        title: '',
        firstName: '',
        surname: '',
        phone: '',
        email: '',
        category: 'ADULT',
        nationality: '',

        // Tour
        date: date || new Date().toISOString().split('T')[0],
        tourOptionId: '',
        rateType: RateType.SHARED,
        seats: 1,
        jeepId: propJeepId || 'jeep-1', // Default, should be selectable?
        pickupLocation: '',
        pickupTime: '09:00',

        // Commercial
        marketSourceId: defaultMarketSource,
        marketSourceDetail: '',
        agentId: '',

        paymentStatus: PaymentStatus.PENDING,

        // Pricing Mode
        pricingMode: 'STANDARD', // 'STANDARD' | 'FREE'
        customPrice: 0,

        // Meta
        status: BookingStatus.TENTATIVE,
        notes: '',
        reminderDate: '',
        reminderText: ''
    });

    const [guestMode, setGuestMode] = useState('new'); // 'new' | 'existing'
    const [formErrors, setFormErrors] = useState({});
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Duplicate Detection
    const [duplicateCandidate, setDuplicateCandidate] = useState(null);
    const [ignoreDuplicate, setIgnoreDuplicate] = useState(false);

    // Filter guest history
    const guestHistory = useMemo(() => {
        if (!formData.guestId) return [];
        return bookings.filter(b => b.guestId === formData.guestId && b.id !== initialBookingId)
            .sort((a, b) => new Date(b.tourRunId.substring(0, 10)) - new Date(a.tourRunId.substring(0, 10)));
    }, [bookings, formData.guestId, initialBookingId]);

    // Load existing booking
    useEffect(() => {
        if (initialBookingId) {
            const booking = bookings.find(b => b.id === initialBookingId);
            if (booking) {
                setFormData({
                    guestId: booking.guestId || '',
                    leadGuestName: booking.leadGuestName,
                    // If extended fields exist on existing booking (snapshot) or we fetched fresh guest data? 
                    // ideally we fetch fresh guest data. But here we rely on booking snapshot initially?
                    // For now, simpler: just populate what we have. 
                    title: booking.title || '',
                    firstName: booking.firstName || '',
                    surname: booking.surname || '',
                    nationality: booking.nationality || '',

                    phone: booking.phone,
                    email: booking.email || '',

                    date: booking.tourRunId.substring(0, 10),
                    jeepId: booking.tourRunId.split('-').slice(3).join('-') || 'jeep-1', // Extract jeepId? format is date-jeepId
                    tourOptionId: booking.tourOptionId || '',
                    rateType: booking.rateType,
                    seats: booking.seats,

                    marketSourceId: booking.marketSourceId || '',
                    marketSourceDetail: booking.marketSourceDetail || '',
                    agentId: booking.agentId || '',

                    paymentStatus: booking.paymentStatus || PaymentStatus.PENDING,
                    pricingMode: booking.pricingMode || 'STANDARD',
                    customPrice: booking.customPrice || 0,
                    pickupLocation: booking.pickup.location,
                    pickupTime: booking.pickup.time,

                    status: booking.status,
                    notes: booking.notes || '',
                    reminderDate: booking.reminder?.date || '',
                    reminderText: booking.reminder?.text || ''
                });
                setGuestMode('existing');
                // setActiveTab('tour'); // Optional: start on tour if editing? 
            }
        } else {
            // Reset defaults if creating new
            setFormData(prev => ({
                ...prev,
                date: date || prev.date,
                jeepId: propJeepId || prev.jeepId // Update if prop changes
            }));
        }
    }, [initialBookingId, bookings, date, propJeepId]);

    // Derived State
    const targetDate = formData.date;
    const jeepId = formData.jeepId; // "jeep-1"; 

    const selectedVehicle = useMemo(() => vehicles.find(v => v.id === jeepId), [vehicles, jeepId]);
    const vehicleCapacity = selectedVehicle?.seatCapacity || MAX_CAPACITY;

    const tourRunState = useMemo(() => {
        return getTourRunState(bookings, targetDate, jeepId, null, vehicleCapacity, vehicleBlocks);
    }, [bookings, targetDate, jeepId, vehicleCapacity, vehicleBlocks]);

    // Sync Form with Tour Run State (Locking)
    useEffect(() => {
        // Only if creating new booking
        if (!initialBookingId && tourRunState.type === RateType.SHARED) {
            setFormData(prev => ({
                ...prev,
                rateType: RateType.SHARED,
                tourOptionId: tourRunState.tourOptionId || prev.tourOptionId
            }));
        }
    }, [tourRunState, initialBookingId]); // Run when availability state changes

    const availability = useMemo(() => {
        const adjustedRun = getTourRunState(bookings, targetDate, jeepId, initialBookingId, vehicleCapacity, vehicleBlocks);
        return checkAvailability(adjustedRun, {
            rateType: formData.rateType,
            tourOptionId: formData.tourOptionId,
            seats: Number(formData.seats)
        }, vehicleCapacity);
    }, [targetDate, jeepId, formData.rateType, formData.tourOptionId, formData.seats, initialBookingId, bookings, vehicleCapacity]);

    const price = useMemo(() => {
        // Try to find rate for selected tour
        const activeRate = rates.find(r => r.tourId === formData.tourOptionId && r.isActive);

        let unitPrice = 0;
        if (activeRate) {
            unitPrice = formData.rateType === RateType.PRIVATE
                ? activeRate.privatePrice
                : activeRate.sharedPrice;
        } else {
            // Fallback hardcoded if no rate found (or legacy)
            unitPrice = formData.rateType === RateType.PRIVATE ? 350 : 60;
        }

        if (formData.rateType === RateType.PRIVATE) return unitPrice;
        return unitPrice * Number(formData.seats);



    }, [formData.rateType, formData.seats, formData.tourOptionId, rates]);

    const finalPrice = useMemo(() => {
        if (formData.pricingMode === 'FREE') {
            return Number(formData.customPrice) || 0;
        }
        return price;
    }, [formData.pricingMode, formData.customPrice, price]);

    // Handlers
    const handleSave = (e) => {
        e.preventDefault();
        const errors = {};

        // Profile Validation
        // Construct full name if missing but parts exist
        const derivedName = formData.leadGuestName || `${formData.firstName} ${formData.surname}`.trim();

        if (!derivedName.trim()) errors.leadGuestName = "Name is required";
        if (guestMode === 'new' && !formData.phone.trim()) errors.phone = "Phone is required for new guests";

        // Match existing guest if mode is existing but no ID (should rely on ensureGuest)
        // But for UI feedback:
        if (guestMode === 'existing' && !formData.guestId) errors.guestId = "Please select a guest";

        // Tour Validation
        if (!formData.jeepId) errors.jeepId = "Jeep selection is required";
        if (!formData.tourOptionId) errors.tourOptionId = "Tour Option is required"; // We don't have this in UI yet? Ah, we probably do or should. 
        // NOTE: The previous code didn't show Tour Option selector. I should check if it exists or if I need to add it.
        // Assuming it's in the 'Tour' tab content which I didn't verify fully. 
        // Let's assume standard checks.

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            // Switch to tab with error
            if (errors.leadGuestName || errors.phone || errors.guestId) setActiveTab('profile');
            else if (errors.jeepId || errors.tourOptionId) setActiveTab('tour');
            return;
        }

        if (!availability.allowed && formData.status !== BookingStatus.CANCELLED && formData.status !== BookingStatus.NO_SHOW) {
            alert(availability.reason);
            return;
        }

        // --- DUPLICATE CHECK ---
        // Only run if: 
        // 1. Creating NEW guest (no guestId)
        // 2. We haven't explicitly ignored duplicates
        // 3. We have enough info to check (Survivor + Phone/Email)
        if (!formData.guestId && !ignoreDuplicate && formData.surname) {
            const cleanPhone = (formData.phone || '').replace(/\D/g, '');
            const cleanSurname = (formData.surname || '').trim().toLowerCase();
            const cleanEmail = (formData.email || '').trim().toLowerCase();

            const match = guests.find(g => {
                const gSurname = (g.surname || '').trim().toLowerCase();
                const gPhone = (g.phone || '').replace(/\D/g, '');
                const gEmail = (g.email || '').trim().toLowerCase();

                if (gSurname !== cleanSurname) return false;

                // Match if Surname AND (Phone OR Email) matches
                const phoneMatch = cleanPhone && gPhone && cleanPhone === gPhone;
                const emailMatch = cleanEmail && gEmail && cleanEmail === gEmail;

                return phoneMatch || emailMatch;
            });

            if (match) {
                setDuplicateCandidate(match);
                return;
            }
        }
        // -----------------------

        const payload = {
            id: initialBookingId || generateUUID(),
            guestId: formData.guestId,
            vehicleId: jeepId, // Explicitly pass Vehicle ID
            tourRunId: `${formData.date}-${jeepId}`,
            createdDate: initialBookingId ? bookings.find(b => b.id === initialBookingId).createdDate : new Date().toISOString(),
            status: formData.status,
            paymentStatus: formData.paymentStatus,

            totalPrice: finalPrice,
            pricingMode: formData.pricingMode,
            customPrice: Number(formData.customPrice),

            leadGuestName: formData.leadGuestName || `${formData.firstName} ${formData.surname}`.trim(),
            title: formData.title,
            firstName: formData.firstName,
            surname: formData.surname,
            nationality: formData.nationality,

            phone: formData.phone,
            email: formData.email,

            seats: Number(formData.seats),
            tourOptionId: formData.tourOptionId,
            rateType: formData.rateType,
            pricePerPerson: formData.rateType === 'SHARED' ? 60 : 0,
            privatePrice: formData.rateType === 'PRIVATE' ? 350 : 0,

            marketSourceId: formData.marketSourceId,
            marketSourceDetail: formData.marketSourceDetail,
            agentId: formData.agentId,

            pickup: {
                location: formData.pickupLocation,
                time: formData.pickupTime
            },
            notes: formData.notes,
            reminder: (formData.reminderDate && formData.reminderText) ? {
                date: formData.reminderDate,
                text: formData.reminderText
            } : null
        };

        const validation = validateBooking(payload, vehicleCapacity);
        if (!validation.isValid) {
            setFormErrors(validation.errors);
            // Auto-focus logic could go here or via useEffect
            return;
        }

        if (initialBookingId) {
            updateBooking(payload);
        } else {
            addBooking(payload);
        }
        onClose();
    };

    const handleConfirmDelete = () => {
        removeBooking(initialBookingId);
        onClose();
    };

    // Guest Selection Logic
    const [searchTerm, setSearchTerm] = useState('');
    const filteredGuests = (guests && searchTerm.length > 1) ? guests.filter(g =>
        (g.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (g.phone || '').includes(searchTerm)
    ).slice(0, 5) : [];

    const selectGuest = (guest) => {
        setFormData(prev => ({
            ...prev,
            guestId: guest.id,
            leadGuestName: guest.name,
            title: guest.title || '',
            firstName: guest.firstName || '',
            surname: guest.surname || '',
            nationality: guest.nationality || '',
            phone: guest.phone,
            email: guest.email || ''
        }));
        setGuestMode('existing');
        setSearchTerm('');
    };

    const getTabErrors = (tabId) => {
        if (!Object.keys(formErrors).length) return false;
        const profileFields = ['firstName', 'surname', 'phone', 'email', 'title', 'nationality'];
        const tourFields = ['date', 'tourOptionId', 'rateType', 'seats', 'pickupLocation', 'pickupTime', 'status', 'paymentStatus', 'marketSourceId', 'marketSourceDetail'];

        if (tabId === 'profile') return Object.keys(formErrors).some(k => profileFields.includes(k));
        if (tabId === 'tour') return Object.keys(formErrors).some(k => tourFields.includes(k));
        return false;
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="p-6 border-b bg-gray-50 flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-[var(--color-forest-green)]">
                        {initialBookingId ? 'Edit Booking' : 'New Booking'}
                    </h2>
                    {initialBookingId && (
                        <div className="text-sm font-mono text-gray-500 mt-1">
                            Ref: {bookings.find(b => b.id === initialBookingId)?.bookingRef || '---'}
                        </div>
                    )}
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded"><X size={20} /></button>
            </div>

            {/* Validation Alert */}
            {
                Object.keys(formErrors).length > 0 && (
                    <div className="bg-red-50 border-b border-red-100 p-3 flex items-start gap-3 animate-in slide-in-from-top-2">
                        <div className="text-red-600 mt-0.5"><AlertTriangle size={16} /></div>
                        <div className="text-sm text-red-800">
                            <div className="font-bold mb-1">Missing required information</div>
                            <ul className="list-disc pl-4 space-y-0.5 text-xs">
                                {Object.values(formErrors).map((msg, i) => (
                                    <li key={i}>{msg}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )
            }

            {/* Tabs */}
            <div className="flex border-b">
                {[
                    { id: 'profile', icon: User, label: 'Profile' },
                    { id: 'tour', icon: Truck, label: 'Tour' },
                    { id: 'notes', icon: Info, label: 'Notes' },
                    { id: 'reminder', icon: Calendar, label: 'Reminder' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={clsx(
                            "flex-1 py-3 text-sm font-medium border-b-2 flex items-center justify-center gap-2 transition-colors",
                            activeTab === tab.id
                                ? "border-[var(--color-forest-green)] text-[var(--color-forest-green)] bg-green-50/50"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                        )}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        {getTabErrors(tab.id) && (
                            <span className="w-2 h-2 rounded-full bg-red-500 absolute top-2 right-4 shadow-sm" />
                        )}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">

                {/* --- PROFILE TAB --- */}
                {activeTab === 'profile' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Mode Selector */}
                        <div className="flex p-1 bg-gray-100 rounded-lg mb-6">
                            <button
                                onClick={() => { setGuestMode('existing'); }}
                                className={clsx("flex-1 py-2 text-sm font-medium rounded-md transition-all", guestMode === 'existing' ? "bg-white shadow text-black" : "text-gray-500")}
                            >
                                <Search size={14} className="inline mr-2" />
                                Existing Guest
                            </button>
                            <button
                                onClick={() => { setGuestMode('new'); setFormData(p => ({ ...p, guestId: '' })); }}
                                className={clsx("flex-1 py-2 text-sm font-medium rounded-md transition-all", guestMode === 'new' ? "bg-white shadow text-black" : "text-gray-500")}
                            >
                                <UserPlus size={14} className="inline mr-2" />
                                Create New
                            </button>
                        </div>

                        {guestMode === 'existing' && !formData.guestId && (
                            <div className="relative">
                                <label className="block text-sm font-medium mb-1">Search Guest</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border rounded shadow-sm"
                                    placeholder="Name or Phone..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                                {filteredGuests.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 bg-white border shadow-xl rounded-b z-10">
                                        {filteredGuests.map(g => (
                                            <div key={g.id} onClick={() => selectGuest(g)} className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0">
                                                <div className="font-bold">{g.name}</div>
                                                <div className="text-sm text-gray-500">{g.phone}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className={clsx("space-y-4", (guestMode === 'existing' && !formData.guestId) ? 'opacity-50 pointer-events-none' : '')}>
                            <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium mb-1">Title</label>
                                    <select
                                        className="w-full p-2 border rounded bg-white"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    >
                                        <option value="">-</option>
                                        <option value="Mr">Mr</option>
                                        <option value="Mrs">Mrs</option>
                                        <option value="Ms">Ms</option>
                                        <option value="Dr">Dr</option>
                                    </select>
                                </div>
                                <div className="col-span-3">
                                    {/* Auto-fill full name if first/last change? Or hidden field? */
                                        /* Let's use specific fields but update name on save */
                                    }
                                    <label className="block text-sm font-medium mb-1">First Name *</label>
                                    <input
                                        type="text"
                                        className={`w-full p-2 border rounded ${formErrors.firstName ? 'border-red-500 bg-red-50' : ''}`}
                                        value={formData.firstName}
                                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                    />
                                    {formErrors.firstName && <p className="text-xs text-red-500 mt-1">{formErrors.firstName}</p>}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Surname</label>
                                <input
                                    type="text"
                                    className={`w-full p-2 border rounded ${formErrors.surname ? 'border-red-500 bg-red-50' : ''}`}
                                    value={formData.surname}
                                    onChange={e => setFormData({ ...formData, surname: e.target.value })}
                                />
                                {formErrors.surname && <p className="text-xs text-red-500 mt-1">{formErrors.surname}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Phone *</label>
                                    <input
                                        type="tel"
                                        className={`w-full p-2 border rounded ${formErrors.phone ? 'border-red-500 bg-red-50' : ''}`}
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                    {formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Email</label>
                                    <input
                                        type="email"
                                        className={`w-full p-2 border rounded ${formErrors.email ? 'border-red-500 bg-red-50' : ''}`}
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                    {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Nationality</label>
                                <input
                                    type="text"
                                    list="nationalities"
                                    className="w-full p-2 border rounded"
                                    placeholder="e.g. Portuguese"
                                    value={formData.nationality}
                                    onChange={e => setFormData({ ...formData, nationality: e.target.value })}
                                />
                                <datalist id="nationalities">
                                    <option value="Portuguese" />
                                    <option value="British" />
                                    <option value="German" />
                                    <option value="French" />
                                    <option value="American" />
                                </datalist>
                            </div>
                        </div>
                        {/* Guest History */}
                        {guestMode === 'existing' && guestHistory.length > 0 && (
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-6">
                                <h3 className="font-bold text-blue-900 mb-3 text-sm flex items-center gap-2">
                                    <Calendar size={16} /> Guest History
                                </h3>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {guestHistory.map(b => (
                                        <div key={b.id} className="flex justify-between items-center bg-white p-2 rounded text-xs border">
                                            <div>
                                                <div className="font-bold text-gray-700">
                                                    {format(new Date(b.tourRunId.substring(0, 10)), 'MMM d, yyyy')}
                                                </div>
                                                <div className="text-gray-500 truncate w-32">{b.notes || 'No notes'}</div>
                                            </div>
                                            <span className={`px-1.5 py-0.5 rounded ${b.status === BookingStatus.CANCELLED ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                {b.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                )}

                {/* --- TOUR TAB --- */}
                {activeTab === 'tour' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Status Section */}
                        <div className="bg-gray-50 p-4 rounded-lg space-y-4 border">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Booking Status</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Booking Status</label>
                                    <select
                                        className={`w-full p-2 border rounded bg-white ${formErrors.status ? 'border-red-500 bg-red-50' : ''}`}
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        {Object.values(BookingStatus).map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                    {formErrors.status && <p className="text-xs text-red-500 mt-1">{formErrors.status}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Payment Status</label>
                                    <select
                                        className={`w-full p-2 border rounded bg-white ${formErrors.paymentStatus ? 'border-red-500 bg-red-50' : ''}`}
                                        value={formData.paymentStatus}
                                        onChange={e => setFormData({ ...formData, paymentStatus: e.target.value })}
                                    >
                                        {Object.values(PaymentStatus).map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                    {formErrors.paymentStatus && <p className="text-xs text-red-500 mt-1">{formErrors.paymentStatus}</p>}
                                </div>
                            </div>
                        </div>
                        {/* Date & Availability */}
                        <div className="bg-blue-50 p-4 rounded border border-blue-100 flex justify-between items-center">
                            <div>
                                <div className="text-sm text-blue-800 font-bold mb-1">Tour Run Status</div>
                                <div className="text-2xl font-bold text-blue-900">
                                    {tourRunState.type || 'AVAILABLE'}
                                </div>
                                {tourRunState.type === 'SHARED' && (
                                    <div className="text-sm text-blue-700">
                                        Shared Day: {tourRunState.seatsRemaining} seats remaining
                                    </div>
                                )}
                            </div>
                            <div className="text-right">
                                <input
                                    type="date"
                                    className={`p-2 border rounded bg-white ${formErrors.date ? 'border-red-500 bg-red-50' : ''}`}
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium mb-1">Vehicle</label>
                                <select
                                    className={`w-full p-2 border rounded bg-white ${formErrors.jeepId ? 'border-red-500 bg-red-50' : ''}`}
                                    value={formData.jeepId}
                                    onChange={e => setFormData({ ...formData, jeepId: e.target.value })}
                                    disabled={!initialBookingId && tourRunState.type === RateType.SHARED} // If entering shared tour, shouldn't change vehicle? Actually we might want to. Let's allowing changing unless locked by something else. Actually, if it's shared, changing jeep changes the tourRun context. It should be allowed.
                                >
                                    {vehicles.filter(v => v.isActive).map(v => (
                                        <option key={v.id} value={v.id}>{v.name} ({v.seatCapacity} seats)</option>
                                    ))}
                                </select>
                                {formErrors.jeepId && <p className="text-xs text-red-500 mt-1">{formErrors.jeepId}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Rate Type</label>
                                <select
                                    className="w-full p-2 border rounded bg-white"
                                    value={formData.rateType}
                                    onChange={e => setFormData({ ...formData, rateType: e.target.value })}
                                    disabled={(!initialBookingId && tourRunState.type === RateType.SHARED) || tourRunState.type === RateType.PRIVATE}
                                >
                                    <option value={RateType.SHARED}>Shared</option>
                                    <option value={RateType.PRIVATE}>Private</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Tour Option</label>
                                <select
                                    className={`w-full p-2 border rounded bg-white ${formErrors.tourOptionId ? 'border-red-500 bg-red-50' : ''}`}
                                    value={formData.tourOptionId}
                                    onChange={e => setFormData({ ...formData, tourOptionId: e.target.value })}
                                    disabled={(!initialBookingId && tourRunState.type === RateType.SHARED) || tourRunState.type === RateType.PRIVATE}
                                >
                                    <option value="">Select Tour...</option>
                                    {tours.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                                {formErrors.tourOptionId && <p className="text-xs text-red-500 mt-1">{formErrors.tourOptionId}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Seats</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={formData.rateType === RateType.SHARED ? Math.min(vehicleCapacity, getTourRunState(bookings, targetDate, jeepId, initialBookingId, vehicleCapacity).seatsRemaining) : vehicleCapacity}
                                    className={`w-full p-2 border rounded ${formErrors.seats ? 'border-red-500 bg-red-50' : ''}`}
                                    value={formData.seats}
                                    onChange={e => setFormData({ ...formData, seats: e.target.value })}
                                />
                                {formData.rateType === RateType.SHARED && (
                                    <div className="text-xs text-gray-500 mt-1">
                                        Max available: {getTourRunState(bookings, targetDate, jeepId, initialBookingId, vehicleCapacity).seatsRemaining}
                                    </div>
                                )}
                                {formErrors.seats && <p className="text-xs text-red-500 mt-1">{formErrors.seats}</p>}
                            </div>
                            <div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Pricing Mode</label>
                                    <div className="flex gap-2 mb-2">
                                        <button
                                            onClick={() => setFormData({ ...formData, pricingMode: 'STANDARD' })}
                                            className={`flex-1 py-1 text-xs border rounded ${formData.pricingMode === 'STANDARD' ? 'bg-blue-100 border-blue-300 text-blue-800 font-bold' : 'bg-white text-gray-500'}`}
                                        >
                                            Standard
                                        </button>
                                        <button
                                            onClick={() => setFormData({ ...formData, pricingMode: 'FREE' })}
                                            className={`flex-1 py-1 text-xs border rounded ${formData.pricingMode === 'FREE' ? 'bg-blue-100 border-blue-300 text-blue-800 font-bold' : 'bg-white text-gray-500'}`}
                                        >
                                            Free Rate
                                        </button>
                                    </div>
                                    {formData.pricingMode === 'FREE' ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-500 font-bold">€</span>
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-full p-2 border rounded font-mono font-bold"
                                                value={formData.customPrice}
                                                onChange={e => setFormData({ ...formData, customPrice: Number(e.target.value) })}
                                            />
                                        </div>
                                    ) : (
                                        <div className="p-2 bg-gray-100 rounded font-mono font-bold text-gray-700">
                                            €{finalPrice}
                                        </div>
                                    )}
                                </div>
                            </div>

                        </div>

                        <div className="border-t pt-4 mt-4">
                            <h4 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">Pickup & Source</h4>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Time</label>
                                    <input
                                        type="time"
                                        className={`w-full p-2 border rounded ${formErrors.pickupTime ? 'border-red-500 bg-red-50' : ''}`}
                                        value={formData.pickupTime}
                                        onChange={e => setFormData({ ...formData, pickupTime: e.target.value })}
                                    />
                                    {formErrors.pickupTime && <p className="text-xs text-red-500 mt-1">{formErrors.pickupTime}</p>}
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium mb-1">Location</label>
                                    <input
                                        type="text"
                                        className={`w-full p-2 border rounded ${formErrors.pickupLocation ? 'border-red-500 bg-red-50' : ''}`}
                                        value={formData.pickupLocation}
                                        onChange={e => setFormData({ ...formData, pickupLocation: e.target.value })}
                                    />
                                    {formErrors.pickupLocation && <p className="text-xs text-red-500 mt-1">{formErrors.pickupLocation}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Market Source</label>
                                    <select
                                        className={`w-full p-2 border rounded ${formErrors.marketSourceId ? 'border-red-500 bg-red-50' : ''}`}
                                        value={formData.marketSourceId}
                                        onChange={e => setFormData({ ...formData, marketSourceId: e.target.value })}
                                    >
                                        <option value="">Select...</option>
                                        {marketSources.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    {formErrors.marketSourceId && <p className="text-xs text-red-500 mt-1">{formErrors.marketSourceId}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Detail</label>
                                    <input type="text" className="w-full p-2 border rounded" placeholder="e.g. Ref #" value={formData.marketSourceDetail} onChange={e => setFormData({ ...formData, marketSourceDetail: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Agent (Optional)</label>
                                    <select
                                        className="w-full p-2 border rounded"
                                        value={formData.agentId}
                                        onChange={e => setFormData({ ...formData, agentId: e.target.value })}
                                    >
                                        <option value="">No Agent</option>
                                        {agents.filter(a => a.isActive).map(a => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- NOTES TAB --- */}
                {
                    activeTab === 'notes' && (
                        <div className="animate-in fade-in duration-300">
                            <label className="block text-sm font-medium mb-2">Internal Notes</label>
                            <textarea
                                rows={10}
                                className="w-full p-3 border rounded shadow-inner"
                                placeholder="Add internal notes, allergies, special requests..."
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    )
                }

                {/* --- REMINDER TAB --- */}
                {
                    activeTab === 'reminder' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="p-4 bg-yellow-50 text-yellow-800 rounded text-sm mb-4 border border-yellow-100">
                                <Info size={16} className="inline mr-2" />
                                Reminders will appear on the Home Dashboard when active.
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Reminder Date</label>
                                <input type="date" className="w-full p-2 border rounded" value={formData.reminderDate} onChange={e => setFormData({ ...formData, reminderDate: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Reminder Text</label>
                                <textarea rows={4} className="w-full p-3 border rounded" value={formData.reminderText} onChange={e => setFormData({ ...formData, reminderText: e.target.value })} />
                            </div>
                        </div>
                    )
                }

            </div >

            {/* Footer Actions */}
            < div className="p-6 border-t bg-gray-50 flex gap-3" >
                <button
                    onClick={handleSave}
                    className="flex-1 btn btn-primary py-3 flex justify-center items-center gap-2 shadow-lg hover:translate-y-[-1px] transition-transform"
                    disabled={!availability.allowed && formData.status !== BookingStatus.CANCELLED}
                >
                    <Check size={18} />
                    {initialBookingId ? 'Update Booking' : 'Create Booking'}
                </button>

                {
                    initialBookingId && (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="btn bg-white border border-red-200 text-red-600 hover:bg-red-50"
                        >
                            <Trash2 size={18} />
                        </button>
                    )
                }
            </div >

            {/* DUPLICATE GUEST ALERT MODAL */}
            {duplicateCandidate && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="bg-orange-50 p-4 border-b border-orange-100 flex items-center gap-3">
                            <div className="p-2 bg-orange-100 text-orange-600 rounded-full">
                                <AlertTriangle size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-orange-900">Possible Duplicate Guest</h3>
                                <p className="text-xs text-orange-700">A similar guest profile already exists.</p>
                            </div>
                        </div>

                        {/* Comparison */}
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                    <span className="font-bold text-gray-500 text-xs uppercase">New Entry</span>
                                    <div className="font-medium text-gray-900">{formData.firstName} {formData.surname}</div>
                                    <div className="text-gray-500">{formData.phone}</div>
                                    <div className="text-gray-500">{formData.email || '-'}</div>
                                </div>
                                <div className="space-y-1">
                                    <span className="font-bold text-[var(--color-forest-green)] text-xs uppercase">Existing Profile</span>
                                    <div className="font-medium text-gray-900">{duplicateCandidate.name}</div>
                                    <div className="text-gray-500">{duplicateCandidate.phone}</div>
                                    <div className="text-gray-500">{duplicateCandidate.email || '-'}</div>
                                </div>
                            </div>

                            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                                Would you like to use the <strong>Existing Profile</strong> to keep history together, or create a <strong>New Profile</strong>?
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="p-4 bg-gray-50 border-t flex flex-col gap-2">
                            <button
                                onClick={() => {
                                    // Use Existing
                                    selectGuest(duplicateCandidate);
                                    setDuplicateCandidate(null);
                                    // Logic will now use ID. But handleSave won't re-trigger automatically.
                                    // User will review form (now with ID) and click Save again. 
                                    // This is safer - allows them to verify fields.
                                }}
                                className="w-full py-2 bg-[var(--color-forest-green)] text-white font-bold rounded hover:bg-[var(--color-forest-green)]/90 flex items-center justify-center gap-2"
                            >
                                <User size={16} /> Use Existing Profile
                            </button>
                            <button
                                onClick={() => {
                                    // Create New
                                    setIgnoreDuplicate(true);
                                    setDuplicateCandidate(null);
                                    // User clicks save again.
                                }}
                                className="w-full py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded hover:bg-gray-100"
                            >
                                Continue as New Guest
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Overlay */}
            {
                showDeleteConfirm && (
                    <div className="absolute inset-0 bg-white/90 z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
                        <div className="bg-white shadow-2xl border rounded-xl p-6 max-w-sm w-full text-center">
                            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete booking?</h3>
                            <p className="text-sm text-gray-600 mb-6">
                                This will permanently delete the booking and cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-2 border rounded-lg hover:bg-gray-50 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
