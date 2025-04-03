const { BaseClient } = require('../client');

/**
 * Get active NBA players
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - Response from the API
 */
async function getActivePlayers(params) {
  const client = new BaseClient();
  return client.request(`/nba/v1/players/active`, {
    method: "GET",
    params: client.buildQueryParams(params),
  });
}

module.exports = getActivePlayers; 