const { BaseClient } = require('../client');

/**
 * Get a specific NBA game by ID
 * @param {string|number} id - Game ID
 * @returns {Promise<Object>} - Response from the API
 */
async function getGame(id) {
  const client = new BaseClient();
  return client.request(`/nba/v1/games/${id}`);
}

module.exports = getGame; 