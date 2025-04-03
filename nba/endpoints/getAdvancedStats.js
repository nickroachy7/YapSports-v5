const { BaseClient } = require('../client');

/**
 * Get NBA advanced stats
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - Response from the API
 */
async function getAdvancedStats(params) {
  const client = new BaseClient();
  return client.request(`/nba/v1/stats/advanced`, {
    method: "GET",
    params: client.buildQueryParams(params),
  });
}

module.exports = getAdvancedStats; 