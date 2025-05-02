import React from "react";
import Modal from "./Modal";

const DeviceModal = ({ modalDevice, setModalDevice, onSave }) => {
    const handleSave = () => {
        onSave(modalDevice);
        setModalDevice(null);
    };

    return (
        <Modal isVisible={!!modalDevice} onClose={() => setModalDevice(null)}>
            <h2 className="text-white text-xl mb-4">Edit Device</h2>
            <div className="mb-4">
                <label className="block text-sm text-gray-300 mb-1">Name</label>
                <input
                    type="text"
                    value={modalDevice?.name || ""}
                    onChange={(e) =>
                        setModalDevice((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                />
            </div>
            <div className="flex justify-end gap-2">
                <button
                    onClick={() => setModalDevice(null)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                    Save
                </button>
            </div>
        </Modal>
    );
};

export default DeviceModal;