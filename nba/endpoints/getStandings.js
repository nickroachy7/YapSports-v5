const { BaseClient } = require('../client');

/**
 * Get NBA standings
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - Response from the API
 */
async function getStandings(params) {
  const client = new BaseClient();
  return client.request(`/nba/v1/standings`, {
    method: "GET",
    params: client.buildQueryParams(params),
  });
}

module.exports = getStandings; 