/**
 * Domain Entities for Madeira Green & Blue
 */

/**
 * @typedef {Object} Jeep
 * @property {string} id
 * @property {string} name
 * @property {string} driverId
 */

/**
 * @typedef {Object} TourOption
 * @property {string} id
 * @property {string} name
 * @property {string} color - Hex code for UI
 */

/**
 * @typedef {Object} TourRun
 * @property {string} id - Composite key: "date-jeepId"
 * @property {string} date - ISO Date string (YYYY-MM-DD)
 * @property {string} jeepId
 * @property {string} [type] - 'SHARED' or 'PRIVATE' or null (if empty)
 * @property {string} [tourOptionId] - ID of the locked tour option
 * @property {number} occupiedSeats - Current count of passengers
 * @property {string[]} bookingIds - List of associated bookings
 */

/**
 * @typedef {Object} Booking
 * @property {string} id
 * @property {string} tourRunId
 * @property {string} leadGuestName
 * @property {string} phone
 * @property {string} [email]
 * @property {number} seats - 1-6
 * @property {string} createdDate - ISO Timestamp
 * @property {string} marketSource
 * @property {string} rateType - 'SHARED' or 'PRIVATE'
 * @property {number} pricePerPerson - If Shared
 * @property {number} privatePrice - If Private
 * @property {number} totalPrice
 * @property {Object} pickup
 * @property {string} pickup.location
 * @property {string} pickup.time
 * @property {string} [pickup.notes]
 * @property {string} [notes]
 * @property {string} status - 'TENTATIVE', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'
 * @property {string} paymentStatus - 'UNPAID', 'DEPOSIT', 'PAID'
 */

export const BookingStatus = {
  TENTATIVE: 'TENTATIVE',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  DONE: 'DONE'
};

export const PaymentStatus = {
  PENDING: 'PENDING',
  CASH: 'CASH',
  CARD: 'CARD',
  PAYPAL: 'PAYPAL',
  BANK_TRANSFER: 'BANK_TRANSFER',
  COMPLIMENTARY: 'COMPLIMENTARY'
};

export const RateType = {
  SHARED: 'SHARED',
  PRIVATE: 'PRIVATE',
  BLOCKED: 'BLOCKED'
};

export const MAX_CAPACITY = 6;

/**
 * @typedef {Object} Guest
 * @property {string} id - UUID
 * @property {string} name
 * @property {string} phone - Unique identifier for matching
 * @property {string} [email]
 * @property {string} [notes]
 * @property {string} createdAt
 * @property {number} bookingCount - Derived/Cached
 */

/**
 * @typedef {Object} MarketSource
 * @property {string} id - UUID
 * @property {string} name - e.g. "Viator", "Hotel Savoy"
 * @property {string} [category] - e.g. "OTA", "Hotel", "Direct"
 * @property {boolean} isActive
 */
