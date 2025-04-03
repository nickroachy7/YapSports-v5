const getTeams = require('./endpoints/getTeams');
const getTeam = require('./endpoints/getTeam');
const getPlayers = require('./endpoints/getPlayers');
const getPlayer = require('./endpoints/getPlayer');
const getActivePlayers = require('./endpoints/getActivePlayers');
const getGames = require('./endpoints/getGames');
const getGame = require('./endpoints/getGame');
const getStats = require('./endpoints/getStats');
const getSeasonAverages = require('./endpoints/getSeasonAverages');
const getStandings = require('./endpoints/getStandings');
const getLiveBoxScores = require('./endpoints/getLiveBoxScores');
const getBoxScores = require('./endpoints/getBoxScores');
const getPlayerInjuries = require('./endpoints/getPlayerInjuries');
const getLeaders = require('./endpoints/getLeaders');
const getOdds = require('./endpoints/getOdds');
const getAdvancedStats = require('./endpoints/getAdvancedStats');

module.exports = {
  getTeams,
  getTeam,
  getPlayers,
  getPlayer,
  getActivePlayers,
  getGames,
  getGame,
  getStats,
  getSeasonAverages,
  getStandings,
  getLiveBoxScores,
  getBoxScores,
  getPlayerInjuries,
  getLeaders,
  getOdds,
  getAdvancedStats
}; 