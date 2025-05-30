"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/components/auth/AuthProvider';
import { supabase } from '@/app/services/supabaseService';
import PageFilterBar from '@/app/components/PageFilterBar';
import Leaderboard from '@/app/components/Leaderboard';

interface Team {
  id: string;
  name: string;
  description: string;
  created_at: string;
  last_active: string;
  lineup_count: number;
  total_points: number;
  best_rank: number;
  league: 'nba' | 'nfl' | 'mlb' | 'nhl';
  is_active: boolean;
  has_claimed_starter?: boolean;
  // Card counts
  base_cards?: number;
  role_player_cards?: number;
  starter_cards?: number;
  all_star_cards?: number;
  legendary_cards?: number;
}

interface Contest {
  id: string;
  name: string;
  description: string;
  league: 'nba' | 'nfl' | 'mlb' | 'nhl';
  entry_fee: number;
  prize_pool: number;
  max_entries: number;
  current_entries: number;
  start_time: string;
  end_time: string;
  status: 'available' | 'upcoming' | 'live' | 'completed';
  user_entered?: boolean;
}

interface Lineup {
  id: string;
  name: string;
  team_id: string;
  team_name: string;
  contest_id: string;
  contest_name: string;
  contest_status: 'upcoming' | 'live' | 'completed';
  league: 'nba' | 'nfl' | 'mlb' | 'nhl';
  entry_fee: number;
  prize_pool: number;
  created_at: string;
  submitted_at: string;
  current_points?: number;
  current_rank?: number;
  final_points?: number;
  final_rank?: number;
  prize_won?: number;
  players: {
    position: string;
    player_name: string;
    points?: number;
  }[];
}

// Mock teams data for development
const MOCK_TEAMS: Team[] = [
  {
    id: '1',
    name: 'Championship Squad',
    description: 'My main team for daily competitions',
    created_at: '2024-01-15',
    last_active: '2024-01-25',
    lineup_count: 15,
    total_points: 2450,
    best_rank: 23,
    league: 'nba',
    is_active: true,
    has_claimed_starter: true,
    base_cards: 25,
    role_player_cards: 18,
    starter_cards: 8,
    all_star_cards: 3,
    legendary_cards: 1
  },
  {
    id: '2',
    name: 'Rookie Experiment',
    description: 'Testing young players and sleepers',
    created_at: '2024-01-20',
    last_active: '2024-01-24',
    lineup_count: 8,
    total_points: 1200,
    best_rank: 156,
    league: 'nba',
    is_active: true,
    has_claimed_starter: false,
    base_cards: 32,
    role_player_cards: 12,
    starter_cards: 4,
    all_star_cards: 1,
    legendary_cards: 0
  },
  {
    id: '3',
    name: 'High Risk High Reward',
    description: 'All-in on explosive players',
    created_at: '2024-01-10',
    last_active: '2024-01-22',
    lineup_count: 12,
    total_points: 1890,
    best_rank: 8,
    league: 'nba',
    is_active: false,
    has_claimed_starter: true,
    base_cards: 15,
    role_player_cards: 8,
    starter_cards: 12,
    all_star_cards: 6,
    legendary_cards: 2
  },
  {
    id: '4',
    name: 'NFL Powerhouse',
    description: 'Dominating the gridiron',
    created_at: '2024-01-12',
    last_active: '2024-01-23',
    lineup_count: 10,
    total_points: 1650,
    best_rank: 45,
    league: 'nfl',
    is_active: true,
    has_claimed_starter: true,
    base_cards: 28,
    role_player_cards: 15,
    starter_cards: 7,
    all_star_cards: 2,
    legendary_cards: 1
  },
  {
    id: '5',
    name: 'Baseball Legends',
    description: 'Home run heroes',
    created_at: '2024-01-18',
    last_active: '2024-01-21',
    lineup_count: 6,
    total_points: 980,
    best_rank: 89,
    league: 'mlb',
    is_active: true,
    has_claimed_starter: false,
    base_cards: 22,
    role_player_cards: 9,
    starter_cards: 3,
    all_star_cards: 1,
    legendary_cards: 0
  }
];

// Mock contests data
const MOCK_CONTESTS: Contest[] = [
  {
    id: 'c1',
    name: 'NBA Daily Showdown',
    description: 'Daily NBA contest with top prizes',
    league: 'nba',
    entry_fee: 10,
    prize_pool: 1000,
    max_entries: 100,
    current_entries: 67,
    start_time: '2024-01-26T19:00:00Z',
    end_time: '2024-01-27T02:00:00Z',
    status: 'available',
    user_entered: false
  },
  {
    id: 'c2',
    name: 'NFL Championship Week',
    description: 'Big money NFL contest',
    league: 'nfl',
    entry_fee: 25,
    prize_pool: 5000,
    max_entries: 200,
    current_entries: 156,
    start_time: '2024-01-28T13:00:00Z',
    end_time: '2024-01-29T01:00:00Z',
    status: 'available',
    user_entered: false
  },
  {
    id: 'c3',
    name: 'Live NBA Thriller',
    description: 'Currently running NBA contest',
    league: 'nba',
    entry_fee: 15,
    prize_pool: 2000,
    max_entries: 150,
    current_entries: 150,
    start_time: '2024-01-25T19:00:00Z',
    end_time: '2024-01-26T02:00:00Z',
    status: 'available',
    user_entered: false
  }
];

// No mock lineup data - will be populated when users enter contests

const LEAGUE_INFO = {
  nba: { name: 'NBA', icon: '🏀', color: 'orange' },
  nfl: { name: 'NFL', icon: '🏈', color: 'green' },
  mlb: { name: 'MLB', icon: '⚾', color: 'blue' },
  nhl: { name: 'NHL', icon: '🏒', color: 'purple' }
};

type TabType = 'my-teams' | 'available' | 'upcoming' | 'live' | 'completed';

export default function TeamsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [lineups, setLineups] = useState<Lineup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<TabType>('my-teams');
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
    league: 'nba' as keyof typeof LEAGUE_INFO
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        // Use mock data when not signed in
        setTeams(MOCK_TEAMS);
        setContests(MOCK_CONTESTS);
        setLineups([]); // No mock lineups - will be populated when users enter contests
        setIsLoading(false);
        return;
      }

      try {
        // Try to fetch teams from API
        const response = await fetch('/api/teams');
        const data = await response.json();

        if (data.success) {
          setTeams(data.teams || []);
        } else {
          console.log('Teams API not available yet, using mock data');
          setTeams(MOCK_TEAMS);
        }

        // For now, always use mock data for contests
        setContests(MOCK_CONTESTS);
        setLineups([]); // No mock lineups - will be populated when users enter contests
      } catch (error) {
        console.error('Error fetching data:', error);
        console.log('Using mock data as fallback');
        setTeams(MOCK_TEAMS);
        setContests(MOCK_CONTESTS);
        setLineups([]); // No mock lineups - will be populated when users enter contests
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleCreateTeam = async () => {
    if (!newTeam.name.trim()) return;

    if (user) {
      try {
        // Try to create team via API
        const response = await fetch('/api/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newTeam.name,
            description: newTeam.description,
            league: newTeam.league
          })
        });

        const data = await response.json();

        if (data.success) {
          // Successfully created via API
          setTeams([data.team, ...teams]);
          setNewTeam({ name: '', description: '', league: 'nba' });
          setShowCreateModal(false);
          
          // Automatically navigate to the new team's game page
          router.push(`/game?team=${data.team.id}`);
          return;
        } else {
          console.error('Failed to create team via API:', data.error);
          
          // Show specific error message
          if (data.error.includes('Database not set up')) {
            alert('Database not ready yet. The team will be created locally for now.\n\nTo save teams permanently, please run the database migration first.');
            // Fall through to local creation
          } else {
            alert(`Failed to create team: ${data.error}`);
            return;
          }
        }
      } catch (error) {
        console.error('Error creating team via API:', error);
        alert('Network error. The team will be created locally for now.');
        // Fall through to local creation
      }
    }

    // Fallback to local creation (for non-authenticated users or API failures)
    const team: Team = {
      id: Date.now().toString(),
      name: newTeam.name,
      description: newTeam.description,
      created_at: new Date().toISOString(),
      last_active: new Date().toISOString(),
      lineup_count: 0,
      total_points: 0,
      best_rank: 0,
      league: newTeam.league,
      is_active: true,
      has_claimed_starter: false
    };

    setTeams([team, ...teams]);
    setNewTeam({ name: '', description: '', league: 'nba' });
    setShowCreateModal(false);
    
    // Automatically navigate to the new team's game page
    router.push(`/game?team=${team.id}`);
  };

  const handleContestJoin = (contestId: string) => {
    // TODO: Implement contest joining logic
    console.log('Joining contest:', contestId);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getContestStatusColor = (status: Contest['status']) => {
    switch (status) {
      case 'available': return 'text-green-400';
      case 'upcoming': return 'text-blue-400';
      case 'live': return 'text-red-400';
      case 'completed': return 'text-grey-400';
      default: return 'text-grey-400';
    }
  };

  const getContestStatusBg = (status: Contest['status']) => {
    switch (status) {
      case 'available': return 'bg-green-600/20';
      case 'upcoming': return 'bg-blue-600/20';
      case 'live': return 'bg-red-600/20';
      case 'completed': return 'bg-grey-600/20';
      default: return 'bg-grey-600/20';
    }
  };

  const handleTeamClick = (teamId: string) => {
    router.push(`/game?team=${teamId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getLeagueColor = (league: keyof typeof LEAGUE_INFO) => {
    const colors = {
      nba: 'orange',
      nfl: 'green',
      mlb: 'blue',
      nhl: 'purple'
    };
    return colors[league];
  };

  // Filter teams by selected league
  const filteredTeams = selectedLeague === 'all' 
    ? teams 
    : teams.filter(team => team.league === selectedLeague);

  // Filter contests by league (for available tab)
  const getFilteredContests = () => {
    let filtered = contests.filter(contest => contest.status === 'available');
    if (selectedLeague !== 'all') {
      filtered = filtered.filter(contest => contest.league === selectedLeague);
    }
    return filtered;
  };

  // Filter lineups by contest status and league
  const getFilteredLineups = () => {
    let filtered = lineups.filter(lineup => lineup.contest_status === activeTab);
    if (selectedLeague !== 'all') {
      filtered = filtered.filter(lineup => lineup.league === selectedLeague);
    }
    return filtered;
  };

  const filteredContests = getFilteredContests();
  const filteredLineups = getFilteredLineups();

  // Get tab counts
  const getTabCounts = () => {
    const counts = {
      'my-teams': teams.length,
      'available': contests.filter(c => c.status === 'available').length,
      'upcoming': lineups.filter(l => l.contest_status === 'upcoming').length,
      'live': lineups.filter(l => l.contest_status === 'live').length,
      'completed': lineups.filter(l => l.contest_status === 'completed').length,
    };
    return counts;
  };

  const tabCounts = getTabCounts();

  if (isLoading) {
    return (
      <main className="min-h-screen flex flex-col bg-charcoal-900">
        <div className="container mx-auto px-4 py-8 flex-grow flex items-center justify-center">
          <div className="text-grey-400">Loading teams...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-charcoal-900">
      <div className="container mx-auto px-4 py-8 flex-grow">
        {/* League Filter Section */}
        <PageFilterBar
          filters={[
            { id: 'all', label: 'All', icon: '🌐' },
            { id: 'nba', label: 'NBA', icon: '🏀' },
            { id: 'nfl', label: 'NFL', icon: '🏈' },
            { id: 'mlb', label: 'MLB', icon: '⚾' },
            { id: 'mls', label: 'MLS', icon: '⚽', available: false },
            { id: 'nhl', label: 'NHL', icon: '🏒' },
          ]}
          selectedFilter={selectedLeague}
          onFilterChange={setSelectedLeague}
          showAddButton={activeTab === 'my-teams'}
          onAddButtonClick={() => setShowCreateModal(true)}
          addButtonLabel="Create"
        />
        
        {/* Filter Results Info */}
        {selectedLeague !== 'all' && (
          <div className="container mx-auto px-4 -mt-4 mb-4">
            <div className="text-sm text-grey-400">
              {activeTab === 'my-teams' 
                ? `Showing ${filteredTeams.length} ${selectedLeague.toUpperCase()} team${filteredTeams.length !== 1 ? 's' : ''}`
                : activeTab === 'available'
                ? `Showing ${getFilteredContests().length} ${selectedLeague.toUpperCase()} contest${getFilteredContests().length !== 1 ? 's' : ''}`
                : `Showing ${getFilteredLineups().length} ${selectedLeague.toUpperCase()} lineup${getFilteredLineups().length !== 1 ? 's' : ''}`
              }
            </div>
          </div>
        )}

        {/* Two-column layout - Content left aligned, Larger leaderboard right */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left column - Main Content (aligned with header) */}
          <div className="flex-1 lg:max-w-5xl">
            {/* Tab Navigation */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Primary Tabs - My Teams & Available Contests */}
                <div className="flex flex-wrap sm:flex-nowrap space-x-1 bg-charcoal-800/50 p-1 rounded-xl border border-charcoal-700">
                  {[
                    { id: 'my-teams', label: 'My Teams', icon: '👥' },
                    { id: 'available', label: 'Available Contests', icon: '🎯' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className={`flex items-center space-x-2 px-4 sm:px-6 py-3 rounded-lg transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'text-grey-400 hover:text-white hover:bg-charcoal-700/50'
                      }`}
                    >
                      <span className="text-lg">{tab.icon}</span>
                      <span className="font-medium text-sm sm:text-base">{tab.label}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        activeTab === tab.id
                          ? 'bg-white/20 text-white'
                          : 'bg-charcoal-600 text-grey-300'
                      }`}>
                        {tabCounts[tab.id as keyof typeof tabCounts]}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Secondary Tabs - Lineup Status */}
                <div className="flex flex-wrap sm:flex-nowrap space-x-1 bg-charcoal-800/50 p-1 rounded-xl border border-charcoal-700">
                  {[
                    { id: 'upcoming', label: 'Upcoming', icon: '⏰' },
                    { id: 'live', label: 'Live', icon: '🔴' },
                    { id: 'completed', label: 'Completed', icon: '✅' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className={`flex items-center space-x-2 px-3 sm:px-4 py-3 rounded-lg transition-all duration-200 ${
                        activeTab === tab.id
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'text-grey-400 hover:text-white hover:bg-charcoal-700/50'
                      }`}
                    >
                      <span className="text-lg">{tab.icon}</span>
                      <span className="font-medium text-xs sm:text-sm">{tab.label}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        activeTab === tab.id
                          ? 'bg-white/20 text-white'
                          : 'bg-charcoal-600 text-grey-300'
                      }`}>
                        {tabCounts[tab.id as keyof typeof tabCounts]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Content Area */}
            {activeTab === 'my-teams' ? (
              // Teams List
              filteredTeams.length > 0 ? (
                <div className="space-y-4">
                  {filteredTeams.map((team) => (
                    <div
                      key={team.id}
                      onClick={() => handleTeamClick(team.id)}
                      className="group relative bg-charcoal-700/50 border border-charcoal-600 rounded-xl p-6 hover:bg-charcoal-700/70 transition-all duration-200 hover:border-blue-500/50 hover:shadow-xl flex items-center space-x-6 cursor-pointer"
                    >
                      {/* Team Icon */}
                      <div className="flex-shrink-0">
                        <div className={`w-12 h-12 rounded-lg bg-${getLeagueColor(team.league)}-600/20 flex items-center justify-center`}>
                          <span className="text-2xl">{LEAGUE_INFO[team.league].icon}</span>
                        </div>
                      </div>

                      {/* Team Info */}
                      <div className="flex-grow">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                            {team.name}
                          </h3>
                          <div className="flex items-center space-x-3">
                            {/* League Badge */}
                            <div className="text-sm text-grey-400 font-medium">
                              {LEAGUE_INFO[team.league].name}
                            </div>
                            {/* Status Badge */}
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                              team.is_active 
                                ? 'bg-green-600/20 text-green-400' 
                                : 'bg-grey-600/20 text-grey-400'
                            }`}>
                              {team.is_active ? 'Active' : 'Inactive'}
                            </div>
                          </div>
                        </div>
                        
                        {/* Team Description */}
                        {team.description && (
                          <p className="text-grey-400 text-sm mb-3">
                            {team.description}
                          </p>
                        )}

                        {/* Team Stats Row */}
                        <div className="flex items-center space-x-6 text-sm">
                          <div className="flex items-center space-x-1">
                            <span className="text-grey-400">Points:</span>
                            <span className="text-yellow-400 font-medium">{team.total_points.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-grey-400">Best Rank:</span>
                            <span className="text-green-400 font-medium">
                              {team.best_rank > 0 ? `#${team.best_rank}` : '-'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-grey-400">Last Active:</span>
                            <span className="text-grey-300 font-medium">{formatDate(team.last_active)}</span>
                          </div>
                        </div>

                        {/* Card Counts Row */}
                        <div className="flex items-center space-x-4 text-xs mt-2">
                          <div className="flex items-center space-x-1">
                            <span className="text-grey-500">Base:</span>
                            <span className="text-grey-300 font-medium">{team.base_cards || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-grey-500">Role:</span>
                            <span className="text-cyan-400 font-medium">{team.role_player_cards || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-grey-500">Starter:</span>
                            <span className="text-indigo-400 font-medium">{team.starter_cards || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-grey-500">All-Star:</span>
                            <span className="text-yellow-400 font-medium">{team.all_star_cards || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span className="text-grey-500">Legendary:</span>
                            <span className="text-pink-400 font-medium">{team.legendary_cards || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Starter Pack Status */}
                      <div className="flex-shrink-0">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          team.has_claimed_starter 
                            ? 'bg-blue-600/20 text-blue-400' 
                            : 'bg-green-600/20 text-green-400'
                        }`}>
                          {team.has_claimed_starter ? (
                            <>
                              <span className="mr-1">🏆</span>
                              Starter Pack Claimed
                            </>
                          ) : (
                            <>
                              <span className="mr-1">🎁</span>
                              FREE Starter Pack
                            </>
                          )}
                        </div>
                      </div>

                      {/* Hover Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl pointer-events-none" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-charcoal-700/50 flex items-center justify-center">
                    <svg className="w-12 h-12 text-grey-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  {selectedLeague === 'all' ? (
                    <>
                      <h3 className="text-xl font-bold text-white mb-2">No Teams Yet</h3>
                      <p className="text-grey-400 mb-6">Create your first team to start building lineups and competing!</p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all transform hover:scale-105 shadow-lg"
                      >
                        Create Your First Team
                      </button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-xl font-bold text-white mb-2">
                        No {selectedLeague.toUpperCase()} Teams
                      </h3>
                      <p className="text-grey-400 mb-6">
                        You don't have any {selectedLeague.toUpperCase()} teams yet. 
                        Create one to start competing in {selectedLeague.toUpperCase()}!
                      </p>
                      <div className="flex gap-3 justify-center">
                        <button
                          onClick={() => {
                            // Map the league filter IDs to the team creation league IDs
                            const leagueMapping: Record<string, keyof typeof LEAGUE_INFO> = {
                              'nba': 'nba',
                              'nfl': 'nfl', 
                              'mlb': 'mlb',
                              'nhl': 'nhl'
                            };
                            const mappedLeague = leagueMapping[selectedLeague] || 'nba';
                            setNewTeam({ ...newTeam, league: mappedLeague });
                            setShowCreateModal(true);
                          }}
                          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all transform hover:scale-105 shadow-lg"
                        >
                          Create {selectedLeague.toUpperCase()} Team
                        </button>
                        <button
                          onClick={() => setSelectedLeague('all')}
                          className="px-6 py-3 bg-charcoal-700 hover:bg-charcoal-600 text-white rounded-xl transition-all"
                        >
                          View All Teams
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            ) : activeTab === 'available' ? (
              // Available Contest Lists
              filteredContests.length > 0 ? (
                <div className="space-y-4">
                  {filteredContests.map((contest) => (
                    <div
                      key={contest.id}
                      className="group relative bg-charcoal-700/50 border border-charcoal-600 rounded-xl p-6 hover:bg-charcoal-700/70 transition-all duration-200 hover:border-blue-500/50 hover:shadow-xl"
                    >
                      <div className="flex items-center justify-between">
                        {/* Contest Info */}
                        <div className="flex-grow">
                          <div className="flex items-center space-x-4 mb-3">
                            {/* League Icon */}
                            <div className={`w-10 h-10 rounded-lg bg-${getLeagueColor(contest.league)}-600/20 flex items-center justify-center`}>
                              <span className="text-xl">{LEAGUE_INFO[contest.league].icon}</span>
                            </div>
                            
                            {/* Contest Name and Status */}
                            <div className="flex-grow">
                              <div className="flex items-center space-x-3">
                                <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                                  {contest.name}
                                </h3>
                                <div className={`px-3 py-1 rounded-full text-xs font-medium ${getContestStatusBg(contest.status)} ${getContestStatusColor(contest.status)}`}>
                                  {contest.status.charAt(0).toUpperCase() + contest.status.slice(1)}
                                </div>
                                {contest.user_entered && (
                                  <div className="px-2 py-1 rounded-full text-xs font-medium bg-blue-600/20 text-blue-400">
                                    Entered
                                  </div>
                                )}
                              </div>
                              <p className="text-grey-400 text-sm mt-1">{contest.description}</p>
                            </div>
                          </div>

                          {/* Contest Details */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-grey-400">Entry Fee:</span>
                              <div className="text-green-400 font-medium">${contest.entry_fee}</div>
                            </div>
                            <div>
                              <span className="text-grey-400">Prize Pool:</span>
                              <div className="text-yellow-400 font-medium">${contest.prize_pool.toLocaleString()}</div>
                            </div>
                            <div>
                              <span className="text-grey-400">Entries:</span>
                              <div className="text-blue-400 font-medium">{contest.current_entries}/{contest.max_entries}</div>
                            </div>
                            <div>
                              <span className="text-grey-400">
                                {contest.status === 'available' ? 'Starts:' : 
                                 contest.status === 'upcoming' ? 'Starts:' :
                                 contest.status === 'live' ? 'Ends:' : 'Ended:'}
                              </span>
                              <div className="text-grey-300 font-medium">
                                {formatDateTime(contest.status === 'live' ? contest.end_time : contest.start_time)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="flex-shrink-0 ml-6">
                          {contest.status === 'available' && !contest.user_entered && (
                            <button
                              onClick={() => handleContestJoin(contest.id)}
                              className="px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-xl transition-all transform hover:scale-105 shadow-lg"
                            >
                              Join Contest
                            </button>
                          )}
                          {contest.status === 'upcoming' && contest.user_entered && (
                            <div className="px-6 py-3 bg-blue-600/20 text-blue-400 rounded-xl text-center">
                              <div className="font-medium">Registered</div>
                              <div className="text-xs">Waiting to start</div>
                            </div>
                          )}
                          {contest.status === 'live' && contest.user_entered && (
                            <button
                              onClick={() => router.push(`/contest/${contest.id}`)}
                              className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-xl transition-all transform hover:scale-105 shadow-lg"
                            >
                              View Live
                            </button>
                          )}
                          {contest.status === 'completed' && contest.user_entered && (
                            <button
                              onClick={() => router.push(`/contest/${contest.id}/results`)}
                              className="px-6 py-3 bg-charcoal-600 hover:bg-charcoal-500 text-white rounded-xl transition-all"
                            >
                              View Results
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar for Available Contests */}
                      {contest.status === 'available' && (
                        <div className="mt-4">
                          <div className="flex justify-between text-xs text-grey-400 mb-1">
                            <span>Contest Filling</span>
                            <span>{Math.round((contest.current_entries / contest.max_entries) * 100)}% Full</span>
                          </div>
                          <div className="w-full bg-charcoal-600 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${(contest.current_entries / contest.max_entries) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Hover Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl pointer-events-none" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-charcoal-700/50 flex items-center justify-center">
                    <svg className="w-12 h-12 text-grey-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    No Available Contests
                  </h3>
                  <p className="text-grey-400 mb-6">
                    {selectedLeague === 'all' 
                      ? 'No available contests found.'
                      : `No available ${selectedLeague.toUpperCase()} contests found.`}
                  </p>
                  {selectedLeague !== 'all' && (
                    <button
                      onClick={() => setSelectedLeague('all')}
                      className="px-6 py-3 bg-charcoal-700 hover:bg-charcoal-600 text-white rounded-xl transition-all"
                    >
                      View All Contests
                    </button>
                  )}
                </div>
              )
            ) : (
              // Lineup Lists (Upcoming, Live, Completed)
              filteredLineups.length > 0 ? (
                <div className="space-y-4">
                  {filteredLineups.map((lineup) => (
                    <div
                      key={lineup.id}
                      className="group relative bg-charcoal-700/50 border border-charcoal-600 rounded-xl p-6 hover:bg-charcoal-700/70 transition-all duration-200 hover:border-blue-500/50 hover:shadow-xl"
                    >
                      <div className="flex items-center justify-between">
                        {/* Lineup Info */}
                        <div className="flex-grow">
                          <div className="flex items-center space-x-4 mb-3">
                            {/* League Icon */}
                            <div className={`w-10 h-10 rounded-lg bg-${getLeagueColor(lineup.league)}-600/20 flex items-center justify-center`}>
                              <span className="text-xl">{LEAGUE_INFO[lineup.league].icon}</span>
                            </div>
                            
                            {/* Lineup Name and Status */}
                            <div className="flex-grow">
                              <div className="flex items-center space-x-3">
                                <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                                  {lineup.name}
                                </h3>
                                <div className={`px-3 py-1 rounded-full text-xs font-medium ${getContestStatusBg(lineup.contest_status)} ${getContestStatusColor(lineup.contest_status)}`}>
                                  {lineup.contest_status.charAt(0).toUpperCase() + lineup.contest_status.slice(1)}
                                </div>
                              </div>
                              <p className="text-grey-400 text-sm mt-1">
                                {lineup.team_name} • {lineup.contest_name}
                              </p>
                            </div>
                          </div>

                          {/* Lineup Details */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                            <div>
                              <span className="text-grey-400">Entry Fee:</span>
                              <div className="text-green-400 font-medium">${lineup.entry_fee}</div>
                            </div>
                            <div>
                              <span className="text-grey-400">Prize Pool:</span>
                              <div className="text-yellow-400 font-medium">${lineup.prize_pool.toLocaleString()}</div>
                            </div>
                            {lineup.contest_status === 'live' && (
                              <>
                                <div>
                                  <span className="text-grey-400">Current Points:</span>
                                  <div className="text-blue-400 font-medium">{lineup.current_points}</div>
                                </div>
                                <div>
                                  <span className="text-grey-400">Current Rank:</span>
                                  <div className="text-purple-400 font-medium">#{lineup.current_rank}</div>
                                </div>
                              </>
                            )}
                            {lineup.contest_status === 'completed' && (
                              <>
                                <div>
                                  <span className="text-grey-400">Final Points:</span>
                                  <div className="text-blue-400 font-medium">{lineup.final_points}</div>
                                </div>
                                <div>
                                  <span className="text-grey-400">Final Rank:</span>
                                  <div className="text-purple-400 font-medium">#{lineup.final_rank}</div>
                                </div>
                              </>
                            )}
                            {lineup.contest_status === 'upcoming' && (
                              <>
                                <div>
                                  <span className="text-grey-400">Submitted:</span>
                                  <div className="text-grey-300 font-medium">{formatDateTime(lineup.submitted_at)}</div>
                                </div>
                                <div>
                                  <span className="text-grey-400">Players:</span>
                                  <div className="text-blue-400 font-medium">{lineup.players.length}</div>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Player List */}
                          <div className="flex flex-wrap gap-2">
                            {lineup.players.map((player, index) => (
                              <div key={index} className="flex items-center space-x-2 bg-charcoal-600/50 px-3 py-1 rounded-lg text-xs">
                                <span className="text-grey-400 font-medium">{player.position}:</span>
                                <span className="text-white">{player.player_name}</span>
                                {player.points && (
                                  <span className="text-green-400 font-medium">({player.points})</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="flex-shrink-0 ml-6">
                          {lineup.contest_status === 'upcoming' && (
                            <button
                              onClick={() => router.push(`/lineup/${lineup.id}/edit`)}
                              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all transform hover:scale-105 shadow-lg"
                            >
                              Edit Lineup
                            </button>
                          )}
                          {lineup.contest_status === 'live' && (
                            <button
                              onClick={() => router.push(`/contest/${lineup.contest_id}/live`)}
                              className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white rounded-xl transition-all transform hover:scale-105 shadow-lg"
                            >
                              View Live
                            </button>
                          )}
                          {lineup.contest_status === 'completed' && (
                            <div className="text-center">
                              {lineup.prize_won && lineup.prize_won > 0 ? (
                                <div className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl">
                                  <div className="font-bold">Won!</div>
                                  <div className="text-sm">${lineup.prize_won}</div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => router.push(`/contest/${lineup.contest_id}/results`)}
                                  className="px-6 py-3 bg-charcoal-600 hover:bg-charcoal-500 text-white rounded-xl transition-all"
                                >
                                  View Results
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Hover Effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl pointer-events-none" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-charcoal-700/50 flex items-center justify-center">
                    <svg className="w-12 h-12 text-grey-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    No {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Lineups
                  </h3>
                  <p className="text-grey-400 mb-6">
                    {activeTab === 'upcoming' 
                      ? 'You haven\'t entered any contests yet. Join available contests to see your upcoming lineups here.'
                      : activeTab === 'live'
                      ? 'No lineups currently competing. Enter contests to track your live performance here.'
                      : 'No completed lineups yet. Your finished contest results will appear here.'}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setActiveTab('available')}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all transform hover:scale-105 shadow-lg"
                    >
                      Browse Contests
                    </button>
                    {selectedLeague !== 'all' && (
                      <button
                        onClick={() => setSelectedLeague('all')}
                        className="px-6 py-3 bg-charcoal-700 hover:bg-charcoal-600 text-white rounded-xl transition-all"
                      >
                        View All Leagues
                      </button>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
          
          {/* Right column - Larger Leaderboard */}
          <div className="lg:w-96 xl:w-[28rem] self-start">
            <Leaderboard pageType="teams" />
          </div>
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-charcoal-800 rounded-xl p-6 w-full max-w-md border border-charcoal-700">
            <h2 className="text-xl font-bold text-white mb-4">Create New Team</h2>
            
            <div className="space-y-4">
              {/* Team Name */}
              <div>
                <label className="block text-sm font-medium text-grey-300 mb-2">
                  Team Name *
                </label>
                <input
                  type="text"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  placeholder="Enter team name"
                  className="w-full px-3 py-2 bg-charcoal-700 border border-charcoal-600 rounded-lg text-white placeholder-grey-400 focus:outline-none focus:border-blue-500"
                  maxLength={50}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-grey-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newTeam.description}
                  onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  placeholder="Describe your team strategy (optional)"
                  rows={3}
                  className="w-full px-3 py-2 bg-charcoal-700 border border-charcoal-600 rounded-lg text-white placeholder-grey-400 focus:outline-none focus:border-blue-500 resize-none"
                  maxLength={200}
                />
              </div>

              {/* League Selection */}
              <div>
                <label className="block text-sm font-medium text-grey-300 mb-2">
                  League
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(LEAGUE_INFO).map(([key, info]) => (
                    <button
                      key={key}
                      onClick={() => setNewTeam({ ...newTeam, league: key as keyof typeof LEAGUE_INFO })}
                      className={`flex items-center justify-center p-3 rounded-lg border transition-all ${
                        newTeam.league === key
                          ? 'border-blue-500 bg-blue-600/20 text-blue-400'
                          : 'border-charcoal-600 bg-charcoal-700/50 text-grey-400 hover:border-grey-500'
                      }`}
                    >
                      <span className="text-lg mr-2">{info.icon}</span>
                      <span className="font-medium">{info.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 bg-charcoal-700 text-grey-300 rounded-lg hover:bg-charcoal-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTeam}
                disabled={!newTeam.name.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Team
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
} 