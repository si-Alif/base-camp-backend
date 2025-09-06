// following code file will be used as a health check endpoint for the application

import {API_response} from "../utils/API_response.js";
import { asyncHandler } from "../utils/async_handlers.js";

// we can write try-catch block for every operation we do in our application , but it's just better to wrap them around a HIOF for formatting
// const healthCheck = (req , res , next) =>{
//   try {
//     res.status(200).json(
//       new API_response(200 , {message : "Server Is Running ..."} , "Server Health Check done✅")
//     )
//   } catch (error) {

//   }

// }

const healthCheck = asyncHandler(async (req ,res , next) =>{
  res
    .status(200)
    .json(
      new API_response(
        200 ,
        {message : "Server Is Running ✅..."} ,
        "Server Health Check done✅"
      )
    )

})

export {healthCheck} ;