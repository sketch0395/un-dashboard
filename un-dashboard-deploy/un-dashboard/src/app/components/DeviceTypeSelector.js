// Device Type Selector Component with Icons and Categories
'use client';

import React, { useState } from 'react';
import { FaChevronDown, FaSearch } from 'react-icons/fa';
import { DEVICE_TYPES, getDeviceCategories, getDeviceTypeById } from '../utils/deviceTypes';

export function DeviceTypeSelector({ 
  value, 
  onChange, 
  disabled = false,
  className = '',
  label = 'Device Type',
  showDescription = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = getDeviceCategories();
  const selectedType = getDeviceTypeById(value);

  const filteredTypes = DEVICE_TYPES.filter(type => {
    const matchesSearch = !searchTerm || 
      type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || type.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleSelect = (typeId) => {
    onChange(typeId);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {label}
      </label>{/* Current Selection */}
      <div 
        className={`w-full border rounded-lg px-3 py-2 cursor-pointer transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed bg-gray-500 border-gray-900' : 'bg-gray-300 border-gray-300 hover:border-blue-300'
        } ${className}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {selectedType ? (
              <>
                <selectedType.icon 
                  className="w-4 h-4" 
                  style={{ color: selectedType.color }}
                />
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: selectedType.color }}
                />
                <div>                <div className="text-gray-300 text-sm">{selectedType.name}</div>
                  {showDescription && (
                    <div className="text-gray-500 text-xs">{selectedType.description}</div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-gray-500 text-sm">Select device type</div>
            )}
          </div>
            <FaChevronDown 
            className={`w-3 h-3 text-gray-500 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-900 rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">          {/* Search and Filter */}
          <div className="p-3 border-b border-gray-900 space-y-3">            {/* Search */}
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
              <input
                type="text"
                placeholder="Search device types..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-gray-800 text-gray-300 text-sm rounded border border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setSelectedCategory('all')}                className={`px-2 py-1 text-xs rounded ${
                  selectedCategory === 'all' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-900'
                }`}
              >
                All
              </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}                  className={`px-2 py-1 text-xs rounded ${
                    selectedCategory === category.id 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-900'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Device Types List */}          <div className="max-h-64 overflow-y-auto">
            {filteredTypes.length === 0 ? (
              <div className="px-3 py-4 text-center text-gray-500 text-sm">
                No device types match your search
              </div>
            ) : (
              <div className="py-1">
                {filteredTypes.map((type) => (
                  <div
                    key={type.id}
                    className={`px-3 py-2 cursor-pointer hover:bg-gray-500 transition-colors ${
                      value === type.id ? 'bg-gray-800 border-l-4 border-blue-900' : ''
                    }`}
                    onClick={() => handleSelect(type.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <type.icon 
                        className="w-4 h-4" 
                        style={{ color: type.color }}
                      />
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: type.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-gray-300 text-sm font-medium">{type.name}</div>
                        <div className="text-gray-400 text-xs">{type.description}</div>
                      </div>
                      <div className="text-xs text-gray-400 capitalize">
                        {type.category}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

export default DeviceTypeSelector;
