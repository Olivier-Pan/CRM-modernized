import { useEffect, useRef, useState } from 'react';
import { ALL_STATUSES, getStatusLabel, getStatusVars } from '../../lib/status';
import type { SharkStatus } from '../../types';
import { IconCheck, IconChevronDown } from './Icons';

interface StatusDropdownProps {
  value: string;
  disabled?: boolean;
  onChange: (nextStatus: SharkStatus) => void;
}

export default function StatusDropdown({ value, disabled, onChange }: StatusDropdownProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; openUp: boolean }>({
    top: 0,
    left: 0,
    openUp: false,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    function handleClose() {
      setOpen(false);
    }

    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('resize', handleClose);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose);
    };
  }, [open]);

  function toggleMenu() {
    if (disabled) return;
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const openUp = window.innerHeight - rect.bottom < 250;
      setCoords({
        top: openUp ? rect.top - 4 : rect.bottom + 4,
        left: Math.min(rect.left, window.innerWidth - 205),
        openUp,
      });
    }
    setOpen((v) => !v);
  }

  const vars = getStatusVars(value);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={toggleMenu}
        title="Cliquer pour changer le statut"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 26,
          padding: '0 9px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 500,
          color: vars.text,
          background: vars.bg,
          border: `1px solid ${vars.border}`,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: vars.text }} />
        <span>{getStatusLabel(value)}</span>
        <IconChevronDown size={11} />
      </button>

      {open && (
        <div
          ref={menuRef}
          className="crm-dropdown"
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            transform: coords.openUp ? 'translateY(-100%)' : undefined,
            minWidth: 190,
            zIndex: 1200,
          }}
        >
          {ALL_STATUSES.map((s) => {
            const v = getStatusVars(s);
            const active = value === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setOpen(false);
                  onChange(s);
                }}
                className="crm-dropdown-item"
                style={{
                  justifyContent: 'space-between',
                  background: active ? 'var(--bg-subtle)' : undefined,
                  fontWeight: active ? 600 : 500,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: v.text }} />
                  <span>{getStatusLabel(s)}</span>
                </span>
                {active && <IconCheck size={12} color="var(--text-secondary)" />}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}