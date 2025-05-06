"use client";

import React, { useState, useEffect } from 'react';
import { FaNetworkWired, FaInfoCircle, FaTimesCircle, FaCheck } from 'react-icons/fa';

export default function DeviceHeaders({ ip, hostname, headers, onClose, loading }) {
    const [expandedSection, setExpandedSection] = useState(null);

    const toggleSection = (section) => {
        if (expandedSection === section) {
            setExpandedSection(null);
        } else {
            setExpandedSection(section);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-lg w-full max-w-4xl text-white max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="bg-gray-900 p-4 rounded-t-lg flex justify-between items-center">
                    <div className="flex items-center">
                        <FaNetworkWired className="mr-3 text-blue-400 text-xl" />
                        <div>
                            <h2 className="text-xl font-bold">Device Headers</h2>
                            <p className="text-sm text-gray-400">
                                {hostname || 'Device'} ({ip})
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-white text-xl"
                        aria-label="Close"
                    >
                        <FaTimesCircle />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto flex-grow">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            <div className="animate-spin h-10 w-10 border-t-2 border-b-2 border-blue-500 rounded-full mb-4"></div>
                            <p>Scanning device for header information...</p>
                            <p className="text-sm text-gray-400 mt-2">This may take a few moments</p>
                        </div>
                    ) : headers ? (
                        <div className="space-y-4">
                            {/* HTTP Headers Section */}
                            {headers.http && (
                                <div className="border border-gray-700 rounded-lg overflow-hidden">
                                    <div 
                                        className="bg-gray-700 p-3 cursor-pointer flex justify-between items-center"
                                        onClick={() => toggleSection('http')}
                                    >
                                        <h3 className="font-medium">HTTP Headers</h3>
                                        <span>{expandedSection === 'http' ? '−' : '+'}</span>
                                    </div>
                                    {expandedSection === 'http' && (
                                        <div className="p-4 bg-gray-800 border-t border-gray-700">
                                            {Object.keys(headers.http).length > 0 ? (
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="text-left text-gray-400">
                                                            <th className="pb-2">Header</th>
                                                            <th className="pb-2">Value</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {Object.entries(headers.http).map(([key, value], idx) => (
                                                            <tr key={idx} className="border-t border-gray-700">
                                                                <td className="py-2 pr-4">{key}</td>
                                                                <td className="py-2 text-gray-300">{value}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <p className="text-gray-400">No HTTP headers detected</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* SSL/TLS Section */}
                            {headers.ssl && (
                                <div className="border border-gray-700 rounded-lg overflow-hidden">
                                    <div 
                                        className="bg-gray-700 p-3 cursor-pointer flex justify-between items-center"
                                        onClick={() => toggleSection('ssl')}
                                    >
                                        <h3 className="font-medium">SSL/TLS Information</h3>
                                        <span>{expandedSection === 'ssl' ? '−' : '+'}</span>
                                    </div>
                                    {expandedSection === 'ssl' && (
                                        <div className="p-4 bg-gray-800 border-t border-gray-700">
                                            {headers.ssl.enabled ? (
                                                <div className="space-y-3">
                                                    <div className="flex items-center">
                                                        <FaCheck className="text-green-500 mr-2" />
                                                        <span>SSL/TLS Enabled</span>
                                                    </div>
                                                    
                                                    {headers.ssl.version && (
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <p className="text-gray-400 text-xs">Version</p>
                                                                <p>{headers.ssl.version}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-gray-400 text-xs">Cipher</p>
                                                                <p>{headers.ssl.cipher || 'Unknown'}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    
                                                    {headers.ssl.certificate && (
                                                        <div>
                                                            <p className="text-gray-400 text-xs mt-2">Certificate</p>
                                                            <div className="bg-gray-900 p-2 rounded mt-1">
                                                                <p>Issued to: {headers.ssl.certificate.subject}</p>
                                                                <p>Issuer: {headers.ssl.certificate.issuer}</p>
                                                                <p>Valid until: {headers.ssl.certificate.expiry}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex items-center">
                                                    <FaTimesCircle className="text-red-500 mr-2" />
                                                    <span>SSL/TLS Not Enabled</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* TCP/IP Information */}
                            {headers.tcp && (
                                <div className="border border-gray-700 rounded-lg overflow-hidden">
                                    <div 
                                        className="bg-gray-700 p-3 cursor-pointer flex justify-between items-center"
                                        onClick={() => toggleSection('tcp')}
                                    >
                                        <h3 className="font-medium">TCP/IP Information</h3>
                                        <span>{expandedSection === 'tcp' ? '−' : '+'}</span>
                                    </div>
                                    {expandedSection === 'tcp' && (
                                        <div className="p-4 bg-gray-800 border-t border-gray-700">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-gray-400 text-xs">Open Ports</p>
                                                    {headers.tcp.openPorts && headers.tcp.openPorts.length > 0 ? (
                                                        <div className="flex flex-wrap gap-2 mt-1">
                                                            {headers.tcp.openPorts.map((port, idx) => (
                                                                <span key={idx} className="bg-blue-900 text-blue-200 px-2 py-0.5 rounded text-xs">
                                                                    {port}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p>No open ports detected</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 text-xs">TTL</p>
                                                    <p>{headers.tcp.ttl || 'Unknown'}</p>
                                                </div>
                                            </div>
                                            
                                            {headers.tcp.fingerprint && (
                                                <div className="mt-3">
                                                    <p className="text-gray-400 text-xs">OS Fingerprint</p>
                                                    <p className="mt-1">{headers.tcp.fingerprint}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Service Detection */}
                            {headers.services && (
                                <div className="border border-gray-700 rounded-lg overflow-hidden">
                                    <div 
                                        className="bg-gray-700 p-3 cursor-pointer flex justify-between items-center"
                                        onClick={() => toggleSection('services')}
                                    >
                                        <h3 className="font-medium">Service Detection</h3>
                                        <span>{expandedSection === 'services' ? '−' : '+'}</span>
                                    </div>
                                    {expandedSection === 'services' && (
                                        <div className="p-4 bg-gray-800 border-t border-gray-700">
                                            {headers.services.length > 0 ? (
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="text-left text-gray-400">
                                                            <th className="pb-2">Port</th>
                                                            <th className="pb-2">Service</th>
                                                            <th className="pb-2">Version</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {headers.services.map((service, idx) => (
                                                            <tr key={idx} className="border-t border-gray-700">
                                                                <td className="py-2 pr-4">{service.port}/{service.protocol}</td>
                                                                <td className="py-2">{service.name}</td>
                                                                <td className="py-2 text-gray-300">{service.version || 'Unknown'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <p className="text-gray-400">No services detected</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* User Agent Information */}
                            {headers.userAgents && headers.userAgents.length > 0 && (
                                <div className="border border-gray-700 rounded-lg overflow-hidden">
                                    <div 
                                        className="bg-gray-700 p-3 cursor-pointer flex justify-between items-center"
                                        onClick={() => toggleSection('userAgents')}
                                    >
                                        <h3 className="font-medium">User Agents & Server Identifiers</h3>
                                        <span>{expandedSection === 'userAgents' ? '−' : '+'}</span>
                                    </div>
                                    {expandedSection === 'userAgents' && (
                                        <div className="p-4 bg-gray-800 border-t border-gray-700">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-gray-400">
                                                        <th className="pb-2">Type</th>
                                                        <th className="pb-2">Value</th>
                                                        <th className="pb-2">Source</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {headers.userAgents.map((agent, idx) => (
                                                        <tr key={idx} className="border-t border-gray-700">
                                                            <td className="py-2 pr-4">{agent.type}</td>
                                                            <td className="py-2 break-words max-w-[200px]">{agent.value}</td>
                                                            <td className="py-2 text-gray-300 text-xs">{agent.source}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-8 text-center">
                            <FaInfoCircle className="text-4xl text-blue-400 mx-auto mb-4" />
                            <p className="text-xl mb-2">No header information available</p>
                            <p className="text-gray-400">
                                Header information couldn't be retrieved for this device.
                                The device might be offline or not responding to requests.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-900 p-3 rounded-b-lg border-t border-gray-700 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}