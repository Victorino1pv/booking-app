import { supabase } from '../libs/supabase';

export const runSupabaseDiagnostics = async () => {
    if (!supabase) {
        return {
            error: "Supabase client not initialized (Env vars missing or VITE_USE_SUPABASE false?)"
        };
    }

    const tables = [
        'vehicles',
        'tours',
        'rates',
        'agents',
        'market_sources',
        'vehicle_blocks',
        'guests',
        'bookings',
        'settings' // Added for completeness as it's a critical table
    ];

    const results = await Promise.all(tables.map(async (table) => {
        try {
            const start = performance.now();
            const { data, error, status, statusText } = await supabase
                .from(table)
                .select('id')
                .limit(1);

            const duration = (performance.now() - start).toFixed(0);

            if (error) {
                return {
                    table,
                    ok: false,
                    status: status || 500,
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    code: error.code,
                    duration
                };
            }

            return {
                table,
                ok: true,
                status: status || 200,
                message: "OK",
                count: data?.length,
                duration
            };

        } catch (err) {
            return {
                table,
                ok: false,
                status: 0,
                message: err.message || "Network/Client Error",
                details: null,
                duration: 0
            };
        }
    }));

    return results;
};
