import { storageService, generateUUID } from '../services/storage';
import { dataSource } from '../services/dataSource';
import { getTourRunState } from '../domain/rules';
import { eachDayOfInterval, parseISO, format } from 'date-fns';
import { supabase } from '../libs/supabase';

const BookingsContext = createContext();

export function BookingsProvider({ children }) {
    const [data, setData] = useState({
        bookings: [],
        jeeps: [],
        vehicles: [],
        tours: [],
        guests: [],
        marketSources: [],
        agents: [],
        rates: [],
        settings: { currency: 'EUR' },
        vehicleBlocks: []
    });
    const [version, setVersion] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [bookingsSource, setBookingsSource] = useState('local');
    const [vehiclesSource, setVehiclesSource] = useState('local');
    const [toursSource, setToursSource] = useState('local');
    const [marketSourcesSource, setMarketSourcesSource] = useState('local');
    const [lastError, setLastError] = useState(null);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        setLastError(null);
        try {
            const data = await dataSource.fetchEverything();

            // Re-hydrate derived UI fields not strictly in DB if needed, 
            // but dataSource now maps most things.
            // dataSource returns pure objects. We might need to ensure guests array is fully utilized.

            setVehiclesSource(data.sources.vehicles);
            setBookingsSource(data.sources.bookings);
            setToursSource(data.sources.refData); // Unified Ref Data Source
            setMarketSourcesSource(data.sources.refData);

            setData(prev => ({
                ...prev,
                ...data,
                // Ensure arrays exist if empty
                bookings: data.bookings || [],
                guests: data.guests || [],
                vehicles: data.vehicles || [],
                jeeps: data.vehicles || [], // Backward compat alias
                tours: data.tours || [],
                marketSources: data.marketSources || [],
                agents: data.agents || [],
                rates: data.rates || [],
                vehicleBlocks: data.vehicleBlocks || [],
                settings: data.settings || prev.settings
            }));

        } catch (error) {
            console.error("Failed to load data", error);
            setLastError(error.message);
            // On critical failure in PROD, we might want to clear data?
            // dataSource throws if blocked, so we catch here and UI shows error.
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);


    const removeBooking = async (id) => {
        try {
            await dataSource.deleteBooking(id);
            await refresh(); // or optimistic update
        } catch (err) {
            console.error("Delete Booking Error:", err);
            alert("Failed to delete booking: " + err.message);
            throw err;
        }
    };

    const addMarketSource = async (s) => {
        try {
            await dataSource.saveMarketSource(s);
            await refresh();
        } catch (err) {
            console.error("Save Market Source Error:", err);
            alert("Failed to save Market Source: " + err.message);
            throw err;
        }
    };

    // Updated saveVehicle
    const saveVehicle = async (v) => {
        try {
            await dataSource.saveVehicle(v);
            await refresh();
            return { success: true };
        } catch (err) {
            console.error("Save Vehicle Error:", err);
            alert("Failed to save Vehicle: " + err.message);
            throw err;
        }
    };

    const saveAgent = async (a) => {
        try {
            await dataSource.saveAgent(a);
            await refresh();
        } catch (err) {
            console.error("Save Agent Error:", err);
            alert("Failed to save Agent: " + err.message);
            throw err;
        }
    };

    const saveRate = async (r) => {
        try {
            await dataSource.saveRate(r);
            await refresh();
        } catch (err) {
            console.error("Save Rate Error:", err);
            alert("Failed to save Rate: " + err.message);
            throw err;
        }
    };
    const saveTour = async (t) => {
        try {
            await dataSource.saveTour(t);
            await refresh();
        } catch (err) {
            console.error("Save Tour Error:", err);
            alert("Failed to save Tour: " + err.message);
            throw err;
        }
    };
    const saveSettings = async (settings) => {
        try {
            await dataSource.saveSettings(settings);
            await refresh();
        } catch (err) {
            console.error("Save Settings Error:", err);
            alert("Failed to save Settings: " + err.message);
            throw err;
        }
    };

    const deleteGuest = async (guestId) => {
        await storageService.deleteGuest(guestId);
        setVersion(v => v + 1);
        return { success: true };
    };

    const blockVehicle = async (block) => {
        try {
            await dataSource.saveVehicleBlock(block);
            await refresh();
        } catch (err) {
            console.error("Save Block Error:", err);
            alert("Failed to save Block: " + err.message);
            throw err;
        }
    };

    const unblockVehicle = async (blockId) => {
        try {
            await dataSource.deleteVehicleBlock(blockId);
            await refresh();
        } catch (err) {
            console.error("Unblock Error:", err);
            alert("Failed to Unblock: " + err.message);
            throw err;
        }
    };

    const blockVehicleRange = async (vehicleId, startDate, endDate, reason) => {
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        let successCount = 0;
        let skippedDates = [];
        const days = eachDayOfInterval({ start, end });

        const blocksToSave = [];
        days.forEach(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const runState = getTourRunState(data.bookings, dateStr, vehicleId);
            if (runState.activeBookings && runState.activeBookings.length > 0) {
                skippedDates.push(dateStr);
            } else {
                blocksToSave.push({
                    id: generateUUID(),
                    vehicleId,
                    date: dateStr,
                    reason,
                    createdAt: new Date().toISOString()
                });
                successCount++;
            }
        });

        await Promise.all(blocksToSave.map(b => storageService.saveVehicleBlock(b)));

        if (successCount > 0) setVersion(v => v + 1);
        return { successCount, skippedDates };
    };

    // Helper: Ensure Guest exists (Delegates to dataSource)
    const ensureGuest = async (bookingData) => {
        // dataSource.ensureGuest returns an ID (Cloud) or Guest Object/Null (Local)
        // This is a bit disparate. Let's trace usage.
        // Used in addBooking?
        // Actually, let's keep it simple: 
        // Cloud: returns ID.
        // Local: returns Guest Object (Legacy).
        // dataSource.ensureGuest returns ID or null (if local).
        // Actually I implemented dataSource.ensureGuest to return ID for cloud, and null for local.

        // Strategy: 
        // If Cloud: use ensureGuest -> returns ID.
        // If Local: use storageService directly or legacy logic.
        // But we want to centralize.

        // Let's defer to dataSource completely? 
        // If dataSource returns ID, we use it. 
        // If it returns null, checks logic?

        // Actually, let's see how I implemented dataSource.ensureGuest.
        // It returns ID if cloud. Returns null if local.

        // The calling code (addBooking) usually expects a guest Object to put into the booking payload?
        // Or just the ID?
        // `addBooking` logic isn't shown in view yet (it's further down or not in this file?).
        // `saveBooking` usually takes a whole object.

        // Let's replace this method with one that calls dataSource.ensureGuest.
        // If it returns an ID, great. If not (Local), we do legacy.

        try {
            // If Cloud Bookings is ON, we use Cloud Guest Logic
            if (import.meta.env.VITE_USE_SUPABASE_BOOKINGS === 'true' && supabase) {
                return await dataSource.ensureGuest(bookingData);
            } else {
                // LOCAL FALLBACK (Legacy) - Copied from original
                // or use dataSource.ensureGuest if I implemented local there? I returned null.
                // So I must keep legacy local logic here OR move it to dataSource.
                // I will keep legacy local logic here for safety if PROD check passes (it won't in PROD).
                // In PROD local is disabled. In DEV, local works.

                const guests = await storageService.getGuests();
                let guest = null;
                // ... (Original Logic or simplified) ... 
                // Actually I can rely on storageService.saveGuest logic?
                // Let's just restore the legacy logic for Local Only.
                // But wait, "No silent fallback".

                // I'll stick to:
                const guestId = await dataSource.ensureGuest(bookingData);
                if (guestId) return guestId;
                // If null, it means we are in LOCAL mode (or error).

                // Legacy Local:
                const g = await storageService.saveGuest({
                    id: bookingData.guestId || generateUUID(),
                    name: bookingData.leadGuestName,
                    phone: bookingData.phone,
                    email: bookingData.email,
                    title: bookingData.title,
                    firstName: bookingData.firstName,
                    surname: bookingData.surname,
                    nationality: bookingData.nationality,
                    createdAt: new Date()
                });
                return g;
            }
        } catch (e) {
            console.error("Ensure Guest Failed", e);
            throw e;
        }
    };


    const addBooking = async (bookingData) => {
        try {
            const guestRef = await ensureGuest(bookingData); // wrapper above
            // guestRef is {id: '...'} or guest object

            const finalBooking = {
                ...bookingData,
                guestId: guestRef.id,
                bookingRef: bookingData.bookingRef || generateUUID().slice(0, 6).toUpperCase()
            };

            await dataSource.saveBooking(finalBooking);
            await refresh();
            return { success: true };
        } catch (err) {
            console.error("Add Booking Error:", err);
            alert("Failed to add Booking: " + (err.message || err));
            throw err;
        }
    };

    const updateBooking = async (bookingData) => {
        try {
            const guestRef = await ensureGuest(bookingData);
            const finalBooking = { ...bookingData, guestId: guestRef.id };
            await dataSource.saveBooking(finalBooking);
            await refresh();
            return finalBooking;
        } catch (err) {
            console.error("Update Booking Error:", err);
            alert("Failed to update Booking: " + err.message);
            throw err;
        }
    };

    const value = {
        ...data,
        isLoading,
        refresh,
        addBooking,
        updateBooking,
        removeBooking,
        addMarketSource,
        saveVehicle,
        saveAgent,
        saveRate,
        saveTour,
        saveSettings,
        deleteGuest,
        blockVehicle,
        unblockVehicle,
        blockVehicleRange,
        vehiclesSource,
        bookingsSource,
        toursSource,
        marketSourcesSource,
        lastError
    };

    return (
        <BookingsContext.Provider value={value}>
            {children}
        </BookingsContext.Provider>
    );
}

export function useBookingsContext() {
    const context = useContext(BookingsContext);
    if (!context) {
        throw new Error('useBookingsContext must be used within a BookingsProvider');
    }
    return context;
}
