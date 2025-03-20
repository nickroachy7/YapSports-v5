# BallDontLie NBA API Reference

This document provides a detailed overview of the NBA endpoints and parameters available through the balldontlie API SDK.

## Authentication

The balldontlie API requires authentication via an API key. The API key needs to be included in all requests.

```javascript
import { BalldontlieAPI } from "@balldontlie/sdk";

const api = new BalldontlieAPI({ apiKey: "your-api-key" });
```

Our API key is stored in the `.env.local` file as:
```
API_KEY=f42bb8d2-2bf8-4714-842d-601a45628168
```

## Pagination

The API uses cursor-based pagination rather than limit/offset. Endpoints that support pagination will return a `meta` object with the following structure:

```json
{
  "meta": {
    "next_cursor": 90,
    "per_page": 25
  }
}
```

You can use:
- `per_page` to specify the maximum number of results (defaults to 25, maximum 100)
- `next_cursor` to get the next page of results by adding `?cursor=NEXT_CURSOR` to your request

## Available Endpoints

### Teams

#### Get All Teams

```javascript
const teams = await api.nba.getTeams();
```

#### Get a Specific Team

```javascript
const team = await api.nba.getTeam(teamId);
```

### Players

#### Get All Players

```javascript
const players = await api.nba.getPlayers();
```

Parameters:
- `search` - Search players by name
- `team_ids` - Filter by team IDs
- `cursor` - For pagination

#### Get a Specific Player

```javascript
const player = await api.nba.getPlayer(playerId);
```

### Games

#### Get All Games

```javascript
const games = await api.nba.getGames({
  dates: ["2024-04-01"],  
  seasons: [2023],
  team_ids: [1, 2],
  cursor: "next_cursor_value"
});
```

Parameters:
- `dates` - Array of date strings in YYYY-MM-DD format
- `seasons` - Array of season years (e.g., [2023] for the 2023-2024 season)
- `team_ids` - Array of team IDs
- `cursor` - For pagination

#### Get a Specific Game

```javascript
const game = await api.nba.getGame(gameId);
```

### Game Player Stats

#### Get All Stats

```javascript
const stats = await api.nba.getStats({
  player_ids: [15],
  game_ids: [1038184],
  dates: ["2024-01-20"],
  seasons: [2023],
  cursor: "next_cursor_value"
});
```

Parameters:
- `player_ids` - Filter by player IDs
- `game_ids` - Filter by game IDs
- `dates` - Filter by dates in YYYY-MM-DD format
- `seasons` - Filter by season years
- `cursor` - For pagination

Response includes detailed player stats:
- `min` - Minutes played
- `fgm/fga/fg_pct` - Field goals made/attempted/percentage
- `fg3m/fg3a/fg3_pct` - 3-point field goals made/attempted/percentage
- `ftm/fta/ft_pct` - Free throws made/attempted/percentage
- `oreb/dreb/reb` - Offensive rebounds/defensive rebounds/total rebounds
- `ast` - Assists
- `stl` - Steals
- `blk` - Blocks
- `turnover` - Turnovers
- `pf` - Personal fouls
- `pts` - Points

### Season Averages

#### Get Averages

```javascript
const averages = await api.nba.getSeasonAverages({
  player_ids: [15],
  season: 2023
});
```

Parameters:
- `player_ids` - Array of player IDs (required)
- `season` - Season year (optional, defaults to current season)

### Game Advanced Stats

#### Get All Advanced Stats

```javascript
const advancedStats = await api.nba.getAdvancedStats({
  player_ids: [15],
  game_ids: [1038184],
  dates: ["2024-01-20"],
  seasons: [2023],
  cursor: "next_cursor_value"
});
```

Parameters are the same as the regular stats endpoint.

### Box Scores

#### Get Live Box Scores

```javascript
const liveBoxScores = await api.nba.getLiveBoxScores({
  date: "2024-04-01"
});
```

Parameters:
- `date` - Date in YYYY-MM-DD format (required)

#### Get Box Scores

```javascript
const boxScores = await api.nba.getBoxScores({
  game_ids: [1038184]
});
```

Parameters:
- `game_ids` - Array of game IDs (required)

### Active Players

#### Get All Active Players

```javascript
const activePlayers = await api.nba.getActivePlayers({
  team_ids: [17]
});
```

Parameters:
- `team_ids` - Filter by team IDs

### Player Injuries

#### Get All Player Injuries

```javascript
const injuries = await api.nba.getPlayerInjuries({
  team_ids: [17],
  player_ids: [15]
});
```

Parameters:
- `team_ids` - Filter by team IDs
- `player_ids` - Filter by player IDs

### Team Standings

#### Get Team Standings

```javascript
const standings = await api.nba.getTeamStandings({
  season: 2023
});
```

Parameters:
- `season` - Season year (required)

### Leaders

#### Get Leaders

```javascript
const leaders = await api.nba.getLeaders({
  season: 2023,
  season_type: "regular",
  stat_period_type: "perGame",
  stat: "pts"
});
```

Parameters:
- `season` - Season year (required)
- `season_type` - Type of season (regular, postseason)
- `stat_period_type` - Type of stat period (perGame, total)
- `stat` - Stat category (pts, ast, reb, etc.)

### Betting Odds

#### Get Betting Odds

```javascript
const odds = await api.nba.getOdds({
  date: "2024-04-01"
});
```

Parameters:
- Either `date` (YYYY-MM-DD format) or `game_id` is required

Response includes various types of odds:
- 2-way (moneyline)
- Spread
- Over/under

## Example Usage

Here's a complete example of fetching player stats for Giannis Antetokounmpo for a specific date range:

```javascript
import { BalldontlieAPI } from "@balldontlie/sdk";
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const api = new BalldontlieAPI({ apiKey: process.env.API_KEY });

async function getGiannisStats() {
  try {
    // Fetch Giannis's player ID (assuming we know it's 15)
    const playerId = 15;
    
    // Get stats for games in January 2024
    const stats = await api.nba.getStats({
      player_ids: [playerId],
      dates: ["2024-01-01", "2024-01-31"]
    });
    
    console.log(`Found ${stats.data.length} games for Giannis in January 2024`);
    console.log(stats.data);
    
    // Get season averages
    const averages = await api.nba.getSeasonAverages({
      player_ids: [playerId],
      season: 2023
    });
    
    console.log("Season averages:");
    console.log(averages.data[0]);
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

getGiannisStats();
```

## Rate Limits and Account Tiers

The balldontlie API has different account tiers with varying rate limits. Please refer to the official documentation for the most up-to-date information on account tiers and limits.

## Additional Resources

- [Official balldontlie NBA API Documentation](https://nba.balldontlie.io/)
- [JavaScript SDK Documentation](https://github.com/balldontlie/balldontlie-js)
- [Python SDK Documentation](https://github.com/balldontlie/balldontlie-python) 