const { BaseClient } = require('../client');

/**
 * Get a specific NBA team by ID
 * @param {string|number} id - Team ID
 * @returns {Promise<Object>} - Response from the API
 */
async function getTeam(id) {
  const client = new BaseClient();
  return client.request(`/nba/v1/teams/${id}`);
}

module.exports = getTeam; 