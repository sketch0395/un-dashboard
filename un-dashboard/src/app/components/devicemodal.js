import React from "react";

export default function DeviceModal({ modalDevice, setModalDevice, onSave }) {
    const closeModal = () => {
        setModalDevice(null);
    };

    const handleSave = () => {
        // Call the onSave function with the updated device
        onSave(modalDevice);
        closeModal();
    };

    return (
        modalDevice && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-gray-800 text-white p-6 rounded-lg shadow-lg w-96">
                    <h4 className="text-lg font-bold mb-4">Edit Device Details</h4>

                    {/* Display immutable device details */}
                    <div className="mb-4">
                        <p className="text-sm">
                            <strong>IP Address:</strong> {modalDevice.ip || "N/A"}
                        </p>
                        <p className="text-sm">
                            <strong>Vendor:</strong> {modalDevice.vendor || "Unknown"}
                        </p>
                        <p className="text-sm">
                            <strong>MAC Address:</strong> {modalDevice.mac || "N/A"}
                        </p>
                    </div>

                    {/* Editable fields */}
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Name:</label>
                        <input
                            type="text"
                            value={modalDevice.name || ""}
                            onChange={(e) =>
                                setModalDevice((prev) => ({ ...prev, name: e.target.value }))
                            }
                            className="bg-gray-700 text-white px-3 py-2 rounded w-full"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Color:</label>
                        <input
                            type="color"
                            value={modalDevice.color || "#ffffff"}
                            onChange={(e) =>
                                setModalDevice((prev) => ({ ...prev, color: e.target.value }))
                            }
                            className="w-full h-10"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Icon:</label>
                        <select
                            value={modalDevice.icon || "default"}
                            onChange={(e) =>
                                setModalDevice((prev) => ({ ...prev, icon: e.target.value }))
                            }
                            className="bg-gray-700 text-white px-3 py-2 rounded w-full"
                        >
                            <option value="default">Default</option>
                            <option value="network">Network</option>
                            <option value="server">Server</option>
                            <option value="device">Device</option>
                        </select>
                    </div>

                    {/* Save and Cancel buttons */}
                    <button
                        onClick={handleSave}
                        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                    >
                        Save Changes
                    </button>
                    <button
                        onClick={closeModal}
                        className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        )
    );
}