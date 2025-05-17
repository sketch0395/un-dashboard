"use client";

import React from 'react';
import Modal from './Modal';

const UnifiedDeviceModalSimple = ({ 
    modalDevice, 
    setModalDevice, 
    onSave,
    onStartSSH,
    systemUptime 
}) => {
    const handleClose = () => {
        setModalDevice(null);
    };

    const handleSave = () => {
        if (modalDevice) {
            onSave(modalDevice);
            setModalDevice(null);
        }
    };

    if (!modalDevice) return null;

    return (
        <Modal isVisible={!!modalDevice} onClose={handleClose}>
            <div className="max-h-[80vh] overflow-y-auto pr-2">
                <div className="sticky top-0 bg-gray-800 z-10 pb-2">
                    <div className="flex justify-between mb-4">
                        <h2 className="text-white text-xl">{modalDevice?.name || "Device"}</h2>
                    </div>
                    <div className="text-gray-400 text-sm">{modalDevice?.ip}</div>
                </div>

                <div className="bg-gray-700 p-3 rounded mb-4">
                    <h3 className="text-sm font-semibold mb-2 text-blue-400">
                        Device Information
                    </h3>
                    <div className="text-white">
                        Status: {modalDevice?.alive ? "Online" : "Offline"}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 sticky bottom-0 bg-gray-800 py-3">
                    <button
                        onClick={handleClose}
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
            </div>
        </Modal>
    );
};

export default UnifiedDeviceModalSimple;
