import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../config/prisma.js";

interface RegisterRequestBody {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
}

export const register = async (
  req: Request<Record<string, never>, unknown, RegisterRequestBody>,
  res: Response
): Promise<void> => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    const firstName = req.body.firstName?.trim();
    const lastName = req.body.lastName?.trim() || null;

    if (!email || !password || !firstName) {
      res.status(400).json({
        error: "Email, password, and first name are required.",
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        error: "Password must contain at least 8 characters.",
      });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({
        error: "An account with that email already exists.",
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: "User registered successfully.",
      user,
    });
  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      error: "An unexpected error occurred during registration.",
    });
  }
};
