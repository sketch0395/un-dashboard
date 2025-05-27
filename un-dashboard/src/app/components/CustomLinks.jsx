"use client";

import React, { useState, useEffect, useRef } from 'react';
import { iconMap, getIconForLink } from './icons/iconMapping';
import { FaChevronLeft, FaChevronRight, FaCircle, FaPlus, FaStar, FaLink } from 'react-icons/fa';

// Define default links outside component to keep them consistent
const DEFAULT_LINKS = [
  { id: 'default-1', name: 'GitHub', url: 'https://github.com', category: 'Development', isDefault: true },
  { id: 'default-2', name: 'Docker Hub', url: 'https://hub.docker.com', category: 'Docker', isDefault: true },
];

const CustomLinks = () => {
  // Initialize with empty array - we'll load from localStorage first
  const [links, setLinks] = useState([]);
  const [favorites, setFavorites] = useState([]);
  
  const [newLink, setNewLink] = useState({ name: '', url: '', category: '' });
  const [newFavorite, setNewFavorite] = useState({ name: '', path: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingFavorite, setIsAddingFavorite] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [categoriesPerPage, setCategoriesPerPage] = useState(4);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  
  // Container ref for measuring available width
  const containerRef = useRef(null);
    // Load links from localStorage on component mount
  useEffect(() => {
    const savedLinks = localStorage.getItem('customLinks');
    const savedFavorites = localStorage.getItem('favorites');
    
    if (savedLinks) {
      const parsedLinks = JSON.parse(savedLinks);
      
      // Get IDs of saved default links to check which ones were deleted
      const savedDefaultIds = parsedLinks
        .filter(link => link.isDefault)
        .map(link => link.id);
      
      // Include default links that aren't in the saved list (weren't deleted)
      const defaultLinksToAdd = DEFAULT_LINKS.filter(
        defaultLink => !savedDefaultIds.includes(defaultLink.id)
      );
      
      // Combine saved links with any missing default links
      setLinks([...parsedLinks, ...defaultLinksToAdd]);
    } else {
      // No saved links, use all default links
      setLinks(DEFAULT_LINKS);
    }

    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);
    // Save links to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('customLinks', JSON.stringify(links));
  }, [links]);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);
  
  // Responsive carousel - adjust cards per page based on container width
  useEffect(() => {
    const updateCardsPerPage = () => {
      if (!containerRef.current) return;
      
      const containerWidth = containerRef.current.offsetWidth;
      const cardWidth = 320; // card width + gap (300px + 20px)
      const cardsToShow = Math.max(1, Math.floor(containerWidth / cardWidth));
      
      setCategoriesPerPage(cardsToShow);
      // Reset to first page when resizing to avoid empty pages
      setCurrentPage(0);
    };
    
    // Initial calculation
    updateCardsPerPage();
    
    // Add resize listener
    window.addEventListener('resize', updateCardsPerPage);
    
    return () => {
      window.removeEventListener('resize', updateCardsPerPage);
    };
  }, []);
  
  const handleAddLink = () => {
    if (newLink.name && newLink.url) {
      setLinks([...links, { ...newLink, id: Date.now() }]);
      setNewLink({ name: '', url: '', category: '' });
      setIsAdding(false);
      setIsCustomCategory(false);
    }
  };
    const handleDeleteLink = (id) => {
    setLinks(links.filter(link => link.id !== id));
  };

  const handleAddFavorite = () => {
    if (newFavorite.name && newFavorite.path) {
      setFavorites([...favorites, { ...newFavorite, id: Date.now() }]);
      setNewFavorite({ name: '', path: '' });
      setIsAddingFavorite(false);
    }
  };

  const handleDeleteFavorite = (id) => {
    setFavorites(favorites.filter(favorite => favorite.id !== id));
  };
  
  // Group links by category
  const linksByCategory = links.reduce((acc, link) => {
    const category = link.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(link);
    return acc;
  }, {});
  
  // Get unique categories for dropdown
  const uniqueCategories = [...new Set(links.map(link => link.category || 'Uncategorized'))];
  
  // Get categories as array
  const categories = Object.keys(linksByCategory);
  
  // Calculate total number of pages
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
  
  // Category selection handler
  const handleCategorySelect = (e) => {
    const value = e.target.value;
    if (value === "custom") {
      setIsCustomCategory(true);
      setNewLink({...newLink, category: ''});
    } else {
      setIsCustomCategory(false);
      setNewLink({...newLink, category: value});
    }
  };
    return (
    <div className="space-y-6">
      {/* Custom Links Section */}
      <div className="p-6 bg-gray-900 text-white rounded-lg shadow-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FaLink className="text-blue-400" />
            Custom Links
          </h2>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded"
          >
            {isAdding ? 'Cancel' : 'Add New Link'}
          </button>
        </div>
        
        {isAdding && (
          <div className="mb-6 bg-gray-800 p-4 rounded-lg shadow-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
            </div>
            
            <div className="mb-4">
              <div className="flex gap-4 items-end">
                <div className="flex-grow">
                  <label className="block text-sm text-gray-400 mb-1">Category</label>
                  <select
                    value={isCustomCategory ? "custom" : newLink.category}
                    onChange={handleCategorySelect}
                    className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                  >
                    <option value="">Select category...</option>
                    {uniqueCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                    <option value="custom">+ Add new category</option>
                  </select>
                </div>
                
                {isCustomCategory && (
                  <div className="flex-grow">
                    <input
                      type="text"
                      placeholder="New category name"
                      value={newLink.category}
                      onChange={(e) => setNewLink({...newLink, category: e.target.value})}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>
            
            <button 
              onClick={handleAddLink}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded"
            >
              Save Link
            </button>
          </div>
        )}
        
        {categories.length === 0 ? (
          <p className="text-gray-400">No custom links found</p>
        ) : (
          <>
            {/* Carousel navigation - moved above cards */}
            {totalPages > 1 && (
              <div className="mb-4 flex items-center justify-between gap-4">
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
            
            <div ref={containerRef} className="flex gap-6 overflow-hidden">
              {visibleCategories.map(category => (
                <div key={category} className="bg-gray-800 rounded-lg p-4 min-w-[280px] max-w-[350px] flex-1">
                  <h3 className="text-lg font-semibold text-blue-400 mb-3 pb-2 border-b border-gray-700">{category}</h3>
                  <div className="flex flex-col space-y-4">
                    {linksByCategory[category].map(link => (
                      <div key={link.id} className="bg-gray-700 text-white p-4 rounded-lg shadow-md">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <span className="text-2xl mr-2 text-blue-400">
                              {React.createElement(getIconForLink(link))}
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
          </>
        )}
      </div>

      {/* Favorites Section */}
      <div className="p-6 bg-gray-900 text-white rounded-lg shadow-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FaStar className="text-yellow-400" />
            Favorites
          </h2>
          <button 
            onClick={() => setIsAddingFavorite(!isAddingFavorite)}
            className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-1 px-3 rounded"
          >
            {isAddingFavorite ? 'Cancel' : 'Add Favorite'}
          </button>
        </div>
        
        {isAddingFavorite && (
          <div className="mb-6 bg-gray-800 p-4 rounded-lg shadow-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="Favorite Name"
                value={newFavorite.name}
                onChange={(e) => setNewFavorite({...newFavorite, name: e.target.value})}
                className="bg-gray-700 text-white px-3 py-2 rounded"
              />
              <select
                value={newFavorite.path}
                onChange={(e) => setNewFavorite({...newFavorite, path: e.target.value})}
                className="bg-gray-700 text-white px-3 py-2 rounded"
              >
                <option value="">Select a page...</option>
                <option value="/">Home</option>
                <option value="/docker">Docker Manager</option>
                <option value="/networkscan">Network Scan</option>
                <option value="/performance">Performance</option>
              </select>
            </div>
            
            <button 
              onClick={handleAddFavorite}
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded"
            >
              Save Favorite
            </button>
          </div>
        )}
        
        {favorites.length === 0 ? (
          <p className="text-gray-400">No favorites added yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map(favorite => (
              <div key={favorite.id} className="bg-gray-800 text-white p-4 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <FaStar className="text-yellow-400" />
                    {favorite.name}
                  </h3>
                  <button 
                    onClick={() => handleDeleteFavorite(favorite.id)}
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs"
                  >
                    Remove
                  </button>
                </div>
                <p className="text-sm text-gray-400 mb-4">{favorite.path}</p>
                <a 
                  href={favorite.path}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-block w-full text-center"
                >
                  Go to Page
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomLinks;