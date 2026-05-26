import React, { useState, useRef, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, side = 'bottom', delay = 600 }) => {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<Element | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  function showTooltip() {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  }

  function hideTooltip() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }

  useLayoutEffect(() => {
    if (!visible || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const GAP = 6;
    let x = rect.left + rect.width / 2;
    let y = 0;
    if (side === 'bottom') y = rect.bottom + GAP;
    else if (side === 'top') y = rect.top - GAP;
    else if (side === 'left') { x = rect.left - GAP; y = rect.top + rect.height / 2; }
    else { x = rect.right + GAP; y = rect.top + rect.height / 2; }
    setPos({ x, y });
  }, [visible, side]);

  const childProps = children.props as Record<string, unknown>;
  const child = React.cloneElement(children, {
    ref: (el: Element | null) => { triggerRef.current = el; },
    onMouseEnter: (e: React.MouseEvent) => { showTooltip(); typeof childProps.onMouseEnter === 'function' && childProps.onMouseEnter(e); },
    onMouseLeave: (e: React.MouseEvent) => { hideTooltip(); typeof childProps.onMouseLeave === 'function' && childProps.onMouseLeave(e); },
    onFocus: (e: React.FocusEvent) => { showTooltip(); typeof childProps.onFocus === 'function' && childProps.onFocus(e); },
    onBlur: (e: React.FocusEvent) => { hideTooltip(); typeof childProps.onBlur === 'function' && childProps.onBlur(e); },
  } as Record<string, unknown>);

  return (
    <>
      {child}
      {visible && ReactDOM.createPortal(
        <div
          ref={tooltipRef}
          role="tooltip"
          style={{
            position: 'fixed',
            left: pos.x,
            top: pos.y,
            transform: side === 'bottom' || side === 'top' ? 'translateX(-50%)' : side === 'right' ? 'translateY(-50%)' : 'translate(-100%, -50%)',
            zIndex: 9999,
          }}
          className="px-2 py-1 text-xs text-white bg-zinc-800 border border-white/10 rounded-md shadow-xl pointer-events-none whitespace-nowrap"
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
};
