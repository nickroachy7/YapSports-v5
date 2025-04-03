const { BaseClient } = require('../client');

/**
 * Get NBA players
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - Response from the API
 */
async function getPlayers(params) {
  const client = new BaseClient();
  return client.request(`/nba/v1/players`, {
    method: "GET",
    params: client.buildQueryParams(params),
  });
}

module.exports = getPlayers; 