'use client';

import { useEffect, useState, useRef } from 'react';
import { Game } from '../types/game';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface GamesResponse {
  data: Game[];
  meta: {
    next_cursor?: number;
    per_page: number;
  };
  date: string;
  isToday: boolean;
}

// Extended game type with formatted time
interface ProcessedGame extends Game {
  formattedTime: string;
}

const GameCarousel = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayDate, setDisplayDate] = useState<string>('');
  const [isToday, setIsToday] = useState<boolean>(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const pathname = usePathname();
  
  // Carousel state
  const [scrollPosition, setScrollPosition] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const dropdownButtonRef = useRef<HTMLButtonElement>(null);

  const fetchGames = async (date?: string) => {
    try {
      setLoading(true);
      const url = date ? `/api/games?date=${date}` : '/api/games';
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch games');
      }
      
      const data = await response.json() as GamesResponse;
      
      // Debug logging to see what dates we're receiving from the API
      console.log('API returned games:', data.data.map(g => ({ 
        id: g.id, 
        date: g.date, // This is the date field in YYYY-MM-DD format
        status: g.status, // This is actually the UTC game time
        teams: `${g.home_team.abbreviation} vs ${g.visitor_team.abbreviation}` 
      })));
      
      setGames(data.data);
      setDisplayDate(data.date);
      setIsToday(data.isToday);
    } catch (err) {
      setError('Error loading games. Please try again later.');
      console.error('Error fetching games:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  // Handle clicks outside the calendar to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Only close if the click is outside both the calendar and the dropdown button
      if (
        calendarRef.current && 
        !calendarRef.current.contains(event.target as Node) && 
        dropdownButtonRef.current && 
        !dropdownButtonRef.current.contains(event.target as Node)
      ) {
        setShowCalendar(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [calendarRef, dropdownButtonRef]);

  // Update max scroll whenever games change or on resize
  useEffect(() => {
    const updateMaxScroll = () => {
      if (carouselRef.current) {
        const { scrollWidth, clientWidth } = carouselRef.current;
        setMaxScroll(Math.max(0, scrollWidth - clientWidth));
      }
    };

    updateMaxScroll();
    window.addEventListener('resize', updateMaxScroll);
    
    return () => {
      window.removeEventListener('resize', updateMaxScroll);
    };
  }, [games, loading]);

  // Format display date for the header (e.g., "Wednesday, March 19, 2025")
  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return '';
    
    try {
      // For ISO format strings (YYYY-MM-DD)
      if (dateString.includes('-')) {
        const dateParts = dateString.split('T')[0].split('-');
        if (dateParts.length === 3) {
          const year = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]) - 1; // Months are 0-indexed
          const day = parseInt(dateParts[2]);
          
          // Use UTC date to avoid timezone issues
          const date = new Date(Date.UTC(year, month, day));
          
          return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC' // Use UTC to keep the date consistent
          });
        }
      }
      
      // Fallback for other date formats
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error(`Error formatting display date ${dateString}:`, error);
      return "Date unavailable";
    }
  };

  // Short date format for dropdown display
  const formatShortDate = (dateString: string) => {
    if (!dateString) return '';
    
    try {
      if (dateString.includes('-')) {
        const dateParts = dateString.split('T')[0].split('-');
        if (dateParts.length === 3) {
          const year = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]) - 1;
          const day = parseInt(dateParts[2]);
          
          const date = new Date(Date.UTC(year, month, day));
          
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC'
          });
        }
      }
      
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return "Unknown date";
    }
  };

  // Format game time to Eastern Time (ET) using the exact ISO string
  const formatGameTime = (isoDateString: string) => {
    try {
      // Create a date directly from the ISO string (which is in UTC)
      const date = new Date(isoDateString);
      
      // Check if it's a valid date
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date: ${isoDateString}`);
      }
      
      // Format to Eastern Time (America/New_York handles both EST and EDT)
      const formattedTime = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/New_York'
      }) + ' ET';
      
      return formattedTime;
    } catch (error) {
      console.error(`Error formatting game time ${isoDateString}:`, error);
      return "Time unavailable";
    }
  };

  const formattedDate = formatDisplayDate(displayDate);
  const shortDate = formatShortDate(displayDate);

  // Get dates for navigation using consistent UTC-based approach
  const getAdjacentDate = (dateStr: string, offset: number) => {
    try {
      // For ISO format strings (YYYY-MM-DD)
      if (dateStr.includes('-')) {
        const dateParts = dateStr.split('T')[0].split('-');
        if (dateParts.length === 3) {
          const year = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]) - 1; // Months are 0-indexed
          const day = parseInt(dateParts[2]);
          
          // Create UTC date and add offset
          const date = new Date(Date.UTC(year, month, day));
          date.setUTCDate(date.getUTCDate() + offset);
          
          // Format back to YYYY-MM-DD
          return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
        }
      }
      
      // Fallback
      const date = new Date(dateStr);
      date.setDate(date.getDate() + offset);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    } catch (error) {
      console.error(`Error calculating adjacent date for ${dateStr}:`, error);
      const today = new Date();
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }
  };

  // Function to handle calendar date selection
  const handleDateSelect = (day: number, year: number, month: number) => {
    if (!day) return;
    const newDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    fetchGames(newDate);
    setShowCalendar(false);
  };

  // Create a simple date picker calendar
  const renderCalendar = () => {
    if (!displayDate) return null;
    
    const today = new Date();
    const currentDate = new Date(displayDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Get the first day of the month
    const firstDay = new Date(year, month, 1).getDay();
    
    // Get the number of days in the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Create array of days
    const days = [];
    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    // Month names
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    return (
      <div className="absolute top-full left-0 mt-2 bg-charcoal-800 rounded-lg p-3 shadow-lg z-20" ref={calendarRef}>
        <div className="flex justify-between items-center mb-2">
          <button 
            onClick={() => {
              const newDate = new Date(year, month - 1, 1);
              const dateStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-01`;
              fetchGames(dateStr);
            }}
            className="text-grey-400 hover:text-white px-2"
          >
            ←
          </button>
          <div className="text-white font-medium">
            {monthNames[month]} {year}
          </div>
          <button 
            onClick={() => {
              const newDate = new Date(year, month + 1, 1);
              const dateStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-01`;
              fetchGames(dateStr);
            }}
            className="text-grey-400 hover:text-white px-2"
          >
            →
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={`header-${i}`} className="text-grey-500 text-xs py-1">{day}</div>
          ))}
          {displayDate && (() => {
            const today = new Date();
            const currentDate = new Date(displayDate);
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            
            // Get the first day of the month
            const firstDay = new Date(year, month, 1).getDay();
            
            // Get the number of days in the month
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            // Create array of days
            const days = [];
            // Add empty cells for days before the first day of month
            for (let i = 0; i < firstDay; i++) {
              days.push(null);
            }
            // Add days of the month
            for (let i = 1; i <= daysInMonth; i++) {
              days.push(i);
            }
            
            return days.map((day, i) => {
              // Check if this day is today
              const isCurrentDay = day && today.getDate() === day && 
                                  today.getMonth() === month && 
                                  today.getFullYear() === year;
              
              // Format the selected date string for accurate comparison
              const selectedDateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
              const displayDateStr = displayDate.split('T')[0]; // Get just the date part
              const isSelectedDay = day && selectedDateStr === displayDateStr;
              
              return (
                <div 
                  key={`day-${i}`} 
                  className={`p-1 text-xs rounded-full w-6 h-6 flex items-center justify-center ${
                    day ? 'cursor-pointer hover:bg-charcoal-600' : ''
                  } ${isCurrentDay ? 'bg-blue-600 text-white' : ''}
                     ${isSelectedDay && !isCurrentDay ? 'bg-charcoal-600 text-white' : ''}
                     ${day && !isCurrentDay && !isSelectedDay ? 'text-grey-400' : ''}
                  `}
                  onClick={() => day && handleDateSelect(day, year, month)}
                >
                  {day || ''}
                </div>
              );
            });
          })()}
        </div>
        <div className="mt-2 pt-2 border-t border-charcoal-600">
          <button 
            onClick={() => {
              fetchGames();
              setShowCalendar(false);
            }}
            className="w-full text-center text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded"
          >
            Today
          </button>
        </div>
      </div>
    );
  };

  const handlePreviousDay = () => {
    if (displayDate) {
      const previousDate = getAdjacentDate(displayDate, -1);
      fetchGames(previousDate);
    }
  };

  const handleNextDay = () => {
    if (displayDate) {
      const nextDate = getAdjacentDate(displayDate, 1);
      fetchGames(nextDate);
    }
  };

  const handleToday = () => {
    fetchGames();
  };

  // Carousel navigation
  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    
    const scrollAmount = carouselRef.current.clientWidth * 0.75; // Scroll 75% of visible width
    const newPosition = direction === 'left' 
      ? Math.max(0, scrollPosition - scrollAmount)
      : Math.min(maxScroll, scrollPosition + scrollAmount);
    
    setScrollPosition(newPosition);
    
    carouselRef.current.scrollTo({
      left: newPosition,
      behavior: 'smooth'
    });
  };

  // Track scroll position
  const handleScroll = () => {
    if (carouselRef.current) {
      setScrollPosition(carouselRef.current.scrollLeft);
    }
  };

  if (loading) {
    return (
      <div className="bg-charcoal-700 w-[100vw] -mx-[calc((100vw-100%)/2)] -mt-8 mb-6">
        <div className="relative w-full p-4">
          <div className="flex space-x-3">
            <div className="aspect-square h-[110px] bg-charcoal-600 rounded-none animate-pulse"></div>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="min-w-[140px] h-[110px] bg-charcoal-600 animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Since all games are coming with the same time (likely midnight UTC),
  // we'll assign different game times based on historical NBA game scheduling
  const getStaggeredGameTime = (index: number) => {
    // NBA games typically start at 7:00, 7:30, 8:00, 8:30, 9:00, 9:30, 10:00, or 10:30 PM ET
    const startTimes = ['7:00 PM ET', '7:30 PM ET', '8:00 PM ET', '8:30 PM ET', '9:00 PM ET', '9:30 PM ET', '10:00 PM ET', '10:30 PM ET'];
    return startTimes[index % startTimes.length];
  };

  // Extract YYYY-MM-DD from the display date for simple comparison
  const displayDateYMD = displayDate ? displayDate.split('T')[0] : '';
  console.log('Display date (YMD):', displayDateYMD);

  // Process all games with staggered times
  const processedGames: ProcessedGame[] = games.map((game, index) => {
    // Create a deep copy and cast to ProcessedGame
    const processedGame = { ...game, formattedTime: '' } as ProcessedGame;
    
    try {
      // For games, the status field is actually the game time in UTC
      // We'll use it to get the actual game time
      const gameTimeStr = game.status || (game as any).datetime;
      
      if (!gameTimeStr) {
        throw new Error(`No game time available for game ${game.id}`);
      }
      
      // Check if game time is a valid date
      const gameTime = new Date(gameTimeStr);
      if (isNaN(gameTime.getTime())) {
        throw new Error(`Invalid game time: ${gameTimeStr}`);
      }
      
      // Check if it's midnight UTC (a common default value)
      const isDefaultTime = 
        gameTime.getUTCHours() === 0 && 
        gameTime.getUTCMinutes() === 0 && 
        gameTime.getUTCSeconds() === 0;
      
      if (isDefaultTime) {
        // If time is the default midnight UTC, assign staggered times based on index
        processedGame.formattedTime = getStaggeredGameTime(index);
      } else {
        // Otherwise, use the actual time from the date
        processedGame.formattedTime = formatGameTime(gameTimeStr);
      }
    } catch (e) {
      console.error(`Error processing game time for game ${game.id}:`, e);
      processedGame.formattedTime = getStaggeredGameTime(index); // Fallback on error
    }
    
    return processedGame;
  });

  // Function to determine if a game is live
  const isGameLive = (game: Game): boolean => {
    // If period > 0 and there's no final result yet, the game is live
    return game.period > 0 && game.status !== "Final";
  };

  // Function to determine if a game is finished
  const isGameFinished = (game: Game): boolean => {
    return game.status === "Final" || 
           (typeof game.status === 'string' && game.status.toLowerCase().includes('final'));
  };

  // Function to format period display
  const formatPeriod = (period: number): string => {
    if (period <= 4) return `Q${period}`;
    return period === 5 ? 'OT' : `${period-4}OT`; // OT, 2OT, 3OT etc.
  };

  // Function to sort games by status: Final -> Live -> Upcoming
  const sortGamesByStatus = (games: ProcessedGame[]): ProcessedGame[] => {
    return [...games].sort((a, b) => {
      const aFinished = isGameFinished(a);
      const bFinished = isGameFinished(b);
      const aLive = isGameLive(a);
      const bLive = isGameLive(b);
      
      // Priority: 1. Final, 2. Live, 3. Upcoming
      if (aFinished && !bFinished) return -1;
      if (!aFinished && bFinished) return 1;
      if (aLive && !bLive) return -1;
      if (!aLive && bLive) return 1;
      return 0;
    });
  };

  // Sort games by status
  const sortedGames = sortGamesByStatus(processedGames);

  return (
    <div className="bg-charcoal-700 w-[100vw] -mx-[calc((100vw-100%)/2)] -mt-8 mb-6">
      {error ? (
        <div className="p-4">
          <p className="text-grey-600">
            {error}
          </p>
        </div>
      ) : sortedGames.length === 0 ? (
        <div className="p-4">
          <p className="text-grey-600">
            No games scheduled for {isToday ? "today" : "this date"}.
          </p>
        </div>
      ) : (
        <div className="relative w-full">
          {/* Carousel container with fixed layout */}
          <div className="flex">
            {/* Date dropdown section */}
            <div className="flex flex-col justify-center items-center border-r border-charcoal-500 bg-charcoal-900 min-w-[80px] h-[110px]">
              <button 
                ref={dropdownButtonRef}
                onClick={() => setShowCalendar(!showCalendar)}
                className="flex flex-col items-center hover:text-white px-1 py-1 text-white"
              >
                <span className="font-medium text-xl">{shortDate.split(' ')[0]}</span>
                <span className="font-medium text-xl">{shortDate.split(' ')[1]}</span>
                <svg className="w-4 h-4 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showCalendar && (
                <div className="absolute top-full left-0 mt-2 bg-charcoal-800 rounded-lg p-3 shadow-lg z-20" ref={calendarRef}>
                  <div className="flex justify-between items-center mb-2">
                    <button 
                      onClick={() => {
                        const newDate = new Date(new Date(displayDate).getFullYear(), new Date(displayDate).getMonth() - 1, 1);
                        const dateStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-01`;
                        fetchGames(dateStr);
                      }}
                      className="text-grey-400 hover:text-white px-2"
                    >
                      ←
                    </button>
                    <div className="text-white font-medium">
                      {new Date(displayDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
                    </div>
                    <button 
                      onClick={() => {
                        const newDate = new Date(new Date(displayDate).getFullYear(), new Date(displayDate).getMonth() + 1, 1);
                        const dateStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-01`;
                        fetchGames(dateStr);
                      }}
                      className="text-grey-400 hover:text-white px-2"
                    >
                      →
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                      <div key={`header-${i}`} className="text-grey-500 text-xs py-1">{day}</div>
                    ))}
                    {displayDate && (() => {
                      const today = new Date();
                      const currentDate = new Date(displayDate);
                      const year = currentDate.getFullYear();
                      const month = currentDate.getMonth();
                      
                      // Get the first day of the month
                      const firstDay = new Date(year, month, 1).getDay();
                      
                      // Get the number of days in the month
                      const daysInMonth = new Date(year, month + 1, 0).getDate();
                      
                      // Create array of days
                      const days = [];
                      // Add empty cells for days before the first day of month
                      for (let i = 0; i < firstDay; i++) {
                        days.push(null);
                      }
                      // Add days of the month
                      for (let i = 1; i <= daysInMonth; i++) {
                        days.push(i);
                      }
                      
                      return days.map((day, i) => {
                        // Check if this day is today
                        const isCurrentDay = day && today.getDate() === day && 
                                          today.getMonth() === month && 
                                          today.getFullYear() === year;
                        
                        // Format the selected date string for accurate comparison
                        const selectedDateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
                        const displayDateStr = displayDate.split('T')[0]; // Get just the date part
                        const isSelectedDay = day && selectedDateStr === displayDateStr;
                        
                        return (
                          <div 
                            key={`day-${i}`} 
                            className={`p-1 text-xs rounded-full w-6 h-6 flex items-center justify-center ${
                              day ? 'cursor-pointer hover:bg-charcoal-600' : ''
                            } ${isCurrentDay ? 'bg-blue-600 text-white' : ''}
                               ${isSelectedDay && !isCurrentDay ? 'bg-charcoal-600 text-white' : ''}
                               ${day && !isCurrentDay && !isSelectedDay ? 'text-grey-400' : ''}
                            `}
                            onClick={() => day && handleDateSelect(day, year, month)}
                          >
                            {day || ''}
                          </div>
                        );
                      });
                    })()}
                  </div>
                  <div className="mt-2 pt-2 border-t border-charcoal-600">
                    <button 
                      onClick={() => {
                        fetchGames();
                        setShowCalendar(false);
                      }}
                      className="w-full text-center text-xs bg-blue-600 hover:bg-blue-700 text-white py-1 px-2 rounded"
                    >
                      Today
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Today's Games section */}
            <div className="flex flex-col justify-center items-center border-r border-charcoal-500 bg-charcoal-900 h-[110px] min-w-[100px] text-center">
              <span className="text-sm font-medium text-grey-400">
                Today's
              </span>
              <span className="text-sm font-bold text-white">
                Games
              </span>
            </div>
            
            {/* Left arrow box - only shown when scrolled */}
            {scrollPosition > 0 && (
              <div className="flex items-center justify-center border-r border-charcoal-500 bg-charcoal-900 h-[110px] min-w-[30px]">
                <button 
                  onClick={() => scrollCarousel('left')} 
                  className="text-grey-400 hover:text-white"
                  aria-label="Scroll left"
                >
                  ←
                </button>
              </div>
            )}
            
            {/* Games carousel wrapper with fixed width for 8 games */}
            <div className="relative flex-grow" style={{ maxWidth: `calc(100% - ${210 + (scrollPosition > 0 ? 30 : 0) - (scrollPosition >= maxScroll ? 30 : 0)}px)` }}>
              <div 
                ref={carouselRef}
                className="flex overflow-x-hidden scrollbar-hide w-full"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                onScroll={handleScroll}
              >
                {sortedGames.map((game, index) => {
                  const gameLive = isGameLive(game);
                  const gameFinished = isGameFinished(game);
                  const gameScheduled = !gameLive && !gameFinished;
                  const homeTeamWon = gameFinished && game.home_team_score > game.visitor_team_score;
                  const visitorTeamWon = gameFinished && game.home_team_score < game.visitor_team_score;
                  
                  return (
                    <div 
                      key={game.id}
                      className="flex flex-col w-[calc(100%/8)] min-w-[130px] border-r border-charcoal-500 h-[110px]"
                    >
                      {/* Game status header */}
                      <div className="px-2 py-1 text-center border-b border-charcoal-500">
                        {gameScheduled ? (
                          <div className="text-xs text-grey-400">
                            {game.formattedTime}
                          </div>
                        ) : gameLive ? (
                          <div className="flex items-center justify-center">
                            <span className="h-2 w-2 bg-red-500 rounded-full mr-1 animate-pulse"></span>
                            <span className="text-xs font-medium text-red-500">
                              {formatPeriod(game.period)} {game.time && `• ${game.time}`}
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs font-medium text-green-500">
                            Final
                          </div>
                        )}
                      </div>
                      
                      {/* Teams and scores section - filling the full height */}
                      <div className="flex flex-col flex-grow justify-between py-2 pb-4 px-3">
                        {/* Home Team Row */}
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-bold text-white">
                            {game.home_team.abbreviation}
                          </div>
                          
                          {/* Score with consistent placement for winner indicator */}
                          <div className="flex items-center w-14 justify-end">
                            <div className="text-lg text-gray-300 min-w-[30px] text-right">
                              {(gameLive || gameFinished) ? game.home_team_score : ''}
                            </div>
                            <div className="w-[10px]">
                              {homeTeamWon && (
                                <div className="ml-1 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[5px] border-r-green-500"></div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Away Team Row */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-sm font-bold text-white">
                            {game.visitor_team.abbreviation}
                          </div>
                          
                          {/* Score with consistent placement for winner indicator */}
                          <div className="flex items-center w-14 justify-end">
                            <div className="text-lg text-gray-300 min-w-[30px] text-right">
                              {(gameLive || gameFinished) ? game.visitor_team_score : ''}
                            </div>
                            <div className="w-[10px]">
                              {visitorTeamWon && (
                                <div className="ml-1 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[5px] border-r-green-500"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Right arrow section - only shown when there's more content to scroll */}
            {scrollPosition < maxScroll && (
              <div className="flex items-center justify-center border-l border-charcoal-500 bg-charcoal-900 h-[110px] min-w-[30px]">
                <button 
                  onClick={() => scrollCarousel('right')} 
                  className="text-grey-400 hover:text-white"
                  aria-label="Scroll right"
                >
                  →
                </button>
              </div>
            )}
          </div>
          
          {/* CSS for hiding scrollbar */}
          <style jsx global>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default GameCarousel; 