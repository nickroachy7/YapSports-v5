const { BaseClient } = require('../client');

/**
 * Get NBA games
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - Response from the API
 */
async function getGames(params) {
  const client = new BaseClient();
  return client.request(`/nba/v1/games`, {
    method: "GET",
    params: client.buildQueryParams(params),
  });
}

module.exports = getGames; 