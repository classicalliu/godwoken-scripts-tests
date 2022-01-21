import dotenv from "dotenv";
dotenv.config({
  path: process.env.ENV_PATH!,
});
import { run } from "./fee";

run();
