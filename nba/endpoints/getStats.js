const { BaseClient } = require('../client');

/**
 * Get NBA stats
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - Response from the API
 */
async function getStats(params) {
  const client = new BaseClient();
  return client.request(`/nba/v1/stats`, {
    method: "GET",
    params: client.buildQueryParams(params),
  });
}

module.exports = getStats; 