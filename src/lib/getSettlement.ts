// import { PrismaClient } from "@prisma/client";
// import jwt from "jsonwebtoken";
// import { Preferences } from "@capacitor/preferences";

// const SECRET_KEY = process.env.JWT_SECRET || 'Secret_of_JWT';

// export async function getSettlement() {
//     const { value: token } = await Preferences.get({ key: 'accessToken' });

//     if (!token) {
//         throw new Error("Authentication token not found.");
//     }

//     const payload = jwt.verify(token, SECRET_KEY);

//     let username: string | undefined;
//     if (typeof payload === "object" && payload !== null && "username" in payload) {
//         username = (payload as jwt.JwtPayload).username as string;
//     }

//     if (!username) {
//         throw new Error("Username not found in token payload.");
//     }

//     const prisma = new PrismaClient();
//     const data = await prisma.others.findMany({
//         where: {
//             userId: username,
//             balance: {
//                 not: 0,
//             }
//         }
//     });

//     return data;
// }

export async function getSettlement(token: string | null) {
  if (!token) throw new Error('Missing token');

  const res = await fetch('http://localhost:3001/settlement', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error || 'Failed to fetch settlements');
  }

  return await res.json();
}
