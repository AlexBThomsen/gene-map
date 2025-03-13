import { useEffect } from 'react';

export type KeyPressHandler = () => void;

export function useKeyPress(targetKey: string, handler: KeyPressHandler) {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === targetKey) {
        handler();
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [targetKey, handler]);
} 