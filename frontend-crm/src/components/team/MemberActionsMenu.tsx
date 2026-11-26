import { useEffect, useRef, useState } from 'react';
import type { Member } from '../../types';
import { IconMore } from '../ui/Icons';

interface MemberActionsMenuProps {
  member: Member;
  isSelf: boolean;
  onRequestRoleToggle: (member: Member) => void;
  onRequestPasswordReset: (member: Member) => void;
}

export default function MemberActionsMenu({
  member,
  isSelf,
  onRequestRoleToggle,
  onRequestPasswordReset,
}: MemberActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 0, openUp: false });

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
    const close = () => setOpen(false);
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  function handleToggle() {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const openUp = window.innerHeight - rect.bottom < 120;
      setCoords({
        top: openUp ? rect.top - 4 : rect.bottom + 4,
        right: window.innerWidth - rect.right,
        openUp,
      });
    }
    setOpen((v) => !v);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="crm-icon-btn"
        aria-label={`Actions pour ${member.name}`}
        aria-expanded={open}
      >
        <IconMore size={15} />
      </button>

      {open && (
        <div
          ref={menuRef}
          className="crm-dropdown"
          style={{
            position: 'fixed',
            top: coords.top,
            right: coords.right,
            transform: coords.openUp ? 'translateY(-100%)' : undefined,
            minWidth: 200,
            zIndex: 1200,
          }}
        >
          {!isSelf && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onRequestRoleToggle(member);
              }}
              className="crm-dropdown-item"
            >
              {member.role === 'Admin' ? 'Passer en Membre' : 'Nommer Admin'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onRequestPasswordReset(member);
            }}
            className="crm-dropdown-item crm-dropdown-item--danger"
          >
            Réinitialiser le mot de passe
          </button>
        </div>
      )}
    </>
  );
}