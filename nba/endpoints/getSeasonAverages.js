const { BaseClient } = require('../client');

/**
 * Get NBA season averages
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - Response from the API
 */
async function getSeasonAverages(params) {
  const client = new BaseClient();
  return client.request(`/nba/v1/season_averages`, {
    method: "GET",
    params: client.buildQueryParams(params),
  });
}

module.exports = getSeasonAverages; 