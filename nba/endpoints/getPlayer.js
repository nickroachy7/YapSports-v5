const { BaseClient } = require('../client');

/**
 * Get a specific NBA player by ID
 * @param {string|number} id - Player ID
 * @returns {Promise<Object>} - Response from the API
 */
async function getPlayer(id) {
  const client = new BaseClient();
  return client.request(`/nba/v1/players/${id}`);
}

module.exports = getPlayer; 