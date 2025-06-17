import React from "react";

const Modal = ({ isVisible, isOpen, onClose, children, title, size = "md" }) => {
    // Support both isVisible and isOpen props for compatibility
    const shouldShow = isVisible || isOpen;
    if (!shouldShow) return null;

    // Handle different modal sizes
    const getSizeClasses = () => {
        switch(size) {
            case 'sm':
                return 'w-80 max-w-sm';
            case 'lg':
                return 'w-11/12 max-w-4xl';
            case 'xl':
                return 'w-11/12 max-w-6xl';
            default:
                return 'w-96 max-w-md';
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[60]">
            <div className={`bg-gray-800 rounded-lg relative max-h-[90vh] overflow-y-auto ${getSizeClasses()}`}>
                {/* Modal Header */}
                {title && (
                    <div className="flex items-center justify-between p-4 border-b border-gray-700">
                        <div className="flex-1">
                            {typeof title === 'string' ? (
                                <h2 className="text-xl font-semibold text-white">{title}</h2>
                            ) : (
                                title
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="ml-4 text-gray-400 hover:text-white text-xl flex-shrink-0"
                        >
                            &times;
                        </button>
                    </div>
                )}
                
                {/* Close button if no title */}
                {!title && (
                    <button
                        onClick={onClose}
                        className="absolute top-2 right-2 text-white hover:text-gray-400 z-10"
                    >
                        &times;
                    </button>
                )}
                
                {/* Modal Content */}
                <div className={title ? "p-0" : "p-4"}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;