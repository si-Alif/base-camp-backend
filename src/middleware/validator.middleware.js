import { validationResult } from "express-validator";
import {API_error} from "../utils/API_error.js";

export const validate = (req , res , next) =>{
  const err = validationResult(req);
  if(err.isEmpty()) return next();

  const extract_errors = [];
  // looping through the array , extracting the path and the message and pushing it into an array as an hashmap
  err.array().map(err => extract_errors.push({[err.path] : err.msg}));

  throw new API_error (422 , "Received data isn't valid" , extract_errors);

}