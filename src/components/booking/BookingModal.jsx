import React from 'react';
import { useBookingModal } from '../../context/BookingModalContext';
import { BookingPanel } from './BookingPanel';

export function BookingModal() {
    const { isOpen, bookingId, defaultDate, defaultJeepId, close } = useBookingModal();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-opacity">
            {/* Modal Content - Slide Over */}
            <div className="w-full max-w-2xl h-full bg-white shadow-2xl transform transition-transform animate-in slide-in-from-right duration-300">
                <BookingPanel
                    initialBookingId={bookingId}
                    date={defaultDate}
                    jeepId={defaultJeepId}
                    onClose={close}
                />
            </div>
        </div>
    );
}
