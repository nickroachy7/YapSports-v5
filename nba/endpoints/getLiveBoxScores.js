const { BaseClient } = require('../client');

/**
 * Get NBA live box scores
 * @returns {Promise<Object>} - Response from the API
 */
async function getLiveBoxScores() {
  const client = new BaseClient();
  return client.request("/nba/v1/box_scores/live");
}

module.exports = getLiveBoxScores; 