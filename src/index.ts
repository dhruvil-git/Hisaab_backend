import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
import nodemailer from "nodemailer";
import { PrismaClient } from '@prisma/client';
import { CheckUsername, CheckEmail, CreateUser, ValidateUser, GenerateToken } from "./lib/auth";
import { AddTransaction, LendTrans } from "./lib/addTransaction";
import db from "./lib/db";


dotenv.config();
const app = express();
const prisma = new PrismaClient();
app.use(cors());
app.use(express.json());

const SECRET_KEY = process.env.JWT_SECRET || "Secret_of_JWT";
const saltRounds = 11;

app.get('/', (req, res) => {
  res.send("Hisaab API running!");
});

app.get('/settlement', async (req: Request, res: Response): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Missing token" });
    return;
  }

  try {
    const payload = jwt.verify(token, SECRET_KEY);
    const username = typeof payload === "object" && (payload as jwt.JwtPayload)?.username;

    if (!username) {
      res.status(403).json({ error: "Invalid token payload" });
      return;
    }

    const data = await prisma.others.findMany({
      where: {
        userId: username,
        balance: {
          not: 0,
        },
      },
    });

    res.status(200).json(data);
    return;
  } catch (err) {
    console.error("JWT error:", err);
    res.status(403).json({ error: "Invalid token" });
    return;
  }
});



app.post('/login', async (req: Request, res: Response) : Promise<void> => {
  const { email, username, password } = req.body;

  try {
    const user = await ValidateUser(password, email, username);

    if (!user) {
      res.status(401).json({ error: "Invalid Credentials" });
      return;
    }

    const token = GenerateToken(user);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



app.post('/logout', async (req: Request, res: Response) : Promise<void> => {
  try {

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });

  } catch (error) {
    console.error("Logout Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
    return;
  }
});



app.patch('/profile/password', async (req: Request, res: Response) : Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Missing token" });
    return;
  }

  try {
    const payload = jwt.verify(token, SECRET_KEY) as { username?: string };

    const username = payload?.username;
    if (!username) {
      res.status(403).json({ error: "Invalid token" });
      return;
    }

    const { oldPass, newPass } = req.body;

    if (!oldPass || !newPass) {
      res.status(400).json({ error: "Both passwords are required" });
      return;
    }

    const user = await prisma.user.findFirst({ where: { username } });

    if (!user || !(await bcrypt.compare(oldPass, user.password))) {
      res.status(403).json({ error: "Incorrect current password" });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPass, saltRounds);

    await prisma.user.update({
      where: { username },
      data: { password: hashedPassword },
    });

    res.status(200).json({ success: true });
    return;
  } catch (err) {
    console.error("Password change error:", err);
    res.status(500).json({ error: "Internal error" });
    return;
  }

});



app.patch('/profile/name', async (req: Request, res: Response) : Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Missing token" });
    return;
  }

  try {
    const payload = jwt.verify(token, SECRET_KEY) as { username?: string };
    const username = payload?.username;

    if (!username) {
      res.status(403).json({ error: "Invalid token" });
      return;
    }

    const { newName } = req.body;

    if (!newName || typeof newName !== "string") {
      res.status(400).json({ error: "Invalid name" });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { username },
      data: { name: newName },
    });

    res.status(200).json({ success: true, name: updatedUser.name });
    return;
  } catch (err) {
    console.error("Name update error:", err);
    res.status(500).json({ error: "Internal error" });
    return;
  }
});



app.get('/profile', async (req: Request, res: Response) : Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Missing token" });
    return;
  }

  try {
    const payload = jwt.verify(token, SECRET_KEY) as { username?: string };
    const username = payload?.username;

    if (!username) {
      res.status(403).json({ error: "Invalid token" });
      return;
    }

    const user = await prisma.user.findFirst({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
      },
    });

    res.status(200).json(user);
    return;
  } catch (err) {
    console.error("Token verification error:", err);
    res.status(403).json({ error: "Invalid token" });
    return;
  }
});



app.post('/sendotp', async (req: Request, res: Response) : Promise<void> => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    res.status(400).json({ success: false, error: "Missing fields" });
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"Hisaab Support" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your OTP Code",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9fafb; color: #111; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #e67e22;">🔐 Email Verification</h2>
        <p>Hello,</p>
        <p>Thank you for signing up! Please use the following OTP to verify your email address:</p>
        <div style="font-size: 24px; font-weight: bold; color: #2ecc71; margin: 20px 0;">${otp}</div>
        <p>This code will expire in 10 minutes. Do not share it with anyone.</p>
        <hr style="margin-top: 30px;" />
        <p style="font-size: 12px; color: #666;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ success: true });
    return;
  } catch (error) {
    console.error("Email sending error:", error);
    res.status(500).json({ success: false, error: "Email send failed" });
    return;
  }
});



app.post('/signup', async (req: Request, res: Response) : Promise<void> => {
  const { name, email, username, password } = req.body;

  try {
    if (await CheckUsername(username)) {
      res.status(401).json({ error: "Username not available" });
      return;
    }

    if (await CheckEmail(email)) {
      res.status(401).json({ error: "Email Id already registered" });
      return;
    }

    await CreateUser(name, email, username, password);

    const user = await ValidateUser(password, email, username);

    if (!user) {
      res.status(401).json({ error: "Auto-login failed after registration" });
      return;
    }

    const token = GenerateToken(user);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal Server Error" });
    return;
  }

});



app.post('/trans', async (req: Request, res: Response) : Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      res.status(401).json({ success: false, error: "No auth token provided" });
      return;
    }

    let username: string | undefined;
    try {
      const payload = jwt.verify(token, SECRET_KEY);
      if (typeof payload === "object" && payload !== null && "username" in payload) {
        username = (payload as jwt.JwtPayload).username as string;
      }
    } catch {
      res.status(403).json({ success: false, error: "Invalid or expired token" });
      return;
    }

    if (!username) {
      res.status(400).json({ success: false, error: "Username not found in token" });
      return;
    }

    const { trans, From, to, amt, desc } = req.body;

    if (!to || !amt || isNaN(Number(amt))) {
      res.status(400).json({ success: false, error: "Missing or invalid parameters" });
      return;
    }

    if (trans) {
      await AddTransaction(username, to, amt, desc || "");
    } else {
      if (!From) {
        res.status(400).json({ success: false, error: "Missing 'From' in lend transaction" });
        return;
      }
      await LendTrans(From, username, to, amt, desc || "");
    }

    res.status(200).json({ success: true });
    return;
  } catch (err) {
    console.error("Transaction error:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
    return;
  }
});



app.get('/transactions', async (req: Request, res: Response) : Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Missing token" });
    return;
  }

  try {
    const payload = jwt.verify(token, SECRET_KEY);
    const username = typeof payload === "object" && (payload as jwt.JwtPayload)?.username;

    if (!username) {
      res.status(403).json({ error: "Invalid token payload" });
      return;
    }

    const data = await prisma.transaction.findMany({
      where: { userId: username },
      orderBy: { Time: "desc" },
    });

    res.status(200).json(data);
    return;
  } catch (err) {
    console.error("JWT error:", err);
    res.status(403).json({ error: "Invalid token" });
    return;
  }
});



app.get('/users', async (req: Request, res: Response) : Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Missing token" });
    return;
  }

  try {
    const payload = jwt.verify(token, SECRET_KEY) as jwt.JwtPayload;
    const username = payload.username as string | undefined;

    if (!username) {
      res.status(403).json({ error: "Username not found in token" });
      return;
    }

    const users = await db(username);
    res.status(200).json(users);
    return;
  } catch (e) {
    console.error("JWT verification failed:", e);
    res.status(403).json({ error: "Invalid or expired token" });
    return;
  }
})

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running at http://localhost:${PORT}`));
