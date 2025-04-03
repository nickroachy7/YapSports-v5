const { BaseClient } = require('../client');

/**
 * Get NBA leaders
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - Response from the API
 */
async function getLeaders(params) {
  const client = new BaseClient();
  return client.request(`/nba/v1/leaders`, {
    method: "GET",
    params: client.buildQueryParams(params),
  });
}

module.exports = getLeaders; 