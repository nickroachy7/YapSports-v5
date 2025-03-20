"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Player } from '../types/player';
import { useRouter } from 'next/navigation';

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Handle clicks outside of dropdown to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch players when search query changes
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setPlayers([]);
      setShowDropdown(false);
      return;
    }

    // Debounce search requests
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/players/search?query=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        setPlayers(data.players || []);
        setShowDropdown(true);
      } catch (error) {
        console.error('Error fetching players:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement full search functionality if needed
    console.log('Searching for:', searchQuery);
  };

  const handlePlayerSelect = (player: Player) => {
    setSearchQuery(`${player.first_name} ${player.last_name}`);
    setShowDropdown(false);
    // Navigate to player details page
    router.push(`/player/${player.id}`);
  };

  return (
    <header className="sticky top-0 z-10 bg-charcoal-900 border-b border-charcoal-600">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo/Project Name */}
        <Link href="/" className="text-2xl font-bold text-grey-400 hover:text-white transition-colors">
          YapSports
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center space-x-6 ml-8">
          <Link href="/" className="text-grey-400 hover:text-white transition-colors">
            Home
          </Link>
          <Link href="/game" className="text-grey-400 hover:text-white transition-colors">
            Game
          </Link>
        </div>

        {/* Search Bar */}
        <div className="relative w-full max-w-md mx-4">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <input
                type="text"
                placeholder="Search NBA players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-charcoal-700 border border-charcoal-600 rounded-lg py-2 px-4 pl-10 
                          text-grey-500 placeholder-grey-800 focus:outline-none focus:ring-2 
                          focus:ring-grey-700 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg 
                  className="h-5 w-5 text-grey-800" 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" 
                    clipRule="evenodd" 
                  />
                </svg>
              </div>
            </div>
          </form>

          {/* Dropdown Results */}
          {showDropdown && (
            <div 
              ref={dropdownRef}
              className="absolute mt-1 w-full bg-charcoal-700 border border-charcoal-600 rounded-lg shadow-lg max-h-80 overflow-y-auto z-20"
            >
              {isLoading ? (
                <div className="p-4 text-center text-grey-600">
                  Loading...
                </div>
              ) : players.length > 0 ? (
                <ul>
                  {players.map((player) => (
                    <li 
                      key={player.id}
                      onClick={() => handlePlayerSelect(player)}
                      className="px-4 py-3 hover:bg-charcoal-600 cursor-pointer border-b border-charcoal-600 last:border-0 transition-colors"
                    >
                      <div className="flex items-center">
                        <div>
                          <div className="font-medium text-grey-400">
                            {player.first_name} {player.last_name}
                          </div>
                          <div className="text-sm text-grey-700">
                            {player.team.full_name} • {player.position || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 text-center text-grey-600">
                  No players found
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right section - can be used for navigation or other controls */}
        <div className="flex items-center space-x-4">
          {/* Future nav items or controls can go here */}
        </div>
      </div>
    </header>
  );
} 