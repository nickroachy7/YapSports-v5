const { BaseClient } = require('../client');

/**
 * Get all NBA teams
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} - Response from the API
 */
async function getTeams(params) {
  const client = new BaseClient();
  return client.request(`/nba/v1/teams`, {
    method: "GET",
    params: client.buildQueryParams(params),
  });
}

module.exports = getTeams; 