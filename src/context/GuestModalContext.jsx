 import React, { createContext, useContext, useState, useCallback } from 'react';

const GuestModalContext = createContext();

export function GuestModalProvider({ children }) {
    const [isOpen, setIsOpen] = useState(false);
    const [guestId, setGuestId] = useState(null);

    const openGuestProfile = useCallback((id) => {
        setGuestId(id);
        setIsOpen(true);
    }, []);

    const closeGuestProfile = useCallback(() => {
        setIsOpen(false);
        setGuestId(null);
    }, []);

    return (
        <GuestModalContext.Provider value={{ isOpen, guestId, openGuestProfile, closeGuestProfile }}>
            {children}
        </GuestModalContext.Provider>
    );
}

export function useGuestModal() {
    const context = useContext(GuestModalContext);
    if (!context) {
        throw new Error('useGuestModal must be used within a GuestModalProvider');
    }
    return context;
}
