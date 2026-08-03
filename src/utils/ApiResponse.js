/**
 * Standardized API success response
 */
class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Success message
   * @param {*} data - Response payload
   */
  constructor(statusCode, message = 'Success', data = null) {
    this.statusCode = statusCode;
    this.success = true;
    this.message = message;
    this.data = data;
  }

  /**
   * Send the response
   * @param {import('express').Response} res
   */
  send(res) {
    return res.status(this.statusCode).json({
      success: this.success,
      message: this.message,
      data: this.data,
    });
  }
}

module.exports = ApiResponse;
