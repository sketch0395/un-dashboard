"use client";

import React from 'react';
import UnifiedDeviceModalImpl from './UnifiedDeviceModal.new';

// Simple wrapper component to fix potential import issues
const UnifiedDeviceModal = (props) => {
    return <UnifiedDeviceModalImpl {...props} />;
};

export default UnifiedDeviceModal;
