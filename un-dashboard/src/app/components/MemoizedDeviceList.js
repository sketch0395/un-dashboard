import React, { memo } from "react";
import { FaTerminal } from "react-icons/fa";

const DeviceList = ({ devices, openModal, isSSHAvailable, openSSHModal }) => {
    return (
        <div className="device-list">
            {devices.map((device, index) => (
                <div key={index} className="device-item flex items-center justify-between p-2 border-b border-gray-700">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">
                            {device.name ? (
                                <span>
                                    {device.name} <span className="text-gray-400">({device.ip})</span>
                                </span>
                            ) : (
                                device.ip
                            )}
                        </p>
                        {isSSHAvailable(device) && (
                            <button
                                onClick={() => openSSHModal(device)}
                                className="text-green-500 hover:text-green-400"
                                title="SSH Available"
                            >
                                <FaTerminal />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => openModal(device)}
                        className="text-blue-500 hover:text-blue-400"
                        title="Edit Device"
                    >
                        Edit
                    </button>
                </div>
            ))}
        </div>
    );
};

const MemoizedDeviceList = memo(DeviceList);

export default MemoizedDeviceList;