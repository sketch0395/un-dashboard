import React from "react";

const Modal = ({ isVisible, onClose, children }) => {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-4 w-96 relative">
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 text-white hover:text-gray-400"
                >
                    &times;
                </button>
                {children}
            </div>
        </div>
    );
};

export default Modal;