'use client';

import { useState, useEffect } from 'react';
import PlayerGameStatus from '../components/PlayerGameStatus';

// Mock player data
const mockPlayer = {
  first_name: "LeBron",
  last_name: "James",
  position: "F",
  team: {
    id: 14, // Lakers ID
    full_name: "Los Angeles Lakers"
  }
};

// Helper to create ISO date strings
const createDateString = (daysOffset: number, hoursOffset: number = 0, baseDate?: Date): string => {
  const date = baseDate ? new Date(baseDate) : new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(date.getHours() + hoursOffset);
  return date.toISOString();
};

// Create mock games
const createMockGames = (dateOffset: number = 0) => {
  // Create a base date that we can offset for testing
  const baseDate = new Date();
  if (dateOffset !== 0) {
    baseDate.setDate(baseDate.getDate() + dateOffset);
  }
  
  // Past game (yesterday relative to base date)
  const pastGame = {
    id: 1001,
    date: createDateString(-1, 0, baseDate),
    home_team: {
      id: 14, // Lakers
      abbreviation: "LAL",
      full_name: "Los Angeles Lakers"
    },
    home_team_score: 115,
    visitor_team: {
      id: 16, // Miami
      abbreviation: "MIA",
      full_name: "Miami Heat"
    },
    visitor_team_score: 110,
    played: true,
    status: "Final",
    period: 4,
    stats: {
      pts: 28,
      reb: 11,
      ast: 8,
      stl: 2,
      blk: 1
    }
  };

  // Very recent game (within last 3 hours)
  const recentGame = {
    id: 1002,
    date: createDateString(0, -1, baseDate), // Today, 1 hour ago
    home_team: {
      id: 14, // Lakers
      abbreviation: "LAL",
      full_name: "Los Angeles Lakers"
    },
    home_team_score: 121,
    visitor_team: {
      id: 7, // Pistons
      abbreviation: "DET",
      full_name: "Detroit Pistons"
    },
    visitor_team_score: 118,
    played: true,
    status: "Final",
    period: 4,
    stats: {
      pts: 30,
      reb: 8,
      ast: 11,
      stl: 1,
      blk: 2
    }
  };

  // Live game (happening now)
  const liveGame = {
    id: 1003,
    date: createDateString(0, 0, baseDate), // Today
    home_team: {
      id: 16, // Miami
      abbreviation: "MIA",
      full_name: "Miami Heat"
    },
    home_team_score: 78,
    visitor_team: {
      id: 14, // Lakers
      abbreviation: "LAL",
      full_name: "Los Angeles Lakers"
    },
    visitor_team_score: 82,
    played: false,
    status: "In Progress",
    time: "5:42",
    period: 3,
    stats: {
      pts: 22,
      reb: 6,
      ast: 5,
      stl: 1,
      blk: 0
    }
  };

  // Upcoming game today
  const todayGame = {
    id: 1004,
    date: createDateString(0, 3, baseDate), // Today, 3 hours from now
    home_team: {
      id: 14, // Lakers
      abbreviation: "LAL",
      full_name: "Los Angeles Lakers"
    },
    home_team_score: 0,
    visitor_team: {
      id: 1, // Atlanta
      abbreviation: "ATL",
      full_name: "Atlanta Hawks"
    },
    visitor_team_score: 0,
    played: false,
    status: "8:00 PM ET",
    stats: null
  };

  // Tomorrow's game
  const tomorrowGame = {
    id: 1005,
    date: createDateString(1, 0, baseDate), // Tomorrow
    home_team: {
      id: 2, // Boston
      abbreviation: "BOS", 
      full_name: "Boston Celtics"
    },
    home_team_score: 0,
    visitor_team: {
      id: 14, // Lakers
      abbreviation: "LAL",
      full_name: "Los Angeles Lakers"
    },
    visitor_team_score: 0,
    played: false,
    status: "7:30 PM ET",
    stats: null
  };

  // Future game (next week)
  const futureGame = {
    id: 1006,
    date: createDateString(7, 0, baseDate), // 7 days from now
    home_team: {
      id: 14, // Lakers
      abbreviation: "LAL",
      full_name: "Los Angeles Lakers"
    },
    home_team_score: 0,
    visitor_team: {
      id: 20, // Knicks
      abbreviation: "NYK",
      full_name: "New York Knicks"
    },
    visitor_team_score: 0,
    played: false,
    status: "10:00 PM ET",
    stats: null
  };

  return [pastGame, recentGame, liveGame, todayGame, tomorrowGame, futureGame];
};

// Format date for display
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};

// Test page component
export default function TestPlayerGameStatus() {
  const [testScenario, setTestScenario] = useState<string>('all');
  const [dateOffset, setDateOffset] = useState<number>(0);
  const [games, setGames] = useState(createMockGames(0));
  const [currentTestDate, setCurrentTestDate] = useState<Date>(new Date());
  
  // Update games when date offset changes
  useEffect(() => {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + dateOffset);
    setCurrentTestDate(newDate);
    setGames(createMockGames(dateOffset));
  }, [dateOffset]);
  
  // Filter games based on test scenario
  const getFilteredGames = () => {
    switch(testScenario) {
      case 'live':
        return games.filter(game => game.status === "In Progress");
      case 'recent':
        return [games[1]]; // Just the recent game
      case 'today':
        return [games[3]]; // Just today's upcoming game
      case 'tomorrow':
        return [games[4]]; // Just tomorrow's game
      case 'future':
        return [games[5]]; // Just the future game
      case 'past-only':
        return [games[0], games[1]]; // Only past games
      case 'no-games':
        return [];
      default:
        return games;
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">PlayerGameStatus Component Test</h1>
      
      <div className="bg-charcoal-800 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-medium mb-3">Test Controls</h2>
        
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-2">Test Scenario:</label>
            <select 
              className="w-full p-2 rounded bg-charcoal-700 text-white"
              value={testScenario}
              onChange={(e) => setTestScenario(e.target.value)}
            >
              <option value="all">All Games Available</option>
              <option value="live">Live Game Only</option>
              <option value="recent">Recent Game Only</option>
              <option value="today">Today's Game Only</option>
              <option value="tomorrow">Tomorrow's Game Only</option>
              <option value="future">Future Game Only</option>
              <option value="past-only">Past Games Only</option>
              <option value="no-games">No Games</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Time Machine (Current Date):</label>
            <div className="flex items-center">
              <button 
                onClick={() => setDateOffset(dateOffset - 1)}
                className="bg-blue-600 text-white px-3 py-1 rounded-l"
              >
                -1 Day
              </button>
              <div className="bg-charcoal-700 px-3 py-1 flex-grow text-center">
                {formatDate(currentTestDate)}
              </div>
              <button 
                onClick={() => setDateOffset(dateOffset + 1)}
                className="bg-blue-600 text-white px-3 py-1 rounded-r"
              >
                +1 Day
              </button>
            </div>
            <button 
              onClick={() => setDateOffset(0)}
              className="mt-2 bg-charcoal-600 text-white px-3 py-1 rounded w-full text-sm"
            >
              Reset to Today
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-charcoal-900 rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">
          {mockPlayer.first_name} {mockPlayer.last_name}
        </h2>
        
        <div className="mb-4">
          <p className="text-sm text-gray-400 mb-1">Team: {mockPlayer.team.full_name}</p>
          <p className="text-sm text-gray-400">Position: {mockPlayer.position}</p>
        </div>
        
        <div className="border-t border-charcoal-700 pt-4">
          <h3 className="text-sm font-medium mb-2">Game Status:</h3>
          <PlayerGameStatus player={mockPlayer} recentGames={getFilteredGames()} />
        </div>
        
        <div className="mt-6 pt-4 border-t border-charcoal-700">
          <h3 className="text-sm font-medium mb-2">Debug Information:</h3>
          <div className="bg-charcoal-800 p-3 rounded text-xs font-mono">
            <p>Current Test Date: {formatDate(currentTestDate)}</p>
            <p>Date Offset: {dateOffset} days</p>
            <p>Player Team ID: {mockPlayer.team.id}</p>
            <p>Available Games: {getFilteredGames().length}</p>
            <p className="mt-2">Check browser console for detailed debug output</p>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-charcoal-700">
          <h3 className="text-sm font-medium mb-2">Available Games List:</h3>
          <div className="bg-charcoal-800 p-3 rounded text-xs">
            {getFilteredGames().map((game, index) => (
              <div key={game.id} className="mb-2 pb-2 border-b border-charcoal-700 last:border-b-0">
                <div className="flex justify-between">
                  <span>Game {index + 1} (ID: {game.id})</span>
                  <span className="text-blue-400">{new Date(game.date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>{game.home_team.abbreviation} vs {game.visitor_team.abbreviation}</span>
                  <span>{game.status}</span>
                </div>
              </div>
            ))}
            {getFilteredGames().length === 0 && (
              <p className="text-gray-500 italic">No games available for this scenario</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 