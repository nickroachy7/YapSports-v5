import { Player } from '../../types/player';

interface GameStats {
  game: { id: number };
  min: string;
  fgm: number;
  fga: number;
  fg_pct: number;
  fg3m: number;
  fg3a: number;
  fg3_pct: number;
  ftm: number;
  fta: number;
  ft_pct: number;
  oreb: number;
  dreb: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  turnover: number;
  pf: number;
  pts: number;
}

interface Game {
  id: number;
  date: string;
  home_team: {
    id: number;
    abbreviation: string;
    city: string;
    name: string;
    full_name: string;
  };
  home_team_score: number;
  visitor_team: {
    id: number;
    abbreviation: string;
    city: string;
    name: string;
    full_name: string;
  };
  visitor_team_score: number;
  played: boolean;
  stats: GameStats | null;
  needsRecentCheck?: boolean;
}

interface GameLogProps {
  games: Game[];
  player: Player;
}

export default function GameLog({ games, player }: GameLogProps) {
  // Helper function to determine if a game should be considered played
  const isGameEffectivelyPlayed = (game: Game): boolean => {
    try {
      const rawGameDate = game.date;
      if (rawGameDate.includes('-')) {
        const gameDateParts = rawGameDate.split('T')[0].split('-');
        if (gameDateParts.length === 3) {
          const year = parseInt(gameDateParts[0]);
          const month = parseInt(gameDateParts[1]) - 1;
          const day = parseInt(gameDateParts[2]);
          
          const gameDate = new Date(Date.UTC(year, month, day));
          const now = new Date();
          const today = new Date(Date.UTC(
            now.getFullYear(),
            now.getMonth(), 
            now.getDate()
          ));
          
          const datePassed = gameDate < today;
          const hasScores = game.home_team_score > 0 || game.visitor_team_score > 0;
          return (game.played && datePassed) || (datePassed && hasScores);
        }
      }
      return game.played;
    } catch (error) {
      console.error(`Error determining if game ${game.id} is played:`, error);
      return game.played;
    }
  };

  // Helper function to parse and format game date properly
  const formatGameDate = (dateString: string): string => {
    try {
      const rawGameDate = dateString;
      
      // Create date with correct timezone adjustment
      // For ISO format strings (YYYY-MM-DD)
      if (rawGameDate.includes('-')) {
        const gameDateParts = rawGameDate.split('T')[0].split('-');
        if (gameDateParts.length === 3) {
          const year = parseInt(gameDateParts[0]);
          const month = parseInt(gameDateParts[1]) - 1; // Months are 0-indexed
          const day = parseInt(gameDateParts[2]);
          
          // Use UTC date to avoid timezone issues
          const gameDate = new Date(Date.UTC(year, month, day));
          
          return gameDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC' // Use UTC to keep the date consistent
          });
        }
      }
      
      // Fallback for other date formats
      const gameDate = new Date(rawGameDate);
      return gameDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      console.error(`Error formatting date ${dateString}:`, error);
      return "Date unavailable";
    }
  };

  return (
    <div className="bg-charcoal-700 rounded-xl shadow-lg p-6 mb-8">
      <div className="mb-4">
        <h2 className="text-2xl font-semibold text-grey-400">
          2024-2025 Season Game Log
        </h2>
      </div>
      
      {games.length > 0 ? (
        <>
          <div className="mb-4 flex flex-wrap gap-3 items-center">
            <span className="text-grey-500">
              <span className="font-semibold">{games.length}</span> total games
            </span>
            <span className="text-grey-500">|</span>
            <span className="text-grey-500">
              <span className="font-semibold">
                {games.filter(g => isGameEffectivelyPlayed(g)).length}
              </span> played
            </span>
            <span className="text-grey-500">|</span>
            <span className="text-grey-500">
              <span className="font-semibold">
                {games.filter(g => !isGameEffectivelyPlayed(g)).length}
              </span> upcoming
            </span>
            
            {/* Help text about dates */}
            <span className="text-grey-500 ml-2">|</span>
            <span className="text-xs text-grey-600 italic">
              All dates shown in UTC
            </span>
            
            <div className="ml-auto flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
              <span className="text-grey-600 text-sm">Win</span>
              <span className="inline-block w-3 h-3 rounded-full bg-red-500 ml-2"></span>
              <span className="text-grey-600 text-sm">Loss</span>
              <span className="inline-block w-3 h-3 rounded-full bg-blue-500 ml-2"></span>
              <span className="text-grey-600 text-sm">Upcoming</span>
              <span className="inline-block w-3 h-3 rounded-full bg-orange-500 ml-2"></span>
              <span className="text-grey-600 text-sm">Updating</span>
            </div>
          </div>
        
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-charcoal-600 text-grey-500">
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Match</th>
                  <th className="p-3 text-center">Result</th>
                  <th className="p-3 text-center">MIN</th>
                  <th className="p-3 text-center">PTS</th>
                  <th className="p-3 text-center">REB</th>
                  <th className="p-3 text-center">AST</th>
                  <th className="p-3 text-center">STL</th>
                  <th className="p-3 text-center">BLK</th>
                  <th className="p-3 text-center">TO</th>
                  <th className="p-3 text-center">FG</th>
                  <th className="p-3 text-center">3PT</th>
                  <th className="p-3 text-center">FT</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => {
                  // Format the date using our helper function
                  const formattedDate = formatGameDate(game.date);
                  
                  // Determine if game should be considered played
                  const effectivelyPlayed = isGameEffectivelyPlayed(game);
                  
                  const isHome = player?.team?.id === game.home_team.id;
                  const opponent = isHome ? game.visitor_team : game.home_team;
                  const playerTeam = isHome ? game.home_team : game.visitor_team;
                  const playerTeamScore = isHome ? game.home_team_score : game.visitor_team_score;
                  const opponentScore = isHome ? game.visitor_team_score : game.home_team_score;
                  
                  // Update the result logic to handle 0-0 games better
                  let result = '-';
                  let statusClass = '';
                  
                  if (effectivelyPlayed) {
                    if (playerTeamScore === 0 && opponentScore === 0) {
                      // Game is marked as played but has 0-0 score (data not updated yet)
                      result = game.needsRecentCheck ? 'Updating...' : 'TBD';
                      statusClass = game.needsRecentCheck ? 'text-orange-500' : 'text-grey-500';
                    } else if (playerTeamScore > opponentScore) {
                      result = 'W';
                      statusClass = 'text-green-500';
                    } else if (playerTeamScore < opponentScore) {
                      result = 'L';
                      statusClass = 'text-red-500';
                    } else {
                      result = 'T';
                      statusClass = 'text-grey-500';
                    }
                  }
                  
                  // Determine row styling based on game status
                  let rowClass = "border-b border-charcoal-600 hover:bg-charcoal-650 transition-colors";
                  if (!effectivelyPlayed) {
                    rowClass += " bg-charcoal-650/30"; // Slightly different background for upcoming games
                  } else if (playerTeamScore === 0 && opponentScore === 0) {
                    if (game.needsRecentCheck) {
                      rowClass += " bg-charcoal-650/40 border-l-2 border-l-orange-500"; // Highlight for games being refreshed
                    } else {
                      rowClass += " bg-charcoal-650/20"; // Different background for games needing score updates
                    }
                  }
                  
                  return (
                    <tr key={game.id} className={rowClass}>
                      <td className="p-3 text-grey-500">{formattedDate}</td>
                      <td className="p-3 text-grey-500">
                        {isHome ? 'vs ' : '@ '}
                        {opponent.abbreviation}
                      </td>
                      <td className="p-3 text-center">
                        {effectivelyPlayed ? (
                          <span className={`font-medium ${statusClass}`}>
                            {playerTeamScore === 0 && opponentScore === 0 
                              ? `${result}`
                              : `${result} ${playerTeamScore}-${opponentScore}`}
                          </span>
                        ) : (
                          <span className="text-blue-500 font-medium">Upcoming</span>
                        )}
                      </td>
                      {effectivelyPlayed && game.stats ? (
                        <>
                          <td className="p-3 text-center text-grey-500">{game.stats.min}</td>
                          <td className="p-3 text-center text-grey-500">{game.stats.pts}</td>
                          <td className="p-3 text-center text-grey-500">{game.stats.reb}</td>
                          <td className="p-3 text-center text-grey-500">{game.stats.ast}</td>
                          <td className="p-3 text-center text-grey-500">{game.stats.stl}</td>
                          <td className="p-3 text-center text-grey-500">{game.stats.blk}</td>
                          <td className="p-3 text-center text-grey-500">{game.stats.turnover}</td>
                          <td className="p-3 text-center text-grey-500">{game.stats.fgm}/{game.stats.fga}</td>
                          <td className="p-3 text-center text-grey-500">{game.stats.fg3m}/{game.stats.fg3a}</td>
                          <td className="p-3 text-center text-grey-500">{game.stats.ftm}/{game.stats.fta}</td>
                        </>
                      ) : (
                        <>
                          <td className="p-3 text-center text-grey-600">-</td>
                          <td className="p-3 text-center text-grey-600">-</td>
                          <td className="p-3 text-center text-grey-600">-</td>
                          <td className="p-3 text-center text-grey-600">-</td>
                          <td className="p-3 text-center text-grey-600">-</td>
                          <td className="p-3 text-center text-grey-600">-</td>
                          <td className="p-3 text-center text-grey-600">-</td>
                          <td className="p-3 text-center text-grey-600">-</td>
                          <td className="p-3 text-center text-grey-600">-</td>
                          <td className="p-3 text-center text-grey-600">-</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-grey-600 text-center">No games available for this player in the 2024-2025 season.</p>
      )}
    </div>
  );
} 