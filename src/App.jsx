import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { storageService } from './services/storage';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { CalendarPage } from './pages/CalendarPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { BookingsPage } from './pages/BookingsPage';
import { LoginPage } from './pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';

import { BookingModalProvider } from './context/BookingModalContext';
import { BookingModal } from './components/booking/BookingModal';
import { BookingsProvider } from './context/BookingsContext';
import { GuestModalProvider } from './context/GuestModalContext';
import { GuestProfileModal } from './components/guests/GuestProfileModal';
import { BulkBlockModal } from './components/modals/BulkBlockModal';
import { useBookingModal } from './context/BookingModalContext';

function GlobalModals() {
    const { isBulkBlockOpen, close } = useBookingModal();
    return (
        <>
            <BookingModal />
            <GuestProfileModal />
            {isBulkBlockOpen && <BulkBlockModal onClose={close} />}
        </>
    );
}

function App() {
    return (
        <BookingsProvider>
            <BookingModalProvider>
                <GuestModalProvider>
                    <BrowserRouter>
                        <GlobalModals />
                        <Routes>
                            <Route path="/login" element={<LoginPage />} />

                            <Route element={<ProtectedRoute />}>
                                <Route path="/" element={<Layout />}>
                                    <Route index element={<HomePage />} />
                                    <Route path="calendar" element={<CalendarPage />} />
                                    <Route path="bookings" element={<BookingsPage />} />
                                    <Route path="reports" element={<ReportsPage />} />
                                    <Route path="settings" element={<SettingsPage />} />
                                </Route>
                            </Route>
                        </Routes>
                    </BrowserRouter>
                </GuestModalProvider >
            </BookingModalProvider >
        </BookingsProvider >
    );
}

export default App;
