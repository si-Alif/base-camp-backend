import crypto from "crypto";
import jwt from "jsonwebtoken";

import { User } from "../models/user.models.js";
import { API_response } from "../utils/API_response.js";
import { API_error } from "../utils/API_error.js";
import { asyncHandler } from "../utils/async_handlers.js";
import { sendmail , email_verification_template, email_reset_password_template } from "../utils/mail.js";

const generate_ST_RT = async (user_id) =>{
  try {
    const user = await User.findById(user_id);
    const AT = user.generate_access_token();
    const RT = user.generate_refresh_token();
    user.refresh_token = RT;
    await user.save({validateBeforeSave : false});
    return {AT , RT};
  } catch (error) {
    throw new API_error(500 , "Internal Server Error while generating ST and RT" );
  }
}


const registerUser = asyncHandler(async (req , res)=>{
  // destructure the req.body json
  const {email , username , password , role , avatar} = req.body

  const user_exists = await User.findOne({
    $or : [
      {email : email},
      {username : username}
    ]
  })

  if(user_exists) {
    throw new API_error(409 , "User already exists with this email or username" , []);
  }

  try {
    const new_user = await User.create({
      avatar : avatar,
      email : email,
      username : username,
      password : password,
      role : role,
      is_email_verified : false,
    })

    const {
      unhashed_token,
      hashed_token,
      token_expiry
    } = new_user.generate_temporary_token();

    new_user.email_verification_token = hashed_token;
    new_user.email_verification_token_expiry = token_expiry;
    // No need to validate before saving as it is a new user and I know what I'm doing
    await new_user.save({validateBeforeSave : false});

    await sendmail({
      email : new_user?.email,
      subject : "Email Verification",
      mailgen_content : email_verification_template(new_user.username ,  `${req.protocol}://${req.get("host")}/api/v1/users/auth/verify-email/${unhashed_token}`)

    })

    const created_user = await User.findById(new_user._id).select(
      "-password -email_verification_token -email_verification_token_expiry"
    );

    if(!created_user) throw new API_error(500 , "Internal Server Error while searching for the created user");

    return res
              .status(201)
              .json(
                new API_response(201 , {user : created_user} , "User registered successfully and sent verification email")
              )
  }
  catch(err) {
    console.log(err);
    throw new API_error(500 , "Internal Server Error while registering a new user");
  }

})

const login_user = asyncHandler(async (req , res)=>{
  const {email , password , username} = req.body

  // if(!username || !email) throw new API_error(400 , "Username or email is required");
  if(!email) throw new API_error(400 , "Email is required");
  const user = await User.findOne({email : email});

  if(!user) throw new API_error(404 , "User not found");

  const is_pass_correct = await user.is_password_correct(password);

  if(!is_pass_correct) throw new API_error(401 , "Password is incorrect");

  const {AT , RT} = await generate_ST_RT(user._id);

  const logged_in_user = await User.findById(user._id).select(
    "-password -email_verification_token -email_verification_token_expiry"
  );

  if(!logged_in_user) throw new API_error(500 , "Internal Server Error while searching for the logged in user");

  const options = {
    httpOnly :true ,
    secure : true
  }

  return res
            .status(200)
            .cookie("access_token" ,AT , options)
            .cookie("refresh_token" , RT , options)
            .json(
              new API_response(200 , {user : logged_in_user , access_token :AT} , "User logged in successfully")
            )
  }
)

const forgot_password_request = asyncHandler(async (req , res) => {
  const { email } = req.body

  const user = await User.findOne({ email })

  if (!user) throw new API_error(404, "User not found");

  const {
    unhashed_token,
    hashed_token,
    token_expiry
  } = user.generate_temporary_token()

  user.forgot_password = hashed_token;
  user.forgot_password_expiry = token_expiry;
  await user.save({ validateBeforeSave: false })

  await sendmail({
    email: email,
    subject: "Forgot Password",
    mailgen_content: email_reset_password_template(
      user.username, `${process.env.FORGOT_PASSWORD_REDIRECT_URL}/${unhashed_token}`)
  })

  return res.status(200).json(
    new API_response(200, {}, "Password reset link sent successfully")
  )

})


const forgot_password_reset_handler = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const hashed_token = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    forgot_password: hashed_token,
    forgot_password_expiry: {
      $gt: Date.now()
    }
  })

  if (!user) throw new API_error(489, "Invalid or expired password reset token");

  user.password = password; // as password field was changed , based on db connections pools functionality it'll be hashed automatically
  user.forgot_password = null;
  user.forgot_password_expiry = null;

  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new API_response(200, {}, "Password reset successfully")
  )

})


// we've an identifier for each authorized time period of a certain user stored in database which is the refresh token .
const logout_user = asyncHandler(async (req , res)=>{
  await User.findByIdAndUpdate(
    req.user?._id ,
    {
      $set :{
        refresh_token : ""
      }
    },
    // this `new:true` will return the updated document
    {
      new :true
    }
  )

  const options = {
    httpOnly :true ,
    secure : true
  }

  return res
      .status(200)
      .clearCookie("access_token" , options)
      .clearCookie("refresh_token" , options)
      .json(new API_response(200 , {} , "User logged out successfully"));

})


const get_current_user = asyncHandler(async(req , res)=>{
  // as this is a protected route , we would have the user info access in req.user

  return res.status(200).json(
    new API_response(200 , {user : req.user} , "User info fetched successfully")
  )

})


const verify_email  = asyncHandler(async (req , res)=>{
  const {email_verification_token} = req.params;

  if(!email_verification_token) throw new API_error(400 , "Email verification token is required");

  const hashed_token = crypto.createHash("sha256").update(email_verification_token).digest("hex");

  const user = await User.findOne({
    email_verification_token : hashed_token,
    // check for the user who's email verification token is still valid
    email_verification_token_expiry : {
      $gt : Date.now()
    }
  })

  if(!user) throw new API_error(400 , "Invalid or expired email verification token");

  user.email_verification_token = null;
  user.email_verification_token_expiry = null;
  user.is_email_verified = true;
  await user.save({validateBeforeSave : false});

  return res.status(200).json(
    new API_response(200 , {is_email_verified : true} , "Email verified successfully")
  )

})


const resend_email_verification = asyncHandler(async (req , res)=>{
  const user  = await User.findById(req.user?._id);
  if(!user) throw new API_error(404 , "User not found");
  if(user.is_email_verified) throw new API_error(409 , "Email already verified");

  const { unhashed_token, hashed_token, expiry } = user.generate_temporary_token();

  user.email_verification_token = hashed_token;
  user.email_verification_token_expiry = expiry;
  await user.save({validateBeforeSave : false});


  await sendmail({
    email: user?.email,
    subject: "Email Verification",
    mailgen_content: email_verification_template(user.username, `${req.protocol}://${req.get("host")}/api/v1/users/auth/verify-email/${unhashed_token}`)
  })

  return res.status(200).json(
    new API_response(200 , {} , "Verification email sent successfully")
  )

})


const refresh_access_token = asyncHandler(async ()=>{
  const incoming_RT = req.cookies?.refresh_token || req?.header("Authorization")?.replace("Bearer " , "");

  if(!incoming_RT) throw new API_error(401 , "Unauthorized request");

  try{
    const decoded_token = jwt.verify(incoming_RT , process.env.REFRESH_TOKEN_SECRET);
    if(!decoded_token) throw new API_error(401 , "Invalid refresh token received");

    const user = await User.findById(decoded_token?._id);

    if(!user) throw new API_error(401 , "User not found");

    if(incoming_RT !== user.refresh_token) throw new API_error(401 , "Invalid refresh token received");

    const options = {
      httpOnly :true ,
      secure : true
    }

    const {AT , RT} = await generate_ST_RT(user._id);

    user.refresh_token = RT;

    await user.save({validateBeforeSave : false});

    return res.status(200)
                        .cookie("access_token" , AT , options)
                        .cookie("refresh_token" , RT , options)
                        .json(
                                new API_response(200 , {access_token : AT} , "Access token refreshed successfully")
                              )

  }
  catch(err){
    throw new API_response(401 , "Invalid refresh token received");
  }

})

const reset_password = asyncHandler(async (req , res)=>{

  const {new_pass , old_pass} = req.body;
  const user = await User.findById(req.user?._id);

  if(!user) throw new API_error(404 , "User not found");

  const is_password_correct = await user.is_password_correct(old_pass);

  if(!is_password_correct) throw new API_error(401 , "Invalid old password . Please check your old password and try again or go for forgot password option if you have forgotten your password");

  user.password = new_pass;
  await user.save({validateBeforeSave : false});

  return res.status(200).json(
    new API_response(200 , {} , "Password changed successfully")
  )

})


export {
  registerUser ,
  generate_ST_RT ,
  login_user ,
  logout_user ,
  get_current_user ,
  verify_email ,
  resend_email_verification ,
  refresh_access_token,
  forgot_password_request,
  forgot_password_reset_handler,
  reset_password,
};