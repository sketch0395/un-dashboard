import React from 'react';
import { FaTrash, FaTag, FaUserCog, FaCheck, FaTimes } from 'react-icons/fa';

const BulkOperations = ({ selectedCount, onBulkOperation }) => {
    const [showCategoryModal, setShowCategoryModal] = React.useState(false);
    const [showRoleModal, setShowRoleModal] = React.useState(false);
    const [newCategory, setNewCategory] = React.useState('');
    const [newRole, setNewRole] = React.useState('');

    const deviceCategories = [
        "Production Server",
        "Development Server",
        "Database",
        "Router",
        "Switch",
        "Firewall",
        "IoT Device",
        "Workstation",
        "Mobile Device",
        "Printer",
        "Camera",
        "Other"
    ];

    const handleCategoryUpdate = () => {
        if (newCategory) {
            onBulkOperation('category', { category: newCategory });
            setShowCategoryModal(false);
            setNewCategory('');
        }
    };

    const handleRoleUpdate = () => {
        onBulkOperation('role', { role: newRole === 'none' ? null : newRole });
        setShowRoleModal(false);
        setNewRole('');
    };

    const handleDelete = () => {
        if (confirm(`Are you sure you want to delete ${selectedCount} selected devices?`)) {
            onBulkOperation('delete');
        }
    };

    return (
        <div className="bg-yellow-900 bg-opacity-50 border border-yellow-600 p-4 rounded-lg mb-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FaCheck className="text-yellow-400" />
                    <span className="text-yellow-200">
                        {selectedCount} device{selectedCount !== 1 ? 's' : ''} selected
                    </span>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setShowCategoryModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                    >
                        <FaTag />
                        Set Category
                    </button>
                    
                    <button
                        onClick={() => setShowRoleModal(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                    >
                        <FaUserCog />
                        Set Role
                    </button>
                    
                    <button
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                    >
                        <FaTrash />
                        Delete
                    </button>
                </div>
            </div>

            {/* Category Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 w-96">
                        <h3 className="text-white text-lg mb-4">Set Category for {selectedCount} devices</h3>
                        <select
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 mb-4"
                        >
                            <option value="">Select a category</option>
                            {deviceCategories.map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowCategoryModal(false)}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCategoryUpdate}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                                disabled={!newCategory}
                            >
                                Update
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Role Modal */}
            {showRoleModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-lg p-6 w-96">
                        <h3 className="text-white text-lg mb-4">Set Network Role for {selectedCount} devices</h3>
                        <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 mb-4"
                        >
                            <option value="">Select a role</option>
                            <option value="gateway">Gateway</option>
                            <option value="switch">Switch</option>
                            <option value="none">Regular Device</option>
                        </select>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowRoleModal(false)}
                                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRoleUpdate}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
                                disabled={!newRole}
                            >
                                Update
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulkOperations;
