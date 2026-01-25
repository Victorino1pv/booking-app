

const API_URL = `http://${window.location.hostname}:3001/api`;

// Helper to block production API calls
const checkEnv = () => {
    if (!import.meta.env.DEV) {
        throw new Error("Local API connection disabled in Production. Please enable Cloud Data Sources.");
    }
};

/**
 * Async Storage Service (Proxy to Backend)
 */
export const storageService = {

    // FETCH ALL (For initial load / Refresh)
    fetchAll: async () => {
        checkEnv();
        const response = await fetch(`${API_URL}/data`);
        if (!response.ok) throw new Error('Failed to fetch data');
        return await response.json();
    },

    // Individual Getters (Should generally fetch fresh or rely on Context cache)
    getJeeps: async () => { checkEnv(); return (await fetch(`${API_URL}/data/jeeps`)).json(); },
    getVehicles: async () => { checkEnv(); return (await fetch(`${API_URL}/data/vehicles`)).json(); },
    getTours: async () => { checkEnv(); return (await fetch(`${API_URL}/data/tours`)).json(); },
    getBookings: async () => { checkEnv(); return (await fetch(`${API_URL}/data/bookings`)).json(); },
    getGuests: async () => { checkEnv(); return (await fetch(`${API_URL}/data/guests`)).json(); },
    getMarketSources: async () => { checkEnv(); return (await fetch(`${API_URL}/data/marketSources`)).json(); },
    getAgents: async () => { checkEnv(); return (await fetch(`${API_URL}/data/agents`)).json(); },
    getRates: async () => { checkEnv(); return (await fetch(`${API_URL}/data/rates`)).json(); },
    getSettings: async () => { checkEnv(); return (await fetch(`${API_URL}/data/settings`)).json(); },
    getVehicleBlocks: async () => { checkEnv(); return (await fetch(`${API_URL}/data/vehicleBlocks`)).json(); },

    // SAVERS (Async)
    _saveCollection: async (key, data) => {
        checkEnv();
        await fetch(`${API_URL}/data/${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    },

    saveBooking: async (booking) => {
        // Optimistic update locally BEFORE fetch? No, this service IS the fetch.
        // But for "save" operations, we might want to checkEnv too.
        checkEnv();
        const bookings = await storageService.getBookings(); // Will throw if env check fails
        if (!booking.bookingRef) booking.bookingRef = storageService._generateRef(6);

        const idx = bookings.findIndex(b => b.id === booking.id);
        if (idx >= 0) bookings[idx] = booking;
        else bookings.push(booking);

        await storageService._saveCollection('bookings', bookings);
        return booking;
    },

    updateBooking: async (booking) => {
        return storageService.saveBooking(booking);
    },

    deleteBooking: async (id) => {
        checkEnv();
        let bookings = await storageService.getBookings();
        bookings = bookings.filter(b => b.id !== id);
        await storageService._saveCollection('bookings', bookings);
    },

    saveGuest: async (guest) => {
        checkEnv();
        const guests = await storageService.getGuests();

        // Ensure Profile Ref
        if (!guest.profileRef) guest.profileRef = storageService._generateRef(6);

        const idx = guests.findIndex(g => g.id === guest.id);
        if (idx >= 0) guests[idx] = guest;
        else guests.push(guest);

        await storageService._saveCollection('guests', guests);
        return guest;
    },

    deleteGuest: async (guestId) => {
        checkEnv();
        const bookings = await storageService.getBookings();
        if (bookings.some(b => b.guestId === guestId)) return { success: false, error: 'HAS_BOOKINGS' };

        let guests = await storageService.getGuests();
        guests = guests.filter(g => g.id !== guestId);
        await storageService._saveCollection('guests', guests);
        return { success: true };
    },

    saveVehicleBlock: async (block) => {
        checkEnv();
        const blocks = await storageService.getVehicleBlocks();
        const idx = blocks.findIndex(b => b.vehicleId === block.vehicleId && b.date === block.date);

        const finalBlock = { ...block, id: block.id || generateUUID(), createdAt: new Date().toISOString() };
        if (idx >= 0) blocks[idx] = finalBlock;
        else blocks.push(finalBlock);

        await storageService._saveCollection('vehicleBlocks', blocks);
    },

    deleteVehicleBlock: async (blockId) => {
        checkEnv();
        let blocks = await storageService.getVehicleBlocks();
        blocks = blocks.filter(b => b.id !== blockId);
        await storageService._saveCollection('vehicleBlocks', blocks);
    },

    saveMarketSource: async (item) => {
        checkEnv();
        const list = await storageService.getMarketSources();
        const idx = list.findIndex(i => i.id === item.id);
        if (idx >= 0) list[idx] = item; else list.push(item);
        await storageService._saveCollection('marketSources', list);
    },
    saveVehicle: async (item) => {
        checkEnv();
        const list = await storageService.getVehicles();
        const idx = list.findIndex(i => i.id === item.id);
        if (idx >= 0) list[idx] = item; else list.push(item);
        await storageService._saveCollection('vehicles', list);
    },
    saveAgent: async (item) => {
        checkEnv();
        const list = await storageService.getAgents();
        const idx = list.findIndex(i => i.id === item.id);
        if (idx >= 0) list[idx] = item; else list.push(item);
        await storageService._saveCollection('agents', list);
    },
    saveRate: async (item) => {
        checkEnv();
        const list = await storageService.getRates();
        const idx = list.findIndex(i => i.id === item.id);
        if (idx >= 0) list[idx] = item; else list.push(item);
        await storageService._saveCollection('rates', list);
    },
    saveTour: async (item) => {
        checkEnv();
        const list = await storageService.getTours();
        const idx = list.findIndex(i => i.id === item.id);
        if (idx >= 0) list[idx] = item; else list.push(item);
        await storageService._saveCollection('tours', list);
    },
    saveSettings: async (item) => {
        checkEnv();
        await storageService._saveCollection('settings', item);
    },

    // Internal Helpers
    _generateRef: (length = 6) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
        return result;
    }
};

export function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
