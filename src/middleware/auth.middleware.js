import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/async_handlers.js";
import { API_error } from "../utils/API_error.js";
import jwt from "jsonwebtoken"

export const verify_jwt = asyncHandler(async(req , res , next)=>{
  // web apps usually pass the access token in the cookies meanwhile mobile apps usually pass it in the headers as an Authorization header
  // here we extracted the encrypted token from the cookies or the headers
  const access_token_hashed = req.cookies?.access_token || req?.header("Authorization")?.replace("Bearer " , "");

  if(!access_token_hashed) throw new API_error(401 , "Unauthorized request");

  try {
    const access_token = jwt.verify(access_token_hashed, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(access_token?._id).select("-password -email_verification_token -email_verification_token_expiry");

    if(!user) throw new API_error(401 , "Unauthorized request . Invalid access token received");

    // once the user is authenticated , we store the user object in the request object with needed info about the user . This will be used in other middlewares or will be directly passed to the controller . Everything this does is to authenticate the user if he's valid or not .
    req.user = user;
    next();
  } catch (error) {
    throw new API_error(401 , "Unauthorized request . Invalid access token received");
  }

})