const { BaseClient } = require('../client');

/**
 * Get NBA odds
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - Response from the API
 */
async function getOdds(params) {
  const client = new BaseClient();
  return client.request(`/nba/v1/odds`, {
    method: "GET",
    params: client.buildQueryParams(params),
  });
}

module.exports = getOdds; 