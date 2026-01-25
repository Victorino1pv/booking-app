import React, { useState } from 'react';
import { useBookings } from '../hooks/useBookings';
import { generateUUID } from '../services/storage';
import { Plus, Check, X, Edit2 } from 'lucide-react';

export function SettingsPage() {
    const {
        jeeps, vehicles, tours, marketSources, agents, rates, settings,
        addMarketSource, saveVehicle, saveTour, saveRate, saveAgent, saveSettings,
        vehiclesSource, bookingsSource, toursSource, marketSourcesSource, lastError
    } = useBookings();

    // Determine Reference Source State (unified)
    const referenceSource = toursSource; // They are all synced now

    // Ensure lists are defined to avoid crashes during load
    const safeTours = tours || [];
    const safeRates = rates || [];
    const safeAgents = agents || [];
    const safeVehicles = vehicles || [];
    const safeMarketSources = marketSources || [];
    const safeSettingsData = settings || { currency: 'EUR' };

    const [activeTab, setActiveTab] = useState('tours');
    const [isAddingMode, setIsAddingMode] = useState(false);

    // Generic edit state
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});

    // Reset editing when tab changes
    const switchTab = (tab) => {
        setActiveTab(tab);
        setIsAddingMode(false);
        setEditingId(null);
        setEditForm({});
    };

    // Helper to start editing
    const startEdit = (item) => {
        setEditingId(item.id);
        setEditForm({ ...item });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({});
        setIsAddingMode(false);
    };

    return (
        <div className="p-8 h-full overflow-y-auto bg-gray-50">
            <div className="flex justify-between items-center mb-6">
                <div className="flex gap-4 items-center">
                    <h1 className="text-2xl font-bold font-heading text-[var(--color-forest-green)]">Settings</h1>
                    {bookingsSource === 'supabase' && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-200">Bookings: Cloud</span>}
                    {bookingsSource === 'local' && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold border border-gray-200">Bookings: Local</span>}
                    {bookingsSource === 'supabase-error' && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold border border-red-200">Bookings: Cloud (Error)</span>}
                    {referenceSource === 'supabase' && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold border border-indigo-200">Ref Data: Cloud</span>}
                    {referenceSource === 'local' && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold border border-gray-200">Ref Data: Local</span>}
                    {referenceSource === 'supabase-error' && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold border border-red-200">Ref Data: Cloud (Error)</span>}
                </div>
                <TestConnectionButton />
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b overflow-x-auto">
                <TabButton id="tours" label="Tours" active={activeTab} onClick={switchTab} />
                <TabButton id="rates" label="Rates" active={activeTab} onClick={switchTab} />
                <TabButton id="vehicles" label="Vehicles" active={activeTab} onClick={switchTab} />
                <TabButton id="agents" label="Agents" active={activeTab} onClick={switchTab} />
                <TabButton id="market" label="Market Sources" active={activeTab} onClick={switchTab} />
                <TabButton id="diagnostics" label="Diagnostics" active={activeTab} onClick={switchTab} />
            </div>

            <div className="max-w-4xl space-y-8 animate-in fade-in duration-300">

                {/* --- TOURS TAB --- */}
                {activeTab === 'tours' && (
                    <section className="bg-white p-6 rounded-xl shadow-sm border">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-bold">Tour Definitions</h2>
                            </div>
                            <button onClick={() => { setIsAddingMode(true); setEditForm({ name: '', color: '#000000', isActive: true }); }} className="btn-add">
                                <Plus size={16} /> Add Tour
                            </button>
                        </div>

                        {/* Add/Edit Form */}
                        {(isAddingMode || editingId) && (
                            <div className="mb-4 p-4 bg-gray-50 rounded border">
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    saveTour({ ...editForm, id: editForm.id || generateUUID() });
                                    cancelEdit();
                                }} className="flex gap-4 items-end">
                                    <div className="flex-1">
                                        <label className="label">Tour Name</label>
                                        <input className="input" autoFocus value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                                    </div>
                                    <div className="w-24">
                                        <label className="label">Color</label>
                                        <input type="color" className="w-full h-10 p-1 border rounded cursor-pointer" value={editForm.color} onChange={e => setEditForm({ ...editForm, color: e.target.value })} />
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="submit" className="btn-save"><Check size={16} /></button>
                                        <button type="button" onClick={cancelEdit} className="btn-cancel"><X size={16} /></button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="space-y-2">
                            {safeTours.map(t => (
                                <div key={t.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: t.color }}></div>
                                        <span className={`font-medium ${!t.isActive && 'text-gray-400 line-through'}`}>{t.name}</span>
                                        {!t.isActive && <span className="badge">Inactive</span>}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => saveTour({ ...t, isActive: !t.isActive })} className="text-xs text-blue-600 hover:underline">
                                            {t.isActive ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button onClick={() => startEdit(t)} className="text-gray-400 hover:text-gray-600"><Edit2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* --- RATES TAB --- */}
                {activeTab === 'rates' && (
                    <section className="bg-white p-6 rounded-xl shadow-sm border">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">Pricing Rates</h2>
                            <div className="text-sm text-gray-500">Currency: {safeSettingsData.currency}</div>
                            <button onClick={() => { setIsAddingMode(true); setEditForm({ tourId: safeTours[0]?.id, sharedPrice: 0, privatePrice: 0, isActive: true }); }} className="btn-add">
                                <Plus size={16} /> Add Rate
                            </button>
                        </div>

                        {(isAddingMode || editingId) && (
                            <div className="mb-4 p-4 bg-gray-50 rounded border">
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    saveRate({ ...editForm, id: editForm.id || generateUUID() });
                                    cancelEdit();
                                }} className="flex gap-4 items-end flex-wrap">
                                    <div className="min-w-[200px]">
                                        <label className="label">Tour</label>
                                        <select className="input" value={editForm.tourId} onChange={e => setEditForm({ ...editForm, tourId: e.target.value })}>
                                            {safeTours.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="w-32">
                                        <label className="label">Shared Price</label>
                                        <input type="number" className="input" value={editForm.sharedPrice} onChange={e => setEditForm({ ...editForm, sharedPrice: Number(e.target.value) })} />
                                    </div>
                                    <div className="w-32">
                                        <label className="label">Private Price</label>
                                        <input type="number" className="input" value={editForm.privatePrice} onChange={e => setEditForm({ ...editForm, privatePrice: Number(e.target.value) })} />
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="submit" className="btn-save"><Check size={16} /></button>
                                        <button type="button" onClick={cancelEdit} className="btn-cancel"><X size={16} /></button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="space-y-2">
                            {safeRates.map(r => {
                                const tour = safeTours.find(t => t.id === r.tourId);
                                return (
                                    <div key={r.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                                        <div>
                                            <div className="font-bold flex items-center gap-2">
                                                {tour?.name || 'Unknown Tour'}
                                                <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 rounded-full hidden">Default</span>
                                            </div>
                                            <div className="text-sm text-gray-600 flex gap-4 mt-1">
                                                <span>Shared: <b>{r.sharedPrice}</b></span>
                                                <span>Private: <b>{r.privatePrice}</b></span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => startEdit(r)} className="text-gray-400 hover:text-gray-600"><Edit2 size={16} /></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* --- AGENTS TAB --- */}
                {activeTab === 'agents' && (
                    <section className="bg-white p-6 rounded-xl shadow-sm border">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">Agents & Commissions</h2>
                            <button onClick={() => { setIsAddingMode(true); setEditForm({ name: '', hasCommission: false, commissionValue: 10, isActive: true }); }} className="btn-add">
                                <Plus size={16} /> Add Agent
                            </button>
                        </div>

                        {(isAddingMode || editingId) && (
                            <div className="mb-4 p-4 bg-gray-50 rounded border">
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    saveAgent({ ...editForm, id: editForm.id || generateUUID() });
                                    cancelEdit();
                                }} className="grid grid-cols-12 gap-4 items-end">
                                    <div className="col-span-4">
                                        <label className="label">Name</label>
                                        <input className="input" autoFocus value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                                    </div>
                                    <div className="col-span-3 flex items-center h-10">
                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                            <input type="checkbox" checked={editForm.hasCommission} onChange={e => setEditForm({ ...editForm, hasCommission: e.target.checked })} />
                                            <span className="text-sm font-medium">Earns Commission?</span>
                                        </label>
                                    </div>
                                    {editForm.hasCommission && (
                                        <div className="col-span-3">
                                            <label className="label">Commission %</label>
                                            <input type="number" className="input" value={editForm.commissionValue} onChange={e => setEditForm({ ...editForm, commissionValue: Number(e.target.value) })} />
                                        </div>
                                    )}
                                    <div className="col-span-2 flex gap-2">
                                        <button type="submit" className="btn-save"><Check size={16} /></button>
                                        <button type="button" onClick={cancelEdit} className="btn-cancel"><X size={16} /></button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="space-y-2">
                            {safeAgents.map(a => (
                                <div key={a.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500">
                                            {a.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className={`font-bold ${!a.isActive && 'text-gray-400'}`}>{a.name}</p>
                                            {a.hasCommission ? (
                                                <p className="text-xs text-green-600 font-medium">{a.commissionValue}% Commission</p>
                                            ) : (
                                                <p className="text-xs text-gray-400">No Commission</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => saveAgent({ ...a, isActive: !a.isActive })} className="text-xs text-blue-600 hover:underline">
                                            {a.isActive ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button onClick={() => startEdit(a)} className="text-gray-400 hover:text-gray-600"><Edit2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* --- VEHICLES TAB --- */}
                {activeTab === 'vehicles' && (
                    <section className="bg-white p-6 rounded-xl shadow-sm border">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-bold">Vehicles</h2>
                                {vehiclesSource === 'supabase' && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-200">Cloud (Supabase)</span>}
                                {vehiclesSource === 'local' && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold border border-gray-200">Local (Fallback)</span>}
                            </div>
                            <button onClick={() => { setIsAddingMode(true); setEditForm({ name: '', driverName: '', seatCapacity: 6, isActive: true }); }} className="btn-add"><Plus size={16} /> Add Vehicle</button>
                        </div>

                        {(isAddingMode || editingId) && (
                            <div className="mb-4 p-4 bg-gray-50 rounded border">
                                <VehicleForm initialData={editForm} onSave={(v) => { saveVehicle({ ...editForm, ...v, id: editForm.id || generateUUID() }); cancelEdit(); }} onCancel={cancelEdit} />
                            </div>
                        )}

                        <div className="space-y-4">
                            {safeVehicles.map(vehicle => (
                                <VehicleItem
                                    key={vehicle.id}
                                    vehicle={vehicle}
                                    onSave={saveVehicle}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* --- MARKET TAB --- */}
                {activeTab === 'market' && (
                    <section className="bg-white p-6 rounded-xl shadow-sm border">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                                <h2 className="text-lg font-bold">Market Sources</h2>
                            </div>
                            <button onClick={() => { setIsAddingMode(true); setEditForm({ name: '', category: 'OTA', isActive: true }); }} className="btn-add"><Plus size={16} /> Add Source</button>
                        </div>

                        {(isAddingMode || editingId) && (
                            <div className="mb-4 p-4 bg-gray-50 rounded border">
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    addMarketSource({ ...editForm, id: editForm.id || generateUUID() });
                                    cancelEdit();
                                }} className="flex gap-4 items-end">
                                    <div className="flex-1">
                                        <label className="label">Name</label>
                                        <input className="input" autoFocus value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                                    </div>
                                    <div className="w-1/3">
                                        <label className="label">Category</label>
                                        <select className="input" value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}>
                                            <option value="OTA">OTA</option>
                                            <option value="Hotel">Hotel</option>
                                            <option value="Direct">Direct</option>
                                            <option value="Agency">Agency</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <button type="submit" className="btn-save"><Check size={16} /></button>
                                        <button type="button" onClick={cancelEdit} className="btn-cancel"><X size={16} /></button>
                                    </div>
                                </form>
                            </div>
                        )}

                        <div className="space-y-2">
                            {safeMarketSources.map(source => (
                                <div key={source.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded border-b last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${source.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                                        <span className="font-medium text-gray-700">{source.name}</span>
                                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{source.category}</span>
                                    </div>
                                    <button onClick={() => startEdit(source)} className="text-sm text-gray-400 hover:text-gray-600">Edit</button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* --- DIAGNOSTICS TAB --- */}
                {activeTab === 'diagnostics' && (
                    <section className="bg-white p-6 rounded-xl shadow-sm border space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold">System Diagnostics</h2>
                            <button
                                onClick={async () => {
                                    if (confirm("Reset ALL Local Data (This Device)? This will not affect Cloud data.")) {
                                        localStorage.clear();
                                        window.location.reload();
                                    }
                                }}
                                className="text-xs bg-red-100 text-red-700 font-bold px-3 py-1.5 rounded hover:bg-red-200 border border-red-200"
                            >
                                Reset Local Data
                            </button>
                        </div>

                        {lastError && (
                            <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded">
                                <h3 className="font-bold mb-1">Data Load Error</h3>
                                <p className="text-sm">{lastError}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded border">
                                <h3 className="font-bold text-gray-700 mb-2">Data Counts</h3>
                                <ul className="space-y-1 text-sm">
                                    <li className="flex justify-between"><span>Bookings:</span> <b>{(jeeps || []).length > 0 ? 'N/A' : (useBookings().bookings || []).length}</b></li>
                                    <li className="flex justify-between"><span>Vehicles:</span> <b>{(vehicles || []).length}</b></li>
                                    <li className="flex justify-between"><span>Tours:</span> <b>{(tours || []).length}</b></li>
                                    <li className="flex justify-between"><span>Agents:</span> <b>{(agents || []).length}</b></li>
                                    <li className="flex justify-between"><span>Rates:</span> <b>{(rates || []).length}</b></li>
                                    <li className="flex justify-between"><span>Market Sources:</span> <b>{(marketSources || []).length}</b></li>
                                </ul>
                            </div>

                            <div className="p-4 bg-gray-50 rounded border">
                                <h3 className="font-bold text-gray-700 mb-2">Sources</h3>
                                <ul className="space-y-1 text-sm">
                                    <li className="flex justify-between">
                                        <span>Vehicles Source:</span>
                                        <b className={vehiclesSource === 'supabase' ? 'text-blue-600' : 'text-gray-600'}>
                                            {vehiclesSource || 'undefined'}
                                        </b>
                                    </li>
                                    <li className="flex justify-between">
                                        <span>Bookings Source:</span>
                                        <b className={
                                            bookingsSource === 'supabase' ? 'text-blue-600' :
                                                bookingsSource === 'supabase-error' ? 'text-red-600' :
                                                    'text-gray-600'
                                        }>
                                            {bookingsSource === 'supabase-error' ? 'Cloud (Error)' : (bookingsSource || 'undefined')}
                                        </b>
                                    </li>
                                    <li className="flex justify-between">
                                        <span>Reference Data:</span>
                                        <b className={
                                            referenceSource === 'supabase' ? 'text-indigo-600' :
                                                referenceSource === 'supabase-error' ? 'text-red-600' :
                                                    'text-gray-600'
                                        }>
                                            {referenceSource === 'supabase-error' ? 'Cloud (Error)' : (referenceSource || 'undefined')}
                                        </b>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded border">
                            <h3 className="font-bold text-gray-700 mb-2">Vite Env Debug (Real)</h3>
                            <div className="text-xs bg-gray-100 p-2 rounded overflow-auto font-mono space-y-1">
                                <div><strong>VITE_SUPABASE_URL:</strong> {import.meta.env.VITE_SUPABASE_URL ? (import.meta.env.VITE_SUPABASE_URL.substring(0, 30) + (import.meta.env.VITE_SUPABASE_URL.length > 30 ? '...' : '')) : 'MISSING'}</div>
                                <div><strong>VITE_SUPABASE_ANON_KEY:</strong> {import.meta.env.VITE_SUPABASE_ANON_KEY ? (import.meta.env.VITE_SUPABASE_ANON_KEY.substring(0, 12) + '...') : 'MISSING'}</div>
                                <div><strong>VITE_USE_SUPABASE_BOOKINGS:</strong> {import.meta.env.VITE_USE_SUPABASE_BOOKINGS}</div>
                                <div><strong>VITE_USE_SUPABASE_VEHICLES:</strong> {import.meta.env.VITE_USE_SUPABASE_VEHICLES}</div>
                                <div><strong>VITE_USE_SUPABASE_REFERENCE_DATA:</strong> {import.meta.env.VITE_USE_SUPABASE_REFERENCE_DATA}</div>
                                <div><strong>MODE:</strong> {import.meta.env.MODE}</div>
                                <div className="border-t my-2 pt-2">
                                    <strong>Supabase Client Status:</strong> {supabase ? <span className="text-green-600 font-bold">Initialized</span> : <span className="text-red-500 font-bold">Failed/Null</span>}
                                </div>
                            </div>
                        </div>
                    </section>
                )}
            </div>

            <style>{`
                .label { @apply block text-xs font-bold text-gray-500 mb-1; }
                .input { @apply w-full p-2 text-sm border rounded; }
                .btn-add { @apply text-sm font-semibold text-[var(--color-forest-green)] flex items-center gap-1 hover:underline; }
                .btn-save { @apply p-2 bg-[var(--color-forest-green)] text-white rounded hover:bg-[#244a39]; }
                .btn-cancel { @apply p-2 bg-white border text-gray-500 rounded hover:bg-gray-100; }
                .badge { @apply text-[10px] bg-gray-200 text-gray-600 px-1.5 rounded uppercase font-bold; }
            `}</style>
        </div>
    );
}

function TabButton({ id, label, active, onClick }) {
    return (
        <button
            onClick={() => onClick(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${active === id
                ? 'border-[var(--color-forest-green)] text-[var(--color-forest-green)]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
        >
            {label}
        </button>
    );
}

function VehicleForm({ initialData, onSave, onCancel }) {
    const [formData, setFormData] = useState(initialData || { name: '', driverName: '', seatCapacity: 6, notes: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name) return;
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-gray-500 mb-1">Vehicle Name</label>
                <input
                    autoFocus
                    className="w-full p-2 text-sm border rounded"
                    placeholder="e.g. Defender 110 Red"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
            </div>
            <div className="w-[150px]">
                <label className="block text-xs font-bold text-gray-500 mb-1">Driver</label>
                <input
                    className="w-full p-2 text-sm border rounded"
                    placeholder="Driver Name"
                    value={formData.driverName}
                    onChange={e => setFormData({ ...formData, driverName: e.target.value })}
                />
            </div>
            <div className="w-[80px]">
                <label className="block text-xs font-bold text-gray-500 mb-1">Seats</label>
                <input
                    type="number"
                    min="1"
                    className="w-full p-2 text-sm border rounded"
                    value={formData.seatCapacity}
                    onChange={e => setFormData({ ...formData, seatCapacity: Number(e.target.value) })}
                />
            </div>
            <div className="flex gap-2">
                <button type="submit" className="p-2 bg-[var(--color-forest-green)] text-white rounded hover:bg-[#244a39]">
                    <Check size={16} />
                </button>
                <button type="button" onClick={onCancel} className="p-2 bg-white border text-gray-500 rounded hover:bg-gray-100">
                    <X size={16} />
                </button>
            </div>
        </form>
    );
}

function VehicleItem({ vehicle, onSave }) {
    const [isEditing, setIsEditing] = useState(false);

    if (isEditing) {
        return (
            <div className="p-4 bg-gray-50 rounded border animate-in fade-in zoom-in-95 duration-200">
                <VehicleForm
                    initialData={vehicle}
                    onSave={(updated) => { onSave({ ...vehicle, ...updated }); setIsEditing(false); }}
                    onCancel={() => setIsEditing(false)}
                />
            </div>
        );
    }

    return (
        <div className={`flex justify-between items-center p-3 border rounded ${vehicle.isActive ? 'bg-white' : 'bg-gray-100 opacity-75'}`}>
            <div className="flex gap-4 items-center">
                <div className={`w-10 h-10 rounded flex items-center justify-center font-bold text-white ${vehicle.isActive ? 'bg-[var(--color-forest-green)]' : 'bg-gray-400'}`}>
                    {vehicle.name.charAt(0)}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-800">{vehicle.name}</p>
                        {!vehicle.isActive && <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 rounded uppercase font-bold">Inactive</span>}
                    </div>
                    <p className="text-xs text-gray-500 flex gap-2">
                        <span>{vehicle.driverName || 'No Driver'}</span>
                        <span>•</span>
                        <span>{vehicle.seatCapacity} Seats</span>
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => onSave({ ...vehicle, isActive: !vehicle.isActive })}
                    className="text-xs font-medium text-gray-500 hover:text-gray-800 underline"
                >
                    {vehicle.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => setIsEditing(true)} className="text-sm text-gray-400 hover:text-gray-600 border p-1.5 rounded hover:bg-gray-50">
                    Edit
                </button>
            </div>
        </div>
    );
}

import { supabase } from '../libs/supabase';

function TestConnectionButton() {
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [msg, setMsg] = useState('');

    const testConnection = async () => {
        setStatus('loading');
        setMsg('');
        try {
            if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
                throw new Error('Missing Supabase Env Vars');
            }

            // Direct frontend query
            const { data, error } = await supabase.from('vehicles').select('*').limit(1);

            if (error) throw error;

            setStatus('success');
            setMsg('Supabase OK');
            setTimeout(() => setStatus('idle'), 3000);

        } catch (err) {
            setStatus('error');
            // Show a friendly error if it's a connection issue or missing config
            const userMsg = err.message === 'Failed to fetch'
                ? 'Network Error'
                : err.message.length > 20 ? 'Check Console' : err.message;
            setMsg(userMsg);
            console.error('Supabase Test Error:', err);
        }
    };

    return (
        <div className="flex items-center gap-2">
            {status === 'loading' && <span className="text-xs text-blue-600 font-bold animate-pulse">Testing...</span>}
            {status === 'success' && <span className="text-xs text-green-600 font-bold flex items-center gap-1"><Check size={12} /> {msg}</span>}
            {status === 'error' && <span className="text-xs text-red-600 font-bold flex items-center gap-1"><X size={12} /> {msg}</span>}

            <button
                onClick={testConnection}
                disabled={status === 'loading'}
                className="px-3 py-1.5 text-xs font-bold text-gray-600 border rounded hover:bg-gray-50 disabled:opacity-50"
            >
                Test DB Connection
            </button>
        </div>
    );
}
