'use client';

// Re-export CollaborationUI components for backward compatibility
export { 
  CollaborationIndicator, 
  UserPresenceList, 
  DeviceLockIndicator,
  TypingIndicator,
  CursorPosition,
  CollaborationPanel
} from '../../components/CollaborationUI';

// Default exports for backward compatibility
export default {
  CollaborationIndicator,
  UserPresenceList,
  DeviceLockIndicator
};
