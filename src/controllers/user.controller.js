import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadeOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findOne(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Failed to generate Access and Refresh Token");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //get user data from frontend
  //validation - not empty
  //check if user already exits- username, email
  //check for images, check for avatar
  //bcrypt the password
  //upload to cloudinary
  // create user object- create entry in db
  //remove password and refresh token field from response
  //   check for user creation
  // return response

  const { fullName, username, email, password } = req.body;

  if (
    [fullName, username, email, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All field are required");
  }

  const userExist = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (userExist) {
    throw new ApiError(400, "User already exist.");
  }

  // console.log("req:- ", req);
  // console.log("req.texts:- ", req.texts);
  // console.log("req.files:- ", req.files);
  // console.log("avatar req.files:- ", req.files.avatar);
  // console.log("coverImage req.files:- ", req.files.coverImage);

  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;

  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }
  // console.log(avatarLocalPath, "abc");

  const avatar = await uploadeOnCloudinary(avatarLocalPath);
  const coverImage = await uploadeOnCloudinary(coverImageLocalPath);
  // console.log(avatar, "avatar");

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required2");
  }
  // console.log(avatar, "avatar3999");

  const user = await User.create({
    username: username.toLowerCase(),
    email,
    fullName,
    avatar: avatar,
    coverImage: coverImage || "",
    password,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //get (email or username) and password from frontend
  //check user email or username exist of not
  //if not then throw error
  //if exists then match password
  // create access token and refresh token
  // send tokens in cookies
  //then give access
  const { username, email, password } = req.body;

  if (!email && !username) {
    throw new ApiError(400, "Username or Email is required!");
  }

  const user = await User.findOne({ $or: [{ username }, { email }] });

  if (!user) {
    throw new ApiError(400, "User does not exist!");
  }

  const isPasswordValid = await user.isPasswordCorrect(password, user.password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Password incorrect!");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  console.log("req start", req, "req end");

  User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "User logged out successfully."));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(400, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
  
    const user = await User.findById(decodedToken._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
  
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }
  
    const options = {
      httpOnly: true,
      secure: true,
    };
  
    const { accessToken, newrefreshToken } = await generateAccessAndRefreshToken(
      user._id
    );
  
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newrefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {accessToken, newrefreshToken},
          "Access token refreshed successfully"
        )
      )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
