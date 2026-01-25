import React, { createContext, useContext, useState, useCallback } from 'react';

const BookingModalContext = createContext();

export function BookingModalProvider({ children }) {
    const [isOpen, setIsOpen] = useState(false);
    const [bookingId, setBookingId] = useState(null); // If null -> Create Mode
    const [defaultDate, setDefaultDate] = useState(null);
    const [defaultJeepId, setDefaultJeepId] = useState(null);

    const [isBulkBlockOpen, setIsBulkBlockOpen] = useState(false);

    const openCreate = useCallback((date, jeepId) => {
        setBookingId(null);
        setDefaultDate(date || new Date().toISOString().split('T')[0]);
        setDefaultJeepId(jeepId || 'jeep-1');
        setIsOpen(true);
        setIsBulkBlockOpen(false);
    }, []);

    const openEdit = useCallback((id) => {
        setBookingId(id);
        setDefaultDate(null);
        setDefaultJeepId(null);
        setIsOpen(true);
        setIsBulkBlockOpen(false);
    }, []);

    const openBulkBlock = useCallback(() => {
        setIsBulkBlockOpen(true);
        setIsOpen(false);
    }, []);

    const close = useCallback(() => {
        setIsOpen(false);
        setBookingId(null);
        setDefaultDate(null);
        setDefaultJeepId(null);
        setIsBulkBlockOpen(false);
    }, []);

    return (
        <BookingModalContext.Provider value={{
            isOpen,
            bookingId,
            defaultDate,
            defaultJeepId,
            isBulkBlockOpen,
            openCreate,
            openEdit,
            openBulkBlock,
            close
        }}>
            {children}
        </BookingModalContext.Provider>
    );
}

export function useBookingModal() {
    const context = useContext(BookingModalContext);
    if (!context) {
        throw new Error('useBookingModal must be used within a BookingModalProvider');
    }
    return context;
}
