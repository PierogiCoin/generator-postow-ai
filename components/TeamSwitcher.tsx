import React, { useState, useRef, useEffect } from 'react';
import type { User } from '../types';
import { UsersIcon } from './icons/UsersIcon';
import { CheckIcon } from './icons/CheckIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';

interface TeamSwitcherProps {
  user: User;
  onSwitchTeam: (teamId: string | null) => void;
}

export const TeamSwitcher: React.FC<TeamSwitcherProps> = ({ user, onSwitchTeam }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const teams = user.teams || [];
  const currentTeam = teams.find(t => t.id === user.currentTeamId);
  const currentWorkspaceName = currentTeam ? currentTeam.name : 'Przestrzeń osobista';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (teamId: string | null) => {
    onSwitchTeam(teamId);
    setIsOpen(false);
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
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[140px]">{currentWorkspaceName}</span>
        <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-60 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 animate-fade-in" style={{animationDuration: '150ms'}}>
          <div className="p-2">
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
                    <span className="flex-grow">{team.name}</span>
                    {user.currentTeamId === team.id && <CheckIcon className="w-5 h-5 text-blue-500" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};