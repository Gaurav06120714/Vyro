import { useState, useCallback, useEffect } from 'react';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  type: 'page' | 'link' | 'image' | 'selection';
  context: { linkUrl?: string; srcUrl?: string; selectionText?: string };
}

export function useContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, type: 'page', context: {} });

  const show = useCallback((x: number, y: number, type: ContextMenuState['type'], context: ContextMenuState['context']) => {
    setMenu({ visible: true, x, y, type, context });
  }, []);

  const hide = useCallback(() => {
    setMenu(s => ({ ...s, visible: false }));
  }, []);

  useEffect(() => {
    if (menu.visible) {
      const handler = () => hide();
      window.addEventListener('click', handler, { once: true });
      return () => window.removeEventListener('click', handler);
    }
  }, [menu.visible, hide]);

  return { menu, show, hide };
}
