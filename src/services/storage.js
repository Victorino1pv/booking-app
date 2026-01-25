
const API_URL = `http://${window.location.hostname}:3001/api`;

/**
 * Async Storage Service (Proxy to Backend)
 */
export const storageService = {

    // FETCH ALL (For initial load / Refresh)
    fetchAll: async () => {
        const response = await fetch(`${API_URL}/data`);
        if (!response.ok) throw new Error('Failed to fetch data');
        return await response.json();
    },

    // Individual Getters (Should generally fetch fresh or rely on Context cache)
    // For migration simplicity, we will assume Context calls fetchAll().
    // These specific getters might be deprecated or used just to get a specific list?
    // Let's implement them as individual fetches for safety, though less efficient than bulk.
    getJeeps: async () => (await fetch(`${API_URL}/data/jeeps`)).json(),
    getVehicles: async () => (await fetch(`${API_URL}/data/vehicles`)).json(),
    getTours: async () => (await fetch(`${API_URL}/data/tours`)).json(),
    getBookings: async () => (await fetch(`${API_URL}/data/bookings`)).json(),
    getGuests: async () => (await fetch(`${API_URL}/data/guests`)).json(),
    getMarketSources: async () => (await fetch(`${API_URL}/data/marketSources`)).json(),
    getAgents: async () => (await fetch(`${API_URL}/data/agents`)).json(),
    getRates: async () => (await fetch(`${API_URL}/data/rates`)).json(),
    getSettings: async () => (await fetch(`${API_URL}/data/settings`)).json(),
    getVehicleBlocks: async () => (await fetch(`${API_URL}/data/vehicleBlocks`)).json(),

    // SAVERS (Async)
    // Common pattern: Fetch list -> Update -> Post list back (Simplest transition from localStorage)
    // OPTIMIZATION: Ideally backend handles "Add one", but our backend is "Post Key".
    // So we must: Get Current List -> Append -> Send Full List.
    // This has race conditions but acceptable for single-user dev usage.

    _saveCollection: async (key, data) => {
        await fetch(`${API_URL}/data/${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    },

    saveBooking: async (booking) => {
        const bookings = await storageService.getBookings();
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
        let bookings = await storageService.getBookings();
        bookings = bookings.filter(b => b.id !== id);
        await storageService._saveCollection('bookings', bookings);
    },

    saveGuest: async (guest) => {
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
        // Needs to check bookings first?
        const bookings = await storageService.getBookings();
        if (bookings.some(b => b.guestId === guestId)) return { success: false, error: 'HAS_BOOKINGS' };

        let guests = await storageService.getGuests();
        guests = guests.filter(g => g.id !== guestId);
        await storageService._saveCollection('guests', guests);
        return { success: true };
    },

    saveVehicleBlock: async (block) => {
        const blocks = await storageService.getVehicleBlocks();
        const idx = blocks.findIndex(b => b.vehicleId === block.vehicleId && b.date === block.date);

        const finalBlock = { ...block, id: block.id || generateUUID(), createdAt: new Date().toISOString() };
        if (idx >= 0) blocks[idx] = finalBlock;
        else blocks.push(finalBlock);

        await storageService._saveCollection('vehicleBlocks', blocks);
    },

    deleteVehicleBlock: async (blockId) => {
        let blocks = await storageService.getVehicleBlocks();
        blocks = blocks.filter(b => b.id !== blockId);
        await storageService._saveCollection('vehicleBlocks', blocks);
    },

    saveMarketSource: async (item) => {
        const list = await storageService.getMarketSources();
        const idx = list.findIndex(i => i.id === item.id);
        if (idx >= 0) list[idx] = item; else list.push(item);
        await storageService._saveCollection('marketSources', list);
    },
    saveVehicle: async (item) => {
        const list = await storageService.getVehicles();
        const idx = list.findIndex(i => i.id === item.id);
        if (idx >= 0) list[idx] = item; else list.push(item);
        await storageService._saveCollection('vehicles', list);
    },
    saveAgent: async (item) => {
        const list = await storageService.getAgents();
        const idx = list.findIndex(i => i.id === item.id);
        if (idx >= 0) list[idx] = item; else list.push(item);
        await storageService._saveCollection('agents', list);
    },
    saveRate: async (item) => {
        const list = await storageService.getRates();
        const idx = list.findIndex(i => i.id === item.id);
        if (idx >= 0) list[idx] = item; else list.push(item);
        await storageService._saveCollection('rates', list);
    },
    saveTour: async (item) => {
        const list = await storageService.getTours();
        const idx = list.findIndex(i => i.id === item.id);
        if (idx >= 0) list[idx] = item; else list.push(item);
        await storageService._saveCollection('tours', list);
    },
    saveSettings: async (item) => {
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
