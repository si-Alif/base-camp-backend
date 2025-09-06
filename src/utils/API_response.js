// creating a standardized format of API response

class API_response{
  constructor(statusCode , data , message = "Success"){
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export {API_response};