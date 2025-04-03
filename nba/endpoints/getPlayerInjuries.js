const { BaseClient } = require('../client');

/**
 * Get NBA player injuries
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - Response from the API
 */
async function getPlayerInjuries(params) {
  const client = new BaseClient();
  return client.request(`/nba/v1/player_injuries`, {
    method: "GET",
    params: client.buildQueryParams(params),
  });
}

module.exports = getPlayerInjuries; 