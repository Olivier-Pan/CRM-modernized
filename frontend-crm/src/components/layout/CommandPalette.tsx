import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listCompanies } from '../../api/companies';
import { toggleTheme } from '../../hooks/useTheme';
import { SHARK_STATUS_LABELS, type Company, type SharkStatus } from '../../types';

interface CommandPaletteProps {
  open: boolean;
  isAdmin?: boolean;
  onClose: () => void;
  onOpenAddCompany: () => void;
}

interface CommandItem {
  id: string;
  group: 'Actions rapides' | 'Entreprises';
  label: string;
  meta?: string;
  onSelect: () => void;
}

export default function CommandPalette({
  open,
  isAdmin,
  onClose,
  onOpenAddCompany,
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    listCompanies()
      .then(setCompanies)
      .catch(() => setCompanies([]));
  }, [open]);

  const items = useMemo<CommandItem[]>(() => {
    const q = query.trim().toLowerCase();

    const quickActions: CommandItem[] = [
      {
        id: 'act-add',
        group: 'Actions rapides',
        label: 'Nouvelle entreprise',
        meta: 'Créer',
        onSelect: () => {
          onClose();
          onOpenAddCompany();
        },
      },
      {
        id: 'act-dashboard',
        group: 'Actions rapides',
        label: 'Aller au Dashboard',
        meta: 'Navigation',
        onSelect: () => {
          onClose();
          navigate('/dashboard');
        },
      },
      {
        id: 'act-companies',
        group: 'Actions rapides',
        label: 'Toutes les entreprises',
        meta: 'Navigation',
        onSelect: () => {
          onClose();
          navigate('/companies');
        },
      },
      {
        id: 'act-my-companies',
        group: 'Actions rapides',
        label: 'Mes attributions',
        meta: 'Filtre',
        onSelect: () => {
          onClose();
          navigate('/companies?owner=me');
        },
      },
      ...(isAdmin
        ? [
            {
              id: 'act-team',
              group: 'Actions rapides' as const,
              label: "Gérer l'équipe",
              meta: 'Admin',
              onSelect: () => {
                onClose();
                navigate('/team');
              },
            },
          ]
        : []),
      {
        id: 'act-theme',
        group: 'Actions rapides',
        label: 'Basculer le thème clair / sombre',
        meta: 'Affichage',
        onSelect: () => {
          toggleTheme();
          onClose();
        },
      },
    ];

    const filteredActions = q
      ? quickActions.filter((a) => a.label.toLowerCase().includes(q))
      : quickActions;

    const matchedCompanies: CommandItem[] = companies
      .filter((c) => {
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          (c.sector || '').toLowerCase().includes(q)
        );
      })
      .slice(0, q ? 8 : 5)
      .map((c) => ({
        id: `company-${c.id}`,
        group: 'Entreprises',
        label: c.name,
        meta: SHARK_STATUS_LABELS[c.global_status as SharkStatus] || c.global_status,
        onSelect: () => {
          onClose();
          navigate(`/companies/${c.id}`);
        },
      }));

    return q ? [...matchedCompanies, ...filteredActions] : [...matchedCompanies, ...filteredActions];
  }, [query, companies, isAdmin, navigate, onClose, onOpenAddCompany]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (items.length ? (prev + 1) % items.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (items.length ? (prev - 1 + items.length) % items.length : 0));
      } else if (e.key === 'Enter' && items[activeIndex]) {
        e.preventDefault();
        items[activeIndex].onSelect();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, items, activeIndex, onClose]);

  if (!open) return null;

  return (
    <div
      className="crm-modal-backdrop"
      style={{ alignItems: 'flex-start', paddingTop: '12vh' }}
      onClick={onClose}
    >
      <div
        className="crm-modal"
        style={{ maxWidth: 540 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 14px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-tertiary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une entreprise ou une action…"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: 14,
            }}
          />
          <span className="crm-kbd">ESC</span>
        </div>

        <div style={{ maxHeight: 360, overflowY: 'auto', padding: 6 }}>
          {items.length === 0 ? (
            <div
              style={{
                padding: '24px 12px',
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--text-tertiary)',
              }}
            >
              Aucun résultat pour « {query} ».
            </div>
          ) : (
            items.map((item, idx) => {
              const showHeader = idx === 0 || items[idx - 1].group !== item.group;
              const isSelected = idx === activeIndex;

              return (
                <React.Fragment key={item.id}>
                  {showHeader && (
                    <div
                      style={{
                        padding: '8px 10px 4px',
                        fontSize: 10.5,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      {item.group}
                    </div>
                  )}
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={item.onSelect}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 6,
                      border: 'none',
                      background: isSelected ? 'var(--bg-hover)' : 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: 13.5,
                      fontWeight: 500,
                      textAlign: 'left',
                    }}
                  >
                    <span>{item.label}</span>
                    {item.meta && (
                      <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                        {item.meta}
                      </span>
                    )}
                  </button>
                </React.Fragment>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}