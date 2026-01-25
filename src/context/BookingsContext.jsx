import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storageService, generateUUID } from '../services/storage';
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
            let finalVehicles = [];
            let finalBookings = [];
            let finalGuests = [];
            let allData = {};

            // 1. Initial Data Load Strategy
            // If Cloud Bookings, we START with empty local data to avoid pollution.
            // If Local Bookings, we load from storage.
            const useCloudBookings = import.meta.env.VITE_USE_SUPABASE_BOOKINGS === 'true' && supabase;

            if (!useCloudBookings) {
                // LOCAL MODE: Load everything from local storage
                const localData = await storageService.fetchAll();
                finalVehicles = localData.vehicles || [];
                finalBookings = localData.bookings || [];
                finalGuests = localData.guests || [];

                // Merge into allData for Reference items (we'll overwrite these if Ref Cloud is on)
                allData = { ...allData, ...localData };
            } else {
                // CLOUD MODE: Load NON-Booking local data (Settings, legacy ref data) 
                // just in case we need it for fallback reference (though Ref strict rules apply later).
                // Actually, let's load everything but ignore bookings/guests if strict.
                const localData = await storageService.fetchAll();
                allData = { ...allData, ...localData };
                // Explicitly clear bookings/guests from the "base" set so they don't leak in
                finalBookings = [];
                finalGuests = [];
                // Vehicles might still be local unless Vehicle Cloud Flag is on (handled below)
                finalVehicles = localData.vehicles || [];
            }

            let vSource = 'local';
            let bSource = useCloudBookings ? 'supabase' : 'local';

            // Feature Flag: Cloud Read Fallback (Vehicles)
            if (import.meta.env.VITE_USE_SUPABASE_VEHICLES === 'true' && supabase) {
                try {
                    const { data: cloudVehicles, error } = await supabase
                        .from('vehicles')
                        .select('*')
                        .order('created_at', { ascending: true });

                    if (!error && cloudVehicles) {
                        finalVehicles = cloudVehicles.map(v => ({
                            ...v,
                            id: v.id,
                            name: v.name,
                            driverName: v.driver_name, // Fix: Explicit mapping
                            seatCapacity: v.seat_capacity,
                            isActive: v.is_active !== false
                        }));
                        vSource = 'supabase';
                    }
                } catch (e) {
                    console.warn("Supabase (Vehicles) fetch failed, fallback local.", e);
                    // Vehicles fallback behavior: kept as "soft" fallback for now per instructions? 
                    // Or user said "Stop Silent Fallback" for Reference Data. Vehicles is semi-reference.
                    // For now, leaving Vehicles soft fallback UNLESS user complains, as the prompt focused on "Ref Data" and "Bookings".
                }
            }

            // Feature Flag: Cloud Read Fallback (Bookings)
            if (useCloudBookings) {
                try {
                    // 1. Fetch Bookings
                    const { data: cloudBookings, error: bookingError } = await supabase
                        .from('bookings')
                        .select('*, guests(*)') // Join guests for flattened data
                        .order('tour_date', { ascending: true });

                    if (bookingError) throw bookingError;

                    // 2. Fetch Guests (for Management List & Lookups)
                    const { data: cloudGuests, error: guestError } = await supabase
                        .from('guests')
                        .select('id, first_name, surname, email, phone, nationality, title, notes, profile_ref')
                        .order('surname', { ascending: true });

                    if (guestError) throw guestError;

                    // Map Guests to App Schema
                    finalGuests = (cloudGuests || []).map(g => ({
                        id: g.id,
                        name: `${g.first_name || ''} ${g.surname || ''}`.trim() || 'Unknown',
                        firstName: g.first_name,
                        surname: g.surname,
                        email: g.email,
                        phone: g.phone,
                        nationality: g.nationality,
                        title: g.title,
                        notes: g.notes,
                        profileRef: g.profile_ref
                    }));

                    // Map Bookings
                    if (cloudBookings) {
                        finalBookings = cloudBookings.map(b => {
                            // Flatten Guest Data for UI Compatibility
                            const guest = b.guests || {};
                            // Guest Name Construction (Cloud has no 'name' col)
                            const guestName = `${guest.first_name || ''} ${guest.surname || ''}`.trim() || 'Unknown';

                            // Reminder Re-hydration (Cloud Split -> UI Object)
                            let reminderObj = null;
                            if (b.reminder_at && b.reminder_text) {
                                // Standard Cloud Format
                                reminderObj = {
                                    date: b.reminder_at.substring(0, 10),
                                    text: b.reminder_text
                                };
                            } else if (b.reminder) {
                                // Legacy Fallback (JSON or String)
                                if (typeof b.reminder === 'object' && b.reminder.date) {
                                    reminderObj = b.reminder;
                                }
                            }

                            return {
                                id: b.id,
                                bookingRef: b.booking_ref,
                                status: b.status,
                                paymentStatus: b.payment_status,
                                pricingMode: b.pricing_mode,
                                totalPrice: b.total_price,
                                customPrice: b.custom_price,
                                pricePerPerson: b.price_per_person,
                                privatePrice: b.private_price,
                                rateType: b.rate_type,
                                notes: b.notes,
                                reminder: reminderObj,
                                seats: b.pax, // Map pax -> seats

                                // IDs
                                guestId: b.guest_id,
                                tourOptionId: b.tour_id,
                                vehicleId: b.vehicle_id, // Ensure we store vehicleId
                                agentId: b.agent_id,
                                marketSourceId: b.market_source_id,
                                marketSourceDetail: b.market_source_detail, // New Field

                                // Constructed Fields
                                tourRunId: `${b.tour_date}-${b.vehicle_id}`, // UI uses this heavily

                                // Pickup Object
                                pickup: {
                                    location: b.pickup_location || '',
                                    time: b.pickup_time ? b.pickup_time.slice(0, 5) : '09:00'
                                },

                                // Snapshot Guest Data (Flattened from Join)
                                leadGuestName: guestName,
                                firstName: guest.first_name || '',
                                surname: guest.surname || '',
                                phone: guest.phone || '',
                                email: guest.email || '',
                                nationality: guest.nationality || '',
                                title: guest.title || ''
                            };
                        });
                        bSource = 'supabase';

                        // In Cloud Mode, we update allData.guests with Cloud Guests
                        allData.guests = finalGuests;
                    }
                } catch (e) {
                    console.warn("Supabase (Bookings) fetch failed, strict mode engaged.", e);
                    setLastError("Bookings Error: " + e.message);

                    // STRICT MODE: Clear data
                    finalBookings = [];
                    finalGuests = [];
                    allData.guests = []; // Ensure context state is empty
                    bSource = 'supabase-error';
                }
            }

            // Feature Flag: Cloud Read Fallback (Reference Data: Tours, Rates, Agents, Market, Blocks, Settings)
            if (import.meta.env.VITE_USE_SUPABASE_REFERENCE_DATA === 'true' && supabase) {
                try {
                    // Fetch in parallel for speed
                    const [
                        { data: cloudTours, error: errTours },
                        { data: cloudRates, error: errRates },
                        { data: cloudAgents, error: errAgents },
                        { data: cloudSources, error: errSources },
                        { data: cloudBlocks, error: errBlocks },
                        { data: cloudSettings, error: errSettings }
                    ] = await Promise.all([
                        supabase.from('tours').select('*').order('created_at', { ascending: true }),
                        supabase.from('rates').select('*').order('created_at', { ascending: true }),
                        supabase.from('agents').select('*').order('created_at', { ascending: true }),
                        supabase.from('market_sources').select('*').order('created_at', { ascending: true }),
                        supabase.from('vehicle_blocks').select('*'),
                        supabase.from('settings').select('*').single()
                    ]);

                    if (errTours) throw errTours;
                    if (cloudTours) {
                        allData.tours = cloudTours.map(t => ({
                            id: t.id,
                            name: t.name,
                            color: t.color,
                            basePrice: t.base_price,
                            isActive: t.is_active !== false,
                            type: t.type
                        }));
                    }

                    if (errRates) throw errRates;
                    if (cloudRates) {
                        allData.rates = cloudRates.map(r => ({
                            id: r.id,
                            tourId: r.tour_id,
                            sharedPrice: r.shared_price,
                            privatePrice: r.private_price,
                            isActive: r.is_active !== false
                        }));
                    }

                    if (errAgents) throw errAgents;
                    if (cloudAgents) {
                        allData.agents = cloudAgents.map(a => ({
                            id: a.id,
                            name: a.name,
                            hasCommission: a.has_commission,
                            commissionValue: a.commission_value,
                            isActive: a.is_active !== false
                        }));
                    }

                    if (errSources) throw errSources;
                    if (cloudSources) {
                        allData.marketSources = cloudSources.map(s => ({
                            id: s.id,
                            name: s.name,
                            isActive: s.is_active !== false,
                            category: s.category
                        }));
                    }

                    if (errBlocks) throw errBlocks;
                    if (cloudBlocks) {
                        allData.vehicleBlocks = cloudBlocks.map(b => ({
                            id: b.id,
                            vehicleId: b.vehicle_id,
                            date: b.date,
                            reason: b.reason
                        }));
                    }

                    if (cloudSettings) {
                        allData.settings = { currency: cloudSettings.currency || 'EUR' };
                    } else if (errSettings && errSettings.code !== 'PGRST116') {
                        // ignore single row missing, keep defaults
                        throw errSettings;
                    }

                    setToursSource('supabase');
                    setMarketSourcesSource('supabase'); // Reusing states for indicators, though they are unified now
                } catch (e) {
                    console.warn("Supabase (Reference Data) fetch failed, fallback blocked.", e);
                    setLastError("Ref Data Error: " + e.message); // Expose error to UI

                    // Strict Mode: Clear data to prevent mixing Cloud/Local on error
                    allData.tours = [];
                    allData.rates = [];
                    allData.agents = [];
                    allData.marketSources = [];
                    allData.vehicleBlocks = [];
                    // Keep default settings or reset?
                    // allData.settings = { currency: 'EUR' }; // Optional: reset settings?

                    setToursSource('supabase-error');
                    setMarketSourcesSource('supabase-error');
                }
            } else {
                setToursSource('local');
                setMarketSourcesSource('local');
            }

            setVehiclesSource(vSource);
            setBookingsSource(bSource);

            setData(prev => ({
                ...prev,
                ...allData,
                bookings: finalBookings,
                vehicles: finalVehicles,
                // Ensure other arrays exist
                guests: allData.guests || [],
                jeeps: allData.jeeps || [],
                tours: allData.tours || [],
                marketSources: allData.marketSources || [],
                agents: allData.agents || [],
                rates: allData.rates || [],
                vehicleBlocks: allData.vehicleBlocks || []
            }));
        } catch (error) {
            console.error("Failed to load data", error);
            setLastError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    // Helper for Supabase Booking Payload
    const mapBookingToSupabase = (b) => {
        // Validates UUID format (simple regex)
        const isUuid = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        // Returns ID if valid UUID, else null (and logs warning)
        const sanitizeId = (id, fieldName) => {
            if (!id) return null;
            if (isUuid(id)) return id;
            console.warn(`Cloud: ${fieldName} not migrated yet ('${id}'); saved without ${fieldName}`);
            return null;
        };

        // Extract date/vehicle from tourRunId if not explicit?
        // UI sends `date` and `jeepId` in formData usually, but `addBooking` receives `bookingData`.
        // `bookingData` from `BookingPanel` has `date` and `jeepId`.
        // `storageService` might construct tourRunId.
        // We will prefer explicit properties if available, else parse tourRunId.

        let date = b.date;
        let vehicleId = b.jeepId || b.vehicleId;

        if (!date || !vehicleId) {
            // Fallback parse
            if (b.tourRunId) {
                const parts = b.tourRunId.split('-'); // 2025-01-25-jeep-1
                // Actually format is YYYY-MM-DD-vehicleID
                // Date is parts[0]-parts[1]-parts[2]
                date = `${parts[0]}-${parts[1]}-${parts[2]}`;
                vehicleId = parts.slice(3).join('-');
            }
        }

        return {
            id: b.id,
            booking_ref: b.bookingRef,
            tour_date: date,
            vehicle_id: sanitizeId(vehicleId, 'vehicle_id'),
            tour_id: sanitizeId(b.tourOptionId, 'tour_id'),
            guest_id: sanitizeId(b.guestId, 'guest_id'),
            agent_id: sanitizeId(b.agentId || b.agent_id, 'agent_id'),
            market_source_id: sanitizeId(b.marketSourceId, 'market_source_id'),
            market_source_detail: b.marketSourceDetail || null, // New Field
            status: b.status,
            payment_status: b.paymentStatus,
            pricing_mode: b.pricingMode,
            total_price: b.totalPrice,
            custom_price: b.customPrice,
            price_per_person: b.pricePerPerson,
            private_price: b.privatePrice,
            rate_type: b.rateType,
            pax: b.seats, // Map seats -> pax
            pickup_location: b.pickup?.location,
            pickup_time: b.pickup?.time,
            notes: b.notes,
            notes: b.notes,
            // Split Reminder (UI Object -> DB Columns)
            reminder_at: b.reminder?.date ? `${b.reminder.date}T09:00:00` : null,
            reminder_text: b.reminder?.text || null,
            reminder: null // Deprecate JSON column writing
        };
    };


    const removeBooking = async (id) => {
        if (import.meta.env.VITE_USE_SUPABASE_BOOKINGS === 'true' && supabase) {
            try {
                const { error } = await supabase.from('bookings').delete().eq('id', id);
                if (error) throw error;
                await refresh();
            } catch (err) {
                console.error("Supabase Delete Booking Error:", err);
                alert("Failed to delete booking in Cloud: " + err.message);
                throw err;
            }
        } else {
            await storageService.deleteBooking(id);
            setVersion(v => v + 1);
        }
    };

    const addMarketSource = async (s) => {
        if (import.meta.env.VITE_USE_SUPABASE_REFERENCE_DATA === 'true' && supabase) {
            try {
                if (!/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(s.id)) {
                    alert("Cannot save legacy Local item to Cloud. Please create a new item.");
                    return;
                }
                const payload = {
                    id: s.id,
                    name: s.name,
                    category: s.category,
                    is_active: s.isActive
                };
                const { error } = await supabase.from('market_sources').upsert(payload);
                if (error) throw error;
                await refresh();
            } catch (err) {
                console.error("Supabase Market Source Save Error:", err);
                alert("Failed to save Market Source to Cloud: " + err.message);
                throw err;
            }
        } else {
            await storageService.saveMarketSource(s);
            setVersion(v => v + 1);
        }
    };

    // Updated saveVehicle with Cloud Support
    const saveVehicle = async (v) => {
        if (import.meta.env.VITE_USE_SUPABASE_VEHICLES === 'true' && supabase) {
            try {
                // Map to Snake Case
                const dbPayload = {
                    id: v.id,
                    name: v.name,
                    driver_name: v.driverName,
                    seat_capacity: Number(v.seatCapacity),
                    is_active: v.isActive,
                    // updated_at: new Date().toISOString() // Let DB handle this usually, or send it? DB defaults to now() on update often, but let's leave it to DB trigger or default.
                };

                const { error } = await supabase
                    .from('vehicles')
                    .upsert(dbPayload)
                    .select();

                if (error) throw error;

                // On success, refresh local state to reflect change (or optimistic update)
                // For safety and simplicity, just refresh
                await refresh();
                return { success: true };
            } catch (err) {
                console.error("Supabase Save Error:", err);
                alert("Failed to save to Cloud: " + err.message); // Simple alert as requested fallback
                throw err; // Re-throw to stop UI from thinking it succeeded if needed
            }
        } else {
            // Local Fallback
            await storageService.saveVehicle(v);
            setVersion(v => v + 1);
        }
    };

    const saveAgent = async (a) => {
        if (import.meta.env.VITE_USE_SUPABASE_REFERENCE_DATA === 'true' && supabase) {
            try {
                if (!/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(a.id)) {
                    alert("Cannot save legacy item to Cloud."); return;
                }
                const payload = {
                    id: a.id,
                    name: a.name,
                    has_commission: a.hasCommission,
                    commission_value: a.commissionValue,
                    is_active: a.isActive
                };
                const { error } = await supabase.from('agents').upsert(payload);
                if (error) throw error;
                await refresh();
            } catch (err) {
                console.error("Supabase Agent Save Error:", err);
                alert("Failed to save Agent: " + err.message);
                throw err;
            }
        } else {
            await storageService.saveAgent(a); setVersion(v => v + 1);
        }
    };

    const saveRate = async (r) => {
        if (import.meta.env.VITE_USE_SUPABASE_REFERENCE_DATA === 'true' && supabase) {
            try {
                if (!/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(r.id)) {
                    alert("Cannot save legacy item to Cloud."); return;
                }
                const payload = {
                    id: r.id,
                    tour_id: r.tourId,
                    shared_price: r.sharedPrice,
                    private_price: r.privatePrice,
                    is_active: r.isActive
                };
                const { error } = await supabase.from('rates').upsert(payload);
                if (error) throw error;
                await refresh();
            } catch (err) {
                console.error("Supabase Rate Save Error:", err);
                alert("Failed to save Rate: " + err.message);
                throw err;
            }
        } else {
            await storageService.saveRate(r); setVersion(v => v + 1);
        }
    };
    const saveTour = async (t) => {
        if (import.meta.env.VITE_USE_SUPABASE_REFERENCE_DATA === 'true' && supabase) {
            try {
                // Validate UUID
                if (!/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(t.id)) {
                    alert("Cannot save legacy Local item to Cloud. Please create a new item.");
                    return;
                }

                const payload = {
                    id: t.id,
                    name: t.name,
                    color: t.color,
                    base_price: t.basePrice,
                    type: t.type,
                    is_active: t.isActive
                };
                const { error } = await supabase.from('tours').upsert(payload);
                if (error) throw error;
                await refresh();
            } catch (err) {
                console.error("Supabase Tour Save Error:", err);
                alert("Failed to save Tour to Cloud: " + err.message);
                throw err;
            }
        } else {
            await storageService.saveTour(t);
            setVersion(v => v + 1);
        }
    };
    const saveSettings = async (settings) => {
        if (import.meta.env.VITE_USE_SUPABASE_REFERENCE_DATA === 'true' && supabase) {
            try {
                const payload = {
                    id: 1, // Singleton
                    currency: settings.currency,
                    updated_at: new Date().toISOString()
                };
                const { error } = await supabase.from('settings').upsert(payload);
                if (error) throw error;
                await refresh();
            } catch (err) {
                console.error("Supabase Settings Save Error:", err);
                alert("Failed to save Settings: " + err.message);
                throw err;
            }
        } else {
            await storageService._saveCollection('settings', settings);
            setVersion(v => v + 1);
        }
    };

    const deleteGuest = async (guestId) => {
        await storageService.deleteGuest(guestId);
        setVersion(v => v + 1);
        return { success: true };
    };

    const blockVehicle = async (block) => {
        if (import.meta.env.VITE_USE_SUPABASE_REFERENCE_DATA === 'true' && supabase) {
            try {
                const payload = {
                    id: block.id || generateUUID(),
                    vehicle_id: block.vehicleId,
                    date: block.date,
                    reason: block.reason
                };
                const { error } = await supabase.from('vehicle_blocks').upsert(payload);
                if (error) throw error;
                await refresh();
            } catch (err) {
                console.error("Supabase Block Save Error:", err);
                alert("Failed to save Block: " + err.message);
                throw err;
            }
        } else {
            await storageService.saveVehicleBlock(block);
            setVersion(v => v + 1);
        }
    };

    const unblockVehicle = async (blockId) => {
        if (import.meta.env.VITE_USE_SUPABASE_REFERENCE_DATA === 'true' && supabase) {
            try {
                const { error } = await supabase.from('vehicle_blocks').delete().eq('id', blockId);
                if (error) throw error;
                await refresh();
            } catch (err) {
                console.error("Supabase Unblock Error:", err);
                alert("Failed to Unblock: " + err.message);
                throw err;
            }
        } else {
            await storageService.deleteVehicleBlock(blockId);
            setVersion(v => v + 1);
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

    // Helper: Ensure Guest exists (Local Store - only used in Local Mode now, or legacy sync)
    // In Strict Cloud Mode, we rely on ensureGuestInCloud
    const ensureGuest = async (bookingData) => {
        // If strict cloud mode, we skip local guest creation entirely
        if (import.meta.env.VITE_USE_SUPABASE_BOOKINGS === 'true' && supabase) {
            return null; // Local guest irrelevant
        }

        const guests = await storageService.getGuests();
        let guest = null;

        if (bookingData.guestId) {
            guest = guests.find(g => g.id === bookingData.guestId);
            if (guest) {
                const updated = {
                    ...guest,
                    name: bookingData.leadGuestName || guest.name,
                    phone: bookingData.phone || guest.phone,
                    email: bookingData.email || guest.email,
                    title: bookingData.title || guest.title,
                    firstName: bookingData.firstName || guest.firstName,
                    surname: bookingData.surname || guest.surname,
                    nationality: bookingData.nationality || guest.nationality
                };
                updated.phone = bookingData.phone;
                updated.email = bookingData.email;
                await storageService.saveGuest(updated);
                return updated;
            }
        }
        if (!guest && bookingData.phone) {
            const cleanPhone = bookingData.phone.trim();
            if (cleanPhone) {
                guest = guests.find(g => g.phone && g.phone.trim() === cleanPhone);
            }
        }

        if (!guest && bookingData.email) {
            const cleanEmail = bookingData.email.trim().toLowerCase();
            if (cleanEmail) {
                guest = guests.find(g => g.email && g.email.trim().toLowerCase() === cleanEmail);
            }
        }

        if (guest && !bookingData.guestId) {
            const updated = {
                ...guest,
                name: bookingData.leadGuestName,
                phone: bookingData.phone,
                email: bookingData.email,
            };
            await storageService.saveGuest(updated);
            return updated;
        }

        if (!guest) {
            guest = {
                id: generateUUID(),
                name: bookingData.leadGuestName,
                phone: bookingData.phone,
                email: bookingData.email,
                title: bookingData.title || '',
                firstName: bookingData.firstName || '',
                surname: bookingData.surname || '',
                nationality: bookingData.nationality || '',
                createdAt: new Date().toISOString()
            };
            await storageService.saveGuest(guest);
        }
        return guest;
    };

    // Helper: Ensure Guest exists in Supabase (by email/phone match or create)
    const ensureGuestInCloud = async (bookingData) => {
        // 1. Check if we have a UUID guestId already (migrated)
        if (bookingData.guestId && /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(bookingData.guestId)) {
            // We could verify it exists, but let's assume valid UUID is cloud-ready or will fail FK if really missing.
            // Ideally we upsert updates here too? For MVP, just return it.
            return bookingData.guestId;
        }

        // 2. Try match by Email
        if (bookingData.email) {
            const cleanEmail = bookingData.email.trim().toLowerCase();
            const { data: byEmail } = await supabase
                .from('guests')
                .select('id')
                .eq('email', cleanEmail)
                .maybeSingle(); // Use maybeSingle to avoid 406 on multiple? Or limit 1.

            if (byEmail) return byEmail.id;
        }

        // 3. Try match by Phone
        if (bookingData.phone) {
            const cleanPhone = bookingData.phone.trim();
            const { data: byPhone } = await supabase
                .from('guests')
                .select('id')
                .eq('phone', cleanPhone)
                .maybeSingle();

            if (byPhone) return byPhone.id;
        }

        // 4. Create New Guest in Cloud
        // Parsing Name if firstName/surname not explicit
        let finalFirstName = bookingData.firstName || '';
        let finalSurname = bookingData.surname || '';

        if ((!finalFirstName || !finalSurname) && bookingData.leadGuestName) {
            const parts = bookingData.leadGuestName.trim().split(' ');
            if (parts.length > 0) {
                finalFirstName = parts[0];
                finalSurname = parts.slice(1).join(' ');
            } else {
                finalSurname = bookingData.leadGuestName; // Fallback? Or First Name?
                // Actually usually if 1 word, it's first name.
                finalFirstName = bookingData.leadGuestName;
                finalSurname = '';
            }
        }

        const newGuest = {
            // NO `name` column in DB. Use valid schema.
            first_name: finalFirstName,
            surname: finalSurname,
            email: bookingData.email,
            phone: bookingData.phone,
            nationality: bookingData.nationality,
            title: bookingData.title,
            notes: '',
            profile_ref: `GP-${Math.floor(Math.random() * 10000)}`
        };

        // Check if we need to send ID? Usually Supabase defaults if not provided.
        const { data: created, error } = await supabase
            .from('guests')
            .insert(newGuest)
            .select('id') // Important: get the new ID
            .single();

        if (error) {
            console.error("Cloud Guest Create Failed:", error);
            throw new Error("Failed to create Guest record in Cloud: " + error.message);
        }
        return created.id;
    };

    const addBooking = async (bookingData) => {
        if (import.meta.env.VITE_USE_SUPABASE_BOOKINGS === 'true' && supabase) {
            try {
                // CLOUD ONLY
                const cloudGuestId = await ensureGuestInCloud(bookingData);
                const finalBooking = {
                    ...bookingData,
                    guestId: cloudGuestId,
                    bookingRef: bookingData.bookingRef || generateUUID().slice(0, 6).toUpperCase()
                };

                const payload = mapBookingToSupabase(finalBooking);
                const { error } = await supabase.from('bookings').insert(payload);
                if (error) throw error;
                await refresh();
                return { success: true };
            } catch (err) {
                console.error("Supabase Add Booking Error:", err);
                alert("Failed to create booking in Cloud (Strict): " + err.message);
                throw err;
            }
        } else {
            // LOCAL ONLY
            const guest = await ensureGuest(bookingData);
            const finalBooking = {
                ...bookingData,
                guestId: guest.id,
                bookingRef: bookingData.bookingRef || generateUUID().slice(0, 6).toUpperCase()
            };
            const saved = await storageService.saveBooking(finalBooking);
            setVersion(v => v + 1);
            return saved;
        }
    };

    const updateBooking = async (bookingData) => {
        if (import.meta.env.VITE_USE_SUPABASE_BOOKINGS === 'true' && supabase) {
            try {
                // CLOUD ONLY
                const cloudGuestId = await ensureGuestInCloud(bookingData);
                const finalBooking = { ...bookingData, guestId: cloudGuestId };

                const payload = mapBookingToSupabase(finalBooking);
                const { error } = await supabase
                    .from('bookings')
                    .update(payload)
                    .eq('id', finalBooking.id);

                if (error) throw error;
                await refresh();
                return finalBooking;
            } catch (err) {
                console.error("Supabase Update Booking Error:", err);
                alert("Failed to update booking in Cloud (Strict): " + err.message);
                throw err;
            }
        } else {
            // LOCAL ONLY
            const guest = await ensureGuest(bookingData);
            const finalBooking = { ...bookingData, guestId: guest.id };
            await storageService.updateBooking(finalBooking);
            setVersion(v => v + 1);
            return finalBooking;
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
