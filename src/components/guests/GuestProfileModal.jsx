
import React, { useState, useMemo } from 'react';
import { useGuestModal } from '../../context/GuestModalContext';
import { useBookings } from '../../hooks/useBookings';
import { useBookingModal } from '../../context/BookingModalContext';
import { X, User, Phone, Mail, MapPin, Calendar, CheckCircle, AlertCircle, Clock, Trash2, Pencil, Save } from 'lucide-react';
import { format } from 'date-fns';
import { BookingStatus } from '../../domain/models';

export function GuestProfileModal() {
    const { isOpen, guestId, closeGuestProfile } = useGuestModal();
    const { guests, bookings, tours, deleteGuest, updateGuest } = useBookings();
    const { openEdit } = useBookingModal();

    const [showCancelled, setShowCancelled] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});

    // ... logic for handlers later ...

    const guest = useMemo(() => {
        return guests.find(g => g.id === guestId);
    }, [guests, guestId]);

    const guestBookings = useMemo(() => {
        if (!guestId) return [];
        return bookings.filter(b => b.guestId === guestId)
            .sort((a, b) => new Date(b.tourRunId.substring(0, 10)) - new Date(a.tourRunId.substring(0, 10))); // Newest first
    }, [bookings, guestId]);

    const displayedBookings = useMemo(() => {
        if (showCancelled) return guestBookings;
        return guestBookings.filter(b => b.status !== BookingStatus.CANCELLED);
    }, [guestBookings, showCancelled]);

    const handleDeleteClick = () => {
        if (guestBookings.length > 0) {
            alert("This profile has existing bookings and cannot be deleted. (To remove personal details, use Anonymize in the future.)");
            return;
        }
        setShowDeleteConfirm(true);
    };

    const handleConfirmDelete = async () => {
        const result = await deleteGuest(guestId);
        if (result.success) {
            closeGuestProfile();
        } else if (result.error === 'HAS_BOOKINGS') {
            setShowDeleteConfirm(false);
            alert("This profile has existing bookings and cannot be deleted. (To remove personal details, use Anonymize in the future.)");
        } else {
            setShowDeleteConfirm(false);
            alert("Failed to delete guest profile.");
        }
    };

    if (!isOpen) return null;

    if (!guest) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 text-center">
                    <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                    <h2 className="text-xl font-bold mb-2">Guest Not Found</h2>
                    <p className="text-gray-600 mb-6">Could not locate guest details.</p>
                    <button onClick={closeGuestProfile} className="btn btn-secondary w-full">Close</button>
                </div>
            </div>
        );
    }

    const handleBookingClick = (bookingId) => {
        // We can keep the guest modal open in background or close it. 
        // User prompt: "Guest modal can either stay open behind, or close automatically (choose one and implement consistently)."
        // Let's close it for cleaner UI, as stacking modals can be tricky with z-indices if not managed carefully.
        // Actually, keeping it open allows "Back" navigation feeling if we don't close it, but standard web tabs usually replace.
        // Let's TRY keeping it open (z-index of this is 60, BookingModal is usually high too). 
        // If BookingModal lacks z-index, it might appear behind. I'll check BookingModal style. 
        // Safe bet: Close this one, then open the other.
        // closeGuestProfile();
        openEdit(bookingId);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b bg-gray-50 flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[var(--color-forest-green)] text-white flex items-center justify-center text-xl font-bold">
                            {guest.firstName?.[0]}{guest.surname?.[0]}
                        </div>
                        <div className="flex-1">
                            {isEditing ? (
                                <div className="grid grid-cols-3 gap-2">
                                    <select
                                        className="p-1 border rounded"
                                        value={editForm.title}
                                        onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                    >
                                        <option value="">-</option>
                                        <option value="Mr">Mr</option>
                                        <option value="Mrs">Mrs</option>
                                        <option value="Ms">Ms</option>
                                        <option value="Dr">Dr</option>
                                    </select>
                                    <input
                                        className="p-1 border rounded"
                                        placeholder="First Name"
                                        value={editForm.firstName}
                                        onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                                    />
                                    <input
                                        className="p-1 border rounded"
                                        placeholder="Surname"
                                        value={editForm.surname}
                                        onChange={e => setEditForm({ ...editForm, surname: e.target.value })}
                                    />
                                </div>
                            ) : (
                                <h2 className="text-xl font-bold text-gray-900">
                                    {guest.title && <span className="text-gray-500 font-normal mr-1">{guest.title}</span>}
                                    {guest.firstName} {guest.surname}
                                </h2>
                            )}
                            <div className="text-sm font-mono text-gray-500">Ref: {guest.profileRef || '---'}</div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {!isEditing ? (
                            <button
                                onClick={() => {
                                    setEditForm({ ...guest });
                                    setIsEditing(true);
                                }}
                                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-600"
                                title="Edit Profile"
                            >
                                <Pencil size={20} />
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={async () => {
                                        await updateGuest(editForm);
                                        setIsEditing(false);
                                    }}
                                    className="p-2 bg-[var(--color-forest-green)] text-white rounded-full hover:opacity-90 transition-colors"
                                    title="Save Changes"
                                >
                                    <Save size={20} />
                                </button>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-600"
                                    title="Cancel"
                                >
                                    <X size={20} />
                                </button>
                            </>
                        )}
                        <button onClick={closeGuestProfile} className="p-2 hover:bg-gray-200 rounded-full transition-colors ml-2">
                            <X size={24} className="text-gray-500" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* Contact Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="p-4 bg-gray-50 rounded-xl border">
                            <div className="flex items-center gap-2 text-gray-500 mb-2 text-sm font-medium uppercase tracking-wide">
                                <Phone size={16} /> Phone
                            </div>
                            {isEditing ? (
                                <input
                                    className="w-full p-2 border rounded"
                                    value={editForm.phone || ''}
                                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                />
                            ) : (
                                <div className="text-lg font-semibold text-gray-900">{guest.phone}</div>
                            )}
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl border">
                            <div className="flex items-center gap-2 text-gray-500 mb-2 text-sm font-medium uppercase tracking-wide">
                                <Mail size={16} /> Email
                            </div>
                            {isEditing ? (
                                <input
                                    className="w-full p-2 border rounded"
                                    value={editForm.email || ''}
                                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                />
                            ) : (
                                <div className="text-lg font-semibold text-gray-900 break-words">{guest.email || '—'}</div>
                            )}
                        </div>
                        <div className="p-4 bg-gray-50 rounded-xl border">
                            <div className="flex items-center gap-2 text-gray-500 mb-2 text-sm font-medium uppercase tracking-wide">
                                <MapPin size={16} /> Nationality
                            </div>
                            {isEditing ? (
                                <input
                                    className="w-full p-2 border rounded"
                                    value={editForm.nationality || ''}
                                    onChange={e => setEditForm({ ...editForm, nationality: e.target.value })}
                                />
                            ) : (
                                <div className="text-lg font-semibold text-gray-900">{guest.nationality || '—'}</div>
                            )}
                        </div>
                    </div>

                    {/* Booking History */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Calendar className="text-[var(--color-forest-green)]" />
                                Booking History
                                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                                    {guestBookings.length}
                                </span>
                            </h3>
                            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={showCancelled}
                                    onChange={e => setShowCancelled(e.target.checked)}
                                    className="rounded border-gray-300 text-[var(--color-forest-green)] focus:ring-[var(--color-forest-green)]"
                                />
                                Show Cancelled
                            </label>
                        </div>

                        <div className="border rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="p-3 text-sm font-semibold text-gray-600">Ref</th>
                                        <th className="p-3 text-sm font-semibold text-gray-600">Date</th>
                                        <th className="p-3 text-sm font-semibold text-gray-600">Tour</th>
                                        <th className="p-3 text-sm font-semibold text-gray-600">Pax</th>
                                        <th className="p-3 text-sm font-semibold text-gray-600">Status</th>
                                        <th className="p-3 text-sm font-semibold text-gray-600 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {displayedBookings.map(b => (
                                        <tr
                                            key={b.id}
                                            onClick={() => handleBookingClick(b.id)}
                                            className="hover:bg-gray-50 cursor-pointer transition-colors group"
                                        >
                                            <td className="p-3 font-mono text-sm text-gray-500">{b.bookingRef || '---'}</td>
                                            <td className="p-3 font-medium">
                                                {format(new Date(b.tourRunId.substring(0, 10)), 'MMM d, yyyy')}
                                            </td>
                                            <td className="p-3 text-sm text-gray-700">
                                                {tours.find(t => t.id === b.tourOptionId)?.name || 'Unknown'}
                                            </td>
                                            <td className="p-3 text-sm">{b.seats}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${b.status === BookingStatus.Confirmed ? 'bg-green-100 text-green-800' :
                                                    b.status === BookingStatus.Cancelled ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {b.status}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right">
                                                <span className="text-[var(--color-forest-green)] opacity-0 group-hover:opacity-100 text-sm font-medium transition-opacity">
                                                    View
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {displayedBookings.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-gray-500 italic">
                                                No bookings found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t bg-gray-50 flex justify-end">
                    <button
                        onClick={handleDeleteClick}
                        className="btn bg-white border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                        <Trash2 size={18} />
                        Delete Profile
                    </button>
                </div>

                {/* Delete Confirmation Overlay */}
                {showDeleteConfirm && (
                    <div className="absolute inset-0 bg-white/90 z-[70] flex items-center justify-center p-6 animate-in fade-in duration-200">
                        <div className="bg-white shadow-2xl border rounded-xl p-6 max-w-sm w-full text-center">
                            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete guest profile?</h3>
                            <p className="text-sm text-gray-600 mb-6">
                                This will permanently delete the guest profile and cannot be undone.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-2 border rounded-lg hover:bg-gray-50 font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
