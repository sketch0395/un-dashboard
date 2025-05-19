"use client";

import { useState } from 'react';
import { FaCog, FaTimes, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const PageControls = ({ 
  title = "Controls",
  children, 
  initialExpanded = true,
  className = ""
}) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  return (
    <div className={`bg-gray-800 rounded-md shadow-lg mb-6 ${className}`}>
      <div 
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <h3 className="font-bold text-lg">{title}</h3>
          {isExpanded ? 
            <FaChevronUp className="ml-2" /> : 
            <FaChevronDown className="ml-2" />
          }
        </div>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsConfigOpen(!isConfigOpen);
          }}
          className="p-2 bg-gray-700 rounded-full hover:bg-gray-600 focus:outline-none"
        >
          <FaCog />
        </button>
      </div>

      {isExpanded && (
        <div className="p-4 border-t border-gray-700">
          {children}
        </div>
      )}

      {isConfigOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{title} Configuration</h3>
              <button 
                onClick={() => setIsConfigOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>
            
            <div>
              <p className="text-gray-300 mb-4">
                Configuration options for this control panel will be displayed here.
                You can customize this per page by passing different configuration components.
              </p>
              
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                onClick={() => setIsConfigOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageControls;
