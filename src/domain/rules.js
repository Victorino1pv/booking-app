import { BookingStatus, RateType, MAX_CAPACITY } from './models';

/**
 * Domain Business Rules
 */

/**
 * Checks if a booking request can be accommodated on a specific tour run.
 * 
 * @param {import('./models').TourRun} tourRun - The existing state of the tour day/jeep
 * @param {Object} request - The booking request details
 * @param {string} request.rateType - 'SHARED' or 'PRIVATE'
 * @param {string} request.tourOptionId - The tour being requested
 * @param {number} request.seats - Number of people (1-6)
 * @param {number} [seatCapacity] - Dynamic capacity (default 6)
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function checkAvailability(tourRun, request, seatCapacity = MAX_CAPACITY) {
    // 1. Basic Capacity Check
    if (request.seats > seatCapacity) {
        return { allowed: false, reason: `Max capacity is ${seatCapacity} people.` };
    }

    // 2. Empty Run - Anything goes
    if (!tourRun.type) {
        return { allowed: true };
    }

    // 3. Existing Private Tour - No new bookings allowed
    if (tourRun.type === RateType.PRIVATE) {
        return { allowed: false, reason: 'This jeep is booked for a Private tour.' };
    }

    // 3b. Blocked Vehicle
    if (tourRun.type === RateType.BLOCKED) {
        return { allowed: false, reason: `Vehicle unavailable: ${tourRun.blockReason || 'Blocked'}` };
    }

    // 4. Requesting Private on a Shared Run
    if (tourRun.type === RateType.SHARED && request.rateType === RateType.PRIVATE) {
        return { allowed: false, reason: 'Jeep already has Shared bookings. Cannot book Private.' };
    }

    // 5. Shared Logic
    if (tourRun.type === RateType.SHARED) {
        // 5a. Tour Option Lock
        if (tourRun.tourOptionId !== request.tourOptionId) {
            return { allowed: false, reason: 'Jeep is locked to a different Tour Option.' };
        }

        // 5b. Capacity Check
        const remainingSeats = seatCapacity - tourRun.occupiedSeats;
        if (request.seats > remainingSeats) {
            return { allowed: false, reason: `Not enough seats. Only ${remainingSeats} left.` };
        }

        return { allowed: true };
    }

    return { allowed: false, reason: 'Unknown state.' };
}

/**
 * Calculates the total price for a booking.
 * @param {Object} params
 * @param {string} params.rateType
 * @param {number} params.seats
 * @param {number} params.sharedPricePp
 * @param {number} params.privatePrice
 */
/**
 * Calculates the total price for a booking.
 * Resolution Order:
 * 1. Free Rate -> customPrice
 * 2. Stored Final Total -> booking.totalPrice
 * 3. Calculated -> (Private ? privatePrice : seats * shared)
 * 4. Fallback -> default rates if needed
 * 
 * @param {import('./models').Booking} booking
 * @param {Array<import('./models').Rate>} [rates] - Available rates for fallback
 * @returns {number} The total price (0 if unresolved)
 */
export function calculateBookingTotal(booking, rates = []) {
    // 1. Free Rate
    if (booking.pricingMode === 'FREE') {
        return Number(booking.customPrice) || 0;
    }

    // 2. Stored Final Total (if we trust it, but requirement said "calculation logic")
    // Requirement said: "If booking already stores a final value -> use stored total"
    if (booking.totalPrice !== undefined && booking.totalPrice !== null) {
        return Number(booking.totalPrice);
    }

    // 3. Calculated from Fields (Shared/Private)
    if (booking.rateType === RateType.PRIVATE) {
        if (booking.privatePrice) return Number(booking.privatePrice);
    } else {
        // Shared
        if (booking.pricePerPerson) return Number(booking.pricePerPerson) * Number(booking.seats);
    }

    // 4. Fallback (Lookup Rate from Settings)
    if (rates && rates.length > 0 && booking.tourOptionId) {
        const rate = rates.find(r => r.tourId === booking.tourOptionId && r.isActive);
        if (rate) {
            if (booking.rateType === RateType.PRIVATE) {
                return Number(rate.privatePrice) || 350; // Fallback hardcoded if rate allows
            } else {
                return (Number(rate.sharedPricePerPerson) || 60) * Number(booking.seats);
            }
        }
    }

    // 5. Ultimate Fallback (Hardcoded Defaults per prompt)
    if (booking.rateType === RateType.PRIVATE) return 350;
    return 60 * (Number(booking.seats) || 0);
}

/**
 * Calculates the total price for a booking (Deprecated/Simple version used by form before submit)
 * @param {Object} params
 * @param {string} params.rateType
 * @param {number} params.seats
 * @param {number} params.sharedPricePp
 * @param {number} params.privatePrice
 */
export function calculatePrice({ rateType, seats, sharedPricePp, privatePrice }) {
    if (rateType === RateType.PRIVATE) {
        return privatePrice;
    }
    return seats * sharedPricePp;
}

/**
 * Validates a booking before creation.
 * @param {import('./models').Booking} booking 
 * @param {number} [seatCapacity]
 */
export function validateBooking(booking, seatCapacity = MAX_CAPACITY) {
    const errors = {};

    // Profile Checks
    if (!booking.firstName?.trim()) errors.firstName = "First Name is required";
    if (!booking.surname?.trim()) errors.surname = "Surname is required";

    // Phone OR Email
    if (!booking.phone?.trim() && !booking.email?.trim()) {
        errors.phone = "Phone or Email is required";
        errors.email = "Phone or Email is required";
    }

    // Tour Checks
    // Tour Checks
    if (!booking.date && !booking.tourRunId) errors.date = "Date is required";
    // Stricter: If tourRunId exists but is just "-jeepId", we still need a date.
    // For now, rely on booking.date if present.
    if (booking.date === "" || booking.date === null) errors.date = "Tour Date is required";
    if (!booking.tourOptionId) errors.tourOptionId = "Tour Option is required";
    if (!booking.seats || booking.seats < 1) errors.seats = "Pax must be at least 1";
    if (booking.seats > seatCapacity) errors.seats = `Max capacity is ${seatCapacity}`;

    // Logistical
    if (!booking.pickup?.location?.trim()) errors.pickupLocation = "Pickup Location is required";
    if (!booking.pickup?.time?.trim()) errors.pickupTime = "Pickup Time is required";

    // Status / Commercial
    if (!booking.marketSourceId) errors.marketSourceId = "Market Source is required";
    if (!booking.status) errors.status = "Booking Status is required";
    if (!booking.paymentStatus) errors.paymentStatus = "Payment Status is required";

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}

/**
 * Derives the state of a Tour Run (Jeep + Date) from a list of bookings and blocks.
 * This is the Single Source of Truth for "What is happening on this jeep this day?".
 * 
 * @param {Array<import('./models').Booking>} bookings - ALL bookings (will be filtered)
 * @param {string} date - YYYY-MM-DD
 * @param {string} jeepId 
 * @param {string|null} excludeBookingId - ID of booking to ignore (for edits)
 * @param {number} [seatCapacity] - Dynamic capacity (default 6)
 * @param {Array<Object>} [blocks] - List of vehicle blocks
 * @returns {import('./models').TourRun & { isFull: boolean, isBlocked: boolean, blockReason: string }}
 */
export function getTourRunState(bookings, date, jeepId, excludeBookingId = null, seatCapacity = MAX_CAPACITY, blocks = []) {
    const tourRunId = `${date}-${jeepId}`;

    // 0. Check for Block
    const block = blocks.find(b => b.vehicleId === jeepId && b.date === date);
    if (block) {
        return {
            id: tourRunId,
            type: RateType.BLOCKED,
            tourOptionId: null,
            occupiedSeats: seatCapacity, // Treat as full
            seatsRemaining: 0,
            activeBookings: [],
            allBookings: [],
            isFull: true,
            isBlocked: true,
            blockReason: block.reason,
            blockId: block.id
        };
    }

    // Filter relevant bookings
    const allBookings = bookings.filter(b => b.tourRunId === tourRunId);
    let activeBookings = allBookings.filter(b => b.status !== BookingStatus.CANCELLED);

    if (excludeBookingId) {
        activeBookings = activeBookings.filter(b => b.id !== excludeBookingId);
    }

    // Derive State
    const first = activeBookings[0];
    const occupiedSeats = activeBookings.reduce((sum, b) => sum + b.seats, 0);

    const type = first ? first.rateType : null; // null = Empty
    const tourOptionId = first?.tourOptionId || null;

    const isFavorites = false; // logic placeholder
    const seatsRemaining = type === RateType.SHARED ? (seatCapacity - occupiedSeats) : (type === RateType.PRIVATE ? 0 : seatCapacity);

    // If type is explicitly private, it's full. If shared, it's full if 0 remaining.
    const isFull = (type === RateType.PRIVATE) || (type === RateType.SHARED && occupiedSeats >= seatCapacity);

    return {
        id: tourRunId,
        type,
        tourOptionId,
        occupiedSeats,
        seatsRemaining,
        activeBookings,
        allBookings,
        isFull,
        isBlocked: false
    };
}


