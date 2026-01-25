import { useBookingsContext } from '../context/BookingsContext';

export function useBookings() {
    return useBookingsContext();
}
