# NBA API Endpoints

This directory contains individual JavaScript files for each NBA API endpoint from the @balldontlie/sdk.

## Usage

You can import individual endpoints:

```javascript
const { getTeams } = require('./nba');

// Get all teams
getTeams()
  .then(response => console.log(response))
  .catch(error => console.error(error));

// Get teams with parameters
getTeams({ per_page: 10, page: 1 })
  .then(response => console.log(response))
  .catch(error => console.error(error));
```

## Available Endpoints

- `getTeams(params)` - Get all NBA teams
- `getTeam(id)` - Get a specific NBA team by ID
- `getPlayers(params)` - Get NBA players 
- `getPlayer(id)` - Get a specific NBA player by ID
- `getActivePlayers(params)` - Get active NBA players
- `getGames(params)` - Get NBA games
- `getGame(id)` - Get a specific NBA game by ID
- `getStats(params)` - Get NBA stats
- `getSeasonAverages(params)` - Get NBA season averages
- `getStandings(params)` - Get NBA standings
- `getLiveBoxScores()` - Get NBA live box scores
- `getBoxScores(date)` - Get NBA box scores for a specific date
- `getPlayerInjuries(params)` - Get NBA player injuries
- `getLeaders(params)` - Get NBA leaders
- `getOdds(params)` - Get NBA odds
- `getAdvancedStats(params)` - Get NBA advanced stats

## Parameters

Most endpoints accept a `params` object that can include:
- `per_page` - Number of results per page
- `page` - Page number
- Additional filters specific to each endpoint

Refer to the @balldontlie API documentation for detailed parameter options for each endpoint. 