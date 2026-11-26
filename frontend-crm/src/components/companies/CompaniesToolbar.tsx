import { useRef, useState } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { SORT_LABELS, type SortKey } from '../../lib/companiesFilter';
import { ALL_STATUSES, getStatusLabel, getStatusVars } from '../../lib/status';
import type { Member, SharkStatus } from '../../types';
import { IconCheck, IconChevronDown, IconClose, IconSearch, IconSort } from '../ui/Icons';

interface CompaniesToolbarProps {
  searchQuery: string;
  selectedStatuses: SharkStatus[];
  ownerFilter: string;
  sortKey: SortKey;
  members: Member[];
  currentUserId?: string;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onToggleStatus: (status: SharkStatus) => void;
  onClearStatuses: () => void;
  onOwnerChange: (owner: string) => void;
  onSortChange: (sort: SortKey) => void;
  onResetAll: () => void;
}

export default function CompaniesToolbar({
  searchQuery,
  selectedStatuses,
  ownerFilter,
  sortKey,
  members,
  currentUserId,
  hasActiveFilters,
  onSearchChange,
  onToggleStatus,
  onClearStatuses,
  onOwnerChange,
  onSortChange,
  onResetAll,
}: CompaniesToolbarProps) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const statusRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useClickOutside(statusRef, () => setStatusOpen(false), statusOpen);
  useClickOutside(sortRef, () => setSortOpen(false), sortOpen);

  return (
    <div
      className="crm-card"
      style={{
        padding: '10px 12px',
        marginBottom: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      {/* Recherche nom + secteur */}
      <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 200 }}>
        <IconSearch
          size={14}
          color="var(--text-tertiary)"
          style={{
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          className="crm-input"
          placeholder="Filtrer par nom ou secteur…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            height: 32,
            paddingLeft: 32,
            paddingRight: searchQuery ? 28 : 11,
            fontSize: 13,
          }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Effacer la recherche"
            style={{
              position: 'absolute',
              right: 6,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'var(--text-tertiary)',
              display: 'inline-flex',
              padding: 3,
            }}
          >
            <IconClose size={12} />
          </button>
        )}
      </div>

      {/* Menu multi-statuts */}
      <div style={{ position: 'relative' }} ref={statusRef}>
        <button
          type="button"
          onClick={() => setStatusOpen((v) => !v)}
          className="crm-btn crm-btn-secondary crm-btn-sm"
          style={{
            height: 32,
            borderColor: selectedStatuses.length > 0 ? 'var(--accent-subtle-border)' : undefined,
            background: selectedStatuses.length > 0 ? 'var(--accent-subtle-bg)' : undefined,
            color: selectedStatuses.length > 0 ? 'var(--accent-text)' : undefined,
          }}
        >
          <span>
            Statut{selectedStatuses.length > 0 ? ` (${selectedStatuses.length})` : ''}
          </span>
          <IconChevronDown size={11} />
        </button>

        {statusOpen && (
          <div
            className="crm-dropdown"
            style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 210, zIndex: 50 }}
          >
            {ALL_STATUSES.map((status) => {
              const checked = selectedStatuses.includes(status);
              const vars = getStatusVars(status);
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => onToggleStatus(status)}
                  className="crm-dropdown-item"
                  style={{
                    justifyContent: 'space-between',
                    background: checked ? 'var(--bg-subtle)' : undefined,
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: vars.text }} />
                    <span>{getStatusLabel(status)}</span>
                  </span>
                  {checked && <IconCheck size={13} color="var(--accent-text)" />}
                </button>
              );
            })}
            {selectedStatuses.length > 0 && (
              <>
                <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
                <button
                  type="button"
                  onClick={onClearStatuses}
                  className="crm-dropdown-item crm-dropdown-item--danger"
                >
                  Effacer les statuts
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Sélecteur responsable */}
      <select
        aria-label="Filtrer par responsable"
        className="crm-select"
        value={ownerFilter}
        onChange={(e) => onOwnerChange(e.target.value)}
        style={{ width: 'auto', minWidth: 165, height: 32, fontSize: 12.5 }}
      >
        <option value="all">Tous les responsables</option>
        {currentUserId && <option value="me">Mes attributions</option>}
        {members
          .filter((m) => m.id !== currentUserId)
          .map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
      </select>

      {/* Menu de tri */}
      <div style={{ position: 'relative' }} ref={sortRef}>
        <button
          type="button"
          onClick={() => setSortOpen((v) => !v)}
          className="crm-btn crm-btn-secondary crm-btn-sm"
          style={{ height: 32 }}
        >
          <IconSort size={12} color="var(--text-tertiary)" />
          <span>{SORT_LABELS[sortKey]}</span>
        </button>

        {sortOpen && (
          <div
            className="crm-dropdown"
            style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 190, zIndex: 50 }}
          >
            {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([key, label]) => {
              const active = sortKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onSortChange(key);
                    setSortOpen(false);
                  }}
                  className="crm-dropdown-item"
                  style={{
                    justifyContent: 'space-between',
                    background: active ? 'var(--bg-subtle)' : undefined,
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  <span>{label}</span>
                  {active && <IconCheck size={13} color="var(--accent-text)" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={onResetAll}
          className="crm-btn crm-btn-ghost crm-btn-sm"
          style={{ height: 32, color: 'var(--text-tertiary)' }}
        >
          Réinitialiser
        </button>
      )}
    </div>
  );
}