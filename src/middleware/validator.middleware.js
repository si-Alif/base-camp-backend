import { validationResult } from "express-validator";
import {API_error} from "../utils/API_error.js";

export const validate = (req , res , next) =>{
  const err = validationResult(req);
  if(err.isEmpty()) return next();
  console.log("Errors are : " , err);

  const extract_errors = [];
  // looping through the array , extracting the path and the message and pushing it into an array as an hashmap
  err.array().map(err => extract_errors.push({[err.path] : err.msg}));

  if(!extract_errors.length === 0){
    extract_errors.map(err => console.log(err));
  }

  throw new API_error (422 , "Received data isn't valid" , extract_errors);

}