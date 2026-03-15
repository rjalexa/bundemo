import { hashPassword, verifyPassword, compareAlgorithms } from "../../utils/auth";
import type { Handler } from "../router";

export const hashPw: Handler = async (req) => {
  const { password } = await req.json();
  if (!password) return Response.json({ error: "Password is required" }, { status: 400 });
  const result = await hashPassword(password);
  return Response.json(result);
};

export const verifyPw: Handler = async (req) => {
  const { password, hash } = await req.json();
  if (!password || !hash) {
    return Response.json({ error: "Password and hash are required" }, { status: 400 });
  }
  const result = await verifyPassword(password, hash);
  return Response.json(result);
};

export const comparePw: Handler = async (req) => {
  const { password } = await req.json();
  if (!password) return Response.json({ error: "Password is required" }, { status: 400 });
  const result = await compareAlgorithms(password);
  return Response.json(result);
};
