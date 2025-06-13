/**
 * Unit tests for the useDeviceDataManager hook
 * 
 * This file contains examples of how to test the device data manager hook
 * in different scenarios and modes.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useDeviceDataManager } from '../src/app/hooks/useDeviceDataManager';

// Mock dependencies
jest.mock('../src/app/utils/deviceManagementUtils', () => ({
  updateDeviceProperties: jest.fn((device) => {
    // Mock implementation that simulates localStorage update
    const mockProps = {};
    mockProps[device.ip] = { ...device };
    return mockProps;
  }),
}));

jest.mock('../src/app/contexts/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { _id: 'test-user-123', username: 'testuser' },
  })),
}));

// Mock local storage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true, data: {} }),
  })
);

describe('useDeviceDataManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Set up initial localStorage state
    localStorageMock.setItem('customDeviceProperties', JSON.stringify({
      '192.168.1.1': {
        name: 'Gateway',
        category: 'Network',
        networkRole: 'gateway',
      },
      '192.168.1.100': {
        name: 'Desktop PC',
        category: 'Computer',
      }
    }));
  });

  // Test for solo mode
  describe('Solo Mode', () => {
    it('should initialize with devices from localStorage', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useDeviceDataManager({
        scanId: null,
        isCollaborative: false,
      }));
      
      await waitForNextUpdate(); // Wait for initialization
      
      expect(result.current.deviceCache['192.168.1.1']).toBeDefined();
      expect(result.current.deviceCache['192.168.1.1'].name).toBe('Gateway');
    });
    
    it('should update a device in localStorage', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useDeviceDataManager({
        scanId: null,
        isCollaborative: false,
      }));
      
      await waitForNextUpdate(); // Wait for initialization
      
      const mockDevice = {
        ip: '192.168.1.1',
        name: 'Updated Gateway',
        category: 'Network Infrastructure',
      };
      
      await act(async () => {
        await result.current.updateDevice(mockDevice);
      });
      
      expect(result.current.deviceCache['192.168.1.1'].name).toBe('Updated Gateway');
    });
    
    it('should get a device by ID', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useDeviceDataManager({
        scanId: null,
        isCollaborative: false,
      }));
      
      await waitForNextUpdate(); // Wait for initialization
      
      const device = result.current.getDevice('192.168.1.1');
      
      expect(device).toBeDefined();
      expect(device.name).toBe('Gateway');
    });
    
    it('should merge device state with updates', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useDeviceDataManager({
        scanId: null,
        isCollaborative: false,
      }));
      
      await waitForNextUpdate(); // Wait for initialization
      
      const merged = result.current.mergeDeviceState(
        '192.168.1.1',
        { hostname: 'router.local' }, // Base device
        { notes: 'Important device' }  // Updates
      );
      
      expect(merged.name).toBe('Gateway'); // From localStorage
      expect(merged.hostname).toBe('router.local'); // From base device
      expect(merged.notes).toBe('Important device'); // From updates
      expect(merged.category).toBe('Network'); // From localStorage
    });
  });
  
  // Test for collaborative mode
  describe('Collaborative Mode', () => {
    const mockCollaboration = {
      isConnected: true,
      lockDevice: jest.fn(() => Promise.resolve(true)),
      unlockDevice: jest.fn(),
      updateDevice: jest.fn(),
      isDeviceLocked: jest.fn((deviceId) => deviceId === '192.168.1.100'),
      isDeviceLockedByMe: jest.fn((deviceId) => deviceId === '192.168.1.100'),
      isDeviceLockedByOther: jest.fn(() => false),
      sessionVersion: 1,
    };
    
    it('should use collaboration system for device updates', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useDeviceDataManager({
        scanId: 'shared_123',
        isCollaborative: true,
        collaboration: mockCollaboration,
      }));
      
      await waitForNextUpdate(); // Wait for initialization
      
      const mockDevice = {
        ip: '192.168.1.1',
        name: 'Collaborative Gateway',
      };
      
      await act(async () => {
        await result.current.updateDevice(mockDevice);
      });
      
      // Should call the collaboration updateDevice method
      expect(mockCollaboration.updateDevice).toHaveBeenCalledWith(
        '192.168.1.1',
        expect.objectContaining({ name: 'Collaborative Gateway' }),
        1
      );
    });
    
    it('should check lock status through collaboration system', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useDeviceDataManager({
        scanId: 'shared_123',
        isCollaborative: true,
        collaboration: mockCollaboration,
      }));
      
      await waitForNextUpdate(); // Wait for initialization
      
      const isLocked = result.current.isDeviceLocked('192.168.1.100');
      const isLockedByMe = result.current.isDeviceLockedByMe('192.168.1.100');
      
      expect(isLocked).toBe(true);
      expect(isLockedByMe).toBe(true);
      expect(mockCollaboration.isDeviceLocked).toHaveBeenCalledWith('192.168.1.100');
      expect(mockCollaboration.isDeviceLockedByMe).toHaveBeenCalledWith('192.168.1.100');
    });
    
    it('should handle device lock and unlock', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useDeviceDataManager({
        scanId: 'shared_123',
        isCollaborative: true,
        collaboration: mockCollaboration,
      }));
      
      await waitForNextUpdate(); // Wait for initialization
      
      await act(async () => {
        await result.current.lockDevice('192.168.1.1');
      });
      
      expect(mockCollaboration.lockDevice).toHaveBeenCalledWith('192.168.1.1');
      
      act(() => {
        result.current.unlockDevice('192.168.1.1');
      });
      
      expect(mockCollaboration.unlockDevice).toHaveBeenCalledWith('192.168.1.1');
    });
  });
  
  // Test for database synchronization
  describe('Database Synchronization', () => {
    it('should sync updates to database for shared scans', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useDeviceDataManager({
        scanId: 'shared_123',
        isCollaborative: false,
      }));
      
      await waitForNextUpdate(); // Wait for initialization
      
      // Mock API responses
      global.fetch.mockImplementation((url) => {
        if (url.includes('shared/shared_123')) {
          if (url.endsWith('shared_123')) {
            // GET scan data
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                data: {
                  scanData: {
                    devices: {
                      'Unknown': [
                        { ip: '192.168.1.1', name: 'Original Gateway' },
                        { ip: '192.168.1.100', name: 'Desktop PC' }
                      ]
                    }
                  }
                }
              })
            });
          } else {
            // PUT updated scan data
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ success: true })
            });
          }
        }
        return Promise.resolve({ ok: false });
      });
      
      const mockDevice = {
        ip: '192.168.1.1',
        name: 'Updated Gateway',
      };
      
      await act(async () => {
        await result.current.updateDevice(mockDevice);
        // Force immediate sync instead of waiting for debounce
        await result.current.syncToDatabase();
      });
      
      // Should have made API calls to update scan data
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('shared/shared_123'),
        expect.objectContaining({ method: 'PUT' })
      );
    });
  });
});
