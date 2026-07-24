import React, { useState, useRef, useEffect } from 'react';
import type { User } from '../types';
import { UsersIcon } from './icons/UsersIcon';
import { CheckIcon } from './icons/CheckIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { teamsService } from '../services/teamsService';
import { useAuth } from '../contexts/AuthContext';

interface TeamSwitcherProps {
  user: User;
  onSwitchTeam: (teamId: string | null) => void;
}

export const TeamSwitcher: React.FC<TeamSwitcherProps> = ({ user, onSwitchTeam }) => {
  const { refreshTeams } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [panel, setPanel] = useState<'list' | 'create' | 'invite'>('list');
  const [teamName, setTeamName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'manager'>('member');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const teams = user.teams || [];
  const currentTeam = teams.find(t => t.id === user.currentTeamId);
  const currentWorkspaceName = currentTeam ? currentTeam.name : 'Przestrzeń osobista';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setPanel('list');
        setMessage(null);
        setError(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (teamId: string | null) => {
    onSwitchTeam(teamId);
    setIsOpen(false);
    setPanel('list');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const team = await teamsService.create(teamName.trim());
      await refreshTeams();
      onSwitchTeam(team.id);
      setTeamName('');
      setMessage(`Zespół „${team.name}” utworzony.`);
      setPanel('list');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się utworzyć zespołu');
    } finally {
      setBusy(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeam) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await teamsService.invite(currentTeam.id, inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setMessage(
        result.status === 'added'
          ? `${result.email} dodany do zespołu.`
          : `Zaproszenie wysłane do ${result.email}.`
      );
      await refreshTeams();
      setPanel('list');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się zaprosić');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(p => !p)}
        className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <div className="flex items-center justify-center w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded">
            {currentTeam ? <UsersIcon className="w-4 h-4 text-gray-600 dark:text-gray-300"/> : <UserCircleIcon className="w-4 h-4 text-gray-600 dark:text-gray-300"/>}
        </div>
        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[90px] xl:max-w-[120px]">{currentWorkspaceName}</span>
        <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 animate-fade-in" style={{animationDuration: '150ms'}}>
          <div className="p-2">
            {panel === 'list' && (
              <>
                <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase">Wybierz przestrzeń</p>
                <ul>
                  <li>
                    <button onClick={() => handleSelect(null)} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-md transition-colors">
                      <UserCircleIcon className="w-5 h-5"/>
                      <span className="flex-grow">Przestrzeń osobista</span>
                      {user.currentTeamId === null && <CheckIcon className="w-5 h-5 text-blue-500" />}
                    </button>
                  </li>
                  {teams.length > 0 && <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />}
                  {teams.map(team => (
                    <li key={team.id}>
                      <button onClick={() => handleSelect(team.id)} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-md transition-colors">
                        <UsersIcon className="w-5 h-5"/>
                        <span className="flex-grow truncate">{team.name}</span>
                        {user.currentTeamId === team.id && <CheckIcon className="w-5 h-5 text-blue-500" />}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="my-2 h-px bg-gray-200 dark:bg-gray-700" />
                <button
                  type="button"
                  onClick={() => { setPanel('create'); setError(null); setMessage(null); }}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-md"
                >
                  + Utwórz zespół
                </button>
                {currentTeam && (
                  <button
                    type="button"
                    onClick={() => { setPanel('invite'); setError(null); setMessage(null); }}
                    className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-md"
                  >
                    Zaproś członka…
                  </button>
                )}
              </>
            )}

            {panel === 'create' && (
              <form onSubmit={handleCreate} className="space-y-2 px-1">
                <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase">Nowy zespół</p>
                <input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Nazwa zespołu"
                  required
                  minLength={2}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPanel('list')} className="flex-1 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">Wstecz</button>
                  <button type="submit" disabled={busy || teamName.trim().length < 2} className="flex-1 py-2 text-sm font-semibold rounded-md bg-blue-600 text-white disabled:opacity-50">Utwórz</button>
                </div>
              </form>
            )}

            {panel === 'invite' && currentTeam && (
              <form onSubmit={handleInvite} className="space-y-2 px-1">
                <p className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase">Zaproś do „{currentTeam.name}”</p>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@firma.pl"
                  required
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'member' | 'manager')}
                  className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                >
                  <option value="member">Członek</option>
                  <option value="manager">Manager</option>
                </select>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPanel('list')} className="flex-1 py-2 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">Wstecz</button>
                  <button type="submit" disabled={busy || !inviteEmail} className="flex-1 py-2 text-sm font-semibold rounded-md bg-blue-600 text-white disabled:opacity-50">Zaproś</button>
                </div>
              </form>
            )}

            {error && <p className="px-3 py-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
            {message && <p className="px-3 py-2 text-xs text-green-600 dark:text-green-400">{message}</p>}
          </div>
        </div>
      )}
    </div>
  );
};
