import React, { useMemo } from 'react';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import { checkAvailability, calculateBookingTotal } from '../../domain/rules';

export function ReportResults({
    type,
    filteredBookings,
    tours,
    agents,
    marketSources,
    dateRange,
    settings
}) {
    // 1. Process Data based on Report Type
    const processedData = useMemo(() => {
        if (type === 'bookings') {
            // Detailed List
            return filteredBookings.map(b => ({
                id: b.id,
                ref: b.bookingRef,
                date: b.tourRunId?.substring(0, 10),
                guest: b.leadGuestName,
                tour: tours.find(t => t.id === b.tourOptionId)?.name || 'Unknown',
                vehicle: b.vehicleId || 'Unassigned',
                pax: b.seats,
                status: b.status,
                payment: b.paymentStatus,
                price: calculateBookingTotal(b, settings?.rates || []),
                agent: agents.find(a => a.id === b.agentId)?.name || 'Direct / No Agent',
                source: marketSources.find(s => s.id === b.marketSourceId)?.name || 'Unknown'
            }));
        }

        if (type === 'agents') {
            // Group by Agent with Commission Logic
            const groups = {};
            filteredBookings.forEach(b => {
                const agentId = b.agentId || 'DIRECT';
                const bookingTotal = calculateBookingTotal(b, settings?.rates || []);
                const agent = agents.find(a => a.id === agentId);

                // Calculate Commission
                let commission = 0;
                // Strict check: Must find agent AND agent must have commission enabled
                if (agent && agent.hasCommission) {
                    // Default to PERCENTAGE if type is missing (Settings Page implies % by default label)
                    const type = (agent.commissionType || 'PERCENTAGE').toUpperCase();
                    const value = Number(agent.commissionValue) || 0;

                    if (type === 'PERCENTAGE' || type === 'PERCENT' || type === 'PERCENT') {
                        commission = bookingTotal * (value / 100);
                    } else if (type === 'FIXED') {
                        commission = value;
                    }

                    // Debug Aid (Temporary)
                    if (commission === 0 && value > 0) {
                        console.warn(`[ReportDebug] Commission 0 for Agent ${agent.name} (${agent.id}). Type: ${type}, Value: ${value}, Total: ${bookingTotal}`);
                    }
                } else if (agentId !== 'DIRECT' && !agent) {
                    console.warn(`[ReportDebug] Agent not found for ID: ${agentId}`);
                }

                if (!groups[agentId]) {
                    groups[agentId] = {
                        id: agentId,
                        name: agentId === 'DIRECT' ? 'Direct / No Agent' : (agent?.name || 'Unknown'),
                        count: 0,
                        gross: 0,
                        commission: 0,
                        net: 0
                    };
                }
                groups[agentId].count++;
                groups[agentId].gross += bookingTotal;
                groups[agentId].commission += commission;
                groups[agentId].net += (bookingTotal - commission);
            });
            return Object.values(groups).sort((a, b) => b.gross - a.gross);
        }

        if (type === 'sources') {
            // Group by Market Source
            const groups = {};
            filteredBookings.forEach(b => {
                const sourceId = b.marketSourceId || 'UNKNOWN';
                if (!groups[sourceId]) {
                    groups[sourceId] = {
                        id: sourceId,
                        name: marketSources.find(s => s.id === sourceId)?.name || 'Unknown',
                        count: 0,
                        revenue: 0
                    };
                }
                groups[sourceId].count++;
                groups[sourceId].revenue += calculateBookingTotal(b, settings?.rates || []);
            });
            return Object.values(groups).sort((a, b) => b.revenue - a.revenue);
        }

        return [];
    }, [type, filteredBookings, tours, agents, marketSources, settings]);

    // 2. Totals Calculation
    const totals = useMemo(() => {
        if (type === 'bookings') {
            return {
                count: processedData.length,
                revenue: processedData.reduce((sum, item) => sum + item.price, 0)
            };
        }
        if (type === 'agents') {
            return {
                count: processedData.reduce((sum, item) => sum + item.count, 0),
                gross: processedData.reduce((sum, item) => sum + item.gross, 0),
                commission: processedData.reduce((sum, item) => sum + item.commission, 0),
                net: processedData.reduce((sum, item) => sum + item.net, 0)
            };
        }
        return {
            count: processedData.reduce((sum, item) => sum + item.count, 0),
            revenue: processedData.reduce((sum, item) => sum + item.revenue, 0)
        };
    }, [processedData, type]);

    // 3. Export Generators


    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden report-print-area">
            {/* Toolbar */}
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 print:hidden">
                <div className="text-sm text-gray-600">
                    Showing <strong>{processedData.length}</strong> rows
                </div>
                <div className="flex gap-2">

                    <button onClick={handlePrint} className="btn btn-secondary flex items-center gap-2 text-sm py-1.5">
                        <Printer size={16} /> Print PDF
                    </button>
                </div>
            </div>

            {/* Print Header (Only visible in Print) */}
            <div className="hidden print:block p-8 border-b text-center">
                <h1 className="text-2xl font-bold mb-2 uppercase tracking-wide">
                    {type === 'bookings' ? 'Bookings Report' : type === 'agents' ? 'Agent Commission Report' : 'Market Source Report'}
                </h1>
                <p className="text-gray-600">
                    {dateRange.startDate} to {dateRange.endDate}
                </p>
                <div className="mt-4 text-xs text-gray-400">
                    Generated: {new Date().toLocaleString()}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b print:bg-gray-100">
                        <tr>
                            {type === 'bookings' && (
                                <>
                                    <th className="p-3">Ref</th>
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Guest</th>
                                    <th className="p-3">Tour</th>
                                    <th className="p-3 text-center">Pax</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Payment</th>
                                    <th className="p-3 text-right">Price</th>
                                    <th className="p-3">Agent</th>
                                </>
                            )}
                            {type === 'agents' && (
                                <>
                                    <th className="p-3 w-1/4">Name</th>
                                    <th className="p-3 text-center">Bookings</th>
                                    <th className="p-3 text-right">Gross</th>
                                    <th className="p-3 text-right">Commission</th>
                                    <th className="p-3 text-right">Net Revenue</th>
                                </>
                            )}
                            {type === 'sources' && (
                                <>
                                    <th className="p-3 w-1/2">Name</th>
                                    <th className="p-3 text-center">Bookings</th>
                                    <th className="p-3 text-right">Revenue</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {processedData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 print:hover:bg-transparent break-inside-avoid">
                                {type === 'bookings' ? (
                                    <>
                                        <td className="p-3 font-mono text-gray-500 text-xs">{row.ref}</td>
                                        <td className="p-3 text-xs whitespace-nowrap">{row.date}</td>
                                        <td className="p-3 font-medium truncate max-w-[150px]">{row.guest}</td>
                                        <td className="p-3 truncate max-w-[150px]">{row.tour}</td>
                                        <td className="p-3 text-center">{row.pax}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${row.status === 'Confirmed' ? 'bg-green-50 text-green-700 border-green-200' :
                                                row.status === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                                                    'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                }`}>
                                                {row.status}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${row.payment === 'PAID' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                row.payment === 'PARTIAL' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                    'bg-gray-50 text-gray-600 border-gray-200'
                                                }`}>
                                                {row.payment || '-'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right font-mono">
                                            {settings?.currency} {row.price.toFixed(2)}
                                        </td>
                                        <td className="p-3 text-xs truncate max-w-[120px]">{row.agent}</td>
                                    </>
                                ) : type === 'agents' ? (
                                    <>
                                        <td className="p-3 font-medium">{row.name}</td>
                                        <td className="p-3 text-center">{row.count}</td>
                                        <td className="p-3 text-right font-mono text-gray-600">{settings?.currency} {row.gross.toFixed(2)}</td>
                                        <td className="p-3 text-right font-mono text-red-600">- {settings?.currency} {row.commission.toFixed(2)}</td>
                                        <td className="p-3 text-right font-mono font-bold text-[var(--color-forest-green)]">
                                            {settings?.currency} {row.net.toFixed(2)}
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="p-3 font-medium">{row.name}</td>
                                        <td className="p-3 text-center">{row.count}</td>
                                        <td className="p-3 text-right font-mono text-base font-bold text-[var(--color-forest-green)]">
                                            {settings?.currency} {row.revenue.toFixed(2)}
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-100 font-bold border-t print:bg-gray-200">
                        <tr>
                            {type === 'bookings' ? (
                                <>
                                    <td colSpan={6} className="p-3 text-right uppercase text-xs tracking-wider">Total</td>
                                    <td></td>
                                    <td className="p-3 text-right">{settings?.currency} {totals.revenue.toFixed(2)}</td>
                                    <td></td>
                                </>
                            ) : type === 'agents' ? (
                                <>
                                    <td className="p-3 text-right uppercase text-xs tracking-wider">Total</td>
                                    <td className="p-3 text-center">{totals.count}</td>
                                    <td className="p-3 text-right">{settings?.currency} {totals.gross.toFixed(2)}</td>
                                    <td className="p-3 text-right text-red-600">- {settings?.currency} {totals.commission.toFixed(2)}</td>
                                    <td className="p-3 text-right text-[var(--color-forest-green)]">{settings?.currency} {totals.net.toFixed(2)}</td>
                                </>
                            ) : (
                                <>
                                    <td className="p-3 text-right uppercase text-xs tracking-wider">Total</td>
                                    <td className="p-3 text-center">{totals.count}</td>
                                    <td className="p-3 text-right">{settings?.currency} {totals.revenue.toFixed(2)}</td>
                                </>
                            )}
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
