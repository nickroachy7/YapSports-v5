const { BaseClient } = require('../client');

/**
 * Get NBA box scores for a specific date
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} - Response from the API
 */
async function getBoxScores(date) {
  const client = new BaseClient();
  return client.request(`/nba/v1/box_scores`, {
    method: "GET",
    params: client.buildQueryParams({ date }),
  });
}

module.exports = getBoxScores; 