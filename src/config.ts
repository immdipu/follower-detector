import { LoginOptions } from "./types";
import * as dotenv from "dotenv";

dotenv.config();

export const loginOptions: LoginOptions = {
  headless: false,
  email: process.env.EMAIL || "",
  password: process.env.PASSWORD || "",
  loginURL: process.env.LOGIN_URL || "https://accounts.google.com/signin",
  loginRedirectURL: process.env.LOGIN_REDIRECT_URL || "myaccount.google.com",
  authFile: "./auth.json",
  f4tURL: process.env.F4T_URL || "https://free4talk.com",
  accountIdentifier: process.env.ACCOUNT_IDENTIFIER || "immmdeep@gmail.com",
  modelUser: process.env.MODEL_USER || "W̷h̷i̷t̷e̷ W̷o̷l̷f̷",
  DEBUG_MODE: false,

};
