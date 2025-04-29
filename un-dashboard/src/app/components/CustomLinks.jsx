"use client";

import React, { useState, useEffect } from 'react';
import { iconMap, getIconForLink } from './icons/iconMapping';
import { FaChevronLeft, FaChevronRight, FaCircle } from 'react-icons/fa';

const CustomLinks = () => {
  // Store links in state - initially with some examples
  const [links, setLinks] = useState([
    { id: 1, name: 'GitHub', url: 'https://github.com', category: 'Development' },
    { id: 2, name: 'Docker Hub', url: 'https://hub.docker.com', category: 'Docker' },
  ]);
  
  const [newLink, setNewLink] = useState({ name: '', url: '', category: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  
  // Load links from localStorage on component mount
  useEffect(() => {
    const savedLinks = localStorage.getItem('customLinks');
    if (savedLinks) {
      setLinks(JSON.parse(savedLinks));
    }
  }, []);
  
  // Save links to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('customLinks', JSON.stringify(links));
  }, [links]);
  
  const handleAddLink = () => {
    if (newLink.name && newLink.url) {
      setLinks([...links, { ...newLink, id: Date.now() }]);
      setNewLink({ name: '', url: '', category: '' });
      setIsAdding(false);
    }
  };
  
  const handleDeleteLink = (id) => {
    setLinks(links.filter(link => link.id !== id));
  };
  
  // Group links by category
  const linksByCategory = links.reduce((acc, link) => {
    const category = link.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(link);
    return acc;
  }, {});
  
  // Get categories as array
  const categories = Object.keys(linksByCategory);
  
  // Calculate total number of pages
  const categoriesPerPage = 4;
  const totalPages = Math.ceil(categories.length / categoriesPerPage);
  
  // Get current visible categories
  const visibleCategories = categories.slice(
    currentPage * categoriesPerPage, 
    (currentPage + 1) * categoriesPerPage
  );
  
  // Navigation handlers
  const nextPage = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  };
  
  const prevPage = () => {
    setCurrentPage((prev) => (prev === 0 ? totalPages - 1 : prev - 1));
  };
  
  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg shadow-lg mt-6 w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Custom Links & Favorites</h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded"
        >
          {isAdding ? 'Cancel' : 'Add New Link'}
        </button>
      </div>
      
      {isAdding && (
        <div className="mb-6 bg-gray-800 p-4 rounded-lg shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Name"
              value={newLink.name}
              onChange={(e) => setNewLink({...newLink, name: e.target.value})}
              className="bg-gray-700 text-white px-3 py-2 rounded"
            />
            <input
              type="text"
              placeholder="URL"
              value={newLink.url}
              onChange={(e) => setNewLink({...newLink, url: e.target.value})}
              className="bg-gray-700 text-white px-3 py-2 rounded"
            />
            <input
              type="text"
              placeholder="Category (optional)"
              value={newLink.category}
              onChange={(e) => setNewLink({...newLink, category: e.target.value})}
              className="bg-gray-700 text-white px-3 py-2 rounded"
            />
          </div>
          <button 
            onClick={handleAddLink}
            className="mt-4 bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded"
          >
            Save Link
          </button>
        </div>
      )}
      
      {categories.length === 0 ? (
        <p className="text-gray-400">No custom links found</p>
      ) : (
        <>
          <div className="flex gap-6 overflow-hidden">
            {visibleCategories.map(category => (
              <div key={category} className="bg-gray-800 rounded-lg p-4 min-w-[300px] max-w-[350px] flex-1">
                <h3 className="text-lg font-semibold text-blue-400 mb-3 pb-2 border-b border-gray-700">{category}</h3>
                <div className="flex flex-col space-y-4">
                  {linksByCategory[category].map(link => (
                    <div key={link.id} className="bg-gray-700 text-white p-4 rounded-lg shadow-md">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <span className="text-2xl mr-2 text-blue-400">
                            {getIconForLink(link)}
                          </span>
                          <h3 className="text-lg font-bold">{link.name}</h3>
                        </div>
                        <button 
                          onClick={() => handleDeleteLink(link.id)}
                          className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs"
                        >
                          Delete
                        </button>
                      </div>
                      <p className="text-sm text-gray-400 mt-1 truncate">
                        {link.url}
                      </p>
                      <div className="mt-4">
                        <a 
                          href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded inline-block"
                        >
                          Open Link
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* Carousel navigation */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-4">
              <button 
                onClick={prevPage} 
                className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
                aria-label="Previous page"
              >
                <FaChevronLeft />
              </button>
              
              <div className="flex gap-2">
                {Array.from({ length: totalPages }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPage(index)}
                    className={`text-xs ${currentPage === index ? 'text-blue-400' : 'text-gray-500'}`}
                    aria-label={`Go to page ${index + 1}`}
                  >
                    <FaCircle />
                  </button>
                ))}
              </div>
              
              <button 
                onClick={nextPage} 
                className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
                aria-label="Next page"
              >
                <FaChevronRight />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CustomLinks;