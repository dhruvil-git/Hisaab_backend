// import { PrismaClient } from "@prisma/client";

// import { Preferences } from '@capacitor/preferences';
// import jwt from "jsonwebtoken";

// const SECRET_KEY = process.env.JWT_SECRET || 'Secret_of_JWT';

// type TransactionType = {
//     id: string,
//     username: string,
//     userId: string,
//     balance: Number,
//   };

// export default async function getUsers() : Promise<TransactionType[]> {
//       const { value: token } = await Preferences.get({ key: 'accessToken' });


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

//     const others = await prisma.others.findMany({
//         where: {
//             userId: username,
//         }
//     })

//     return others.map(user => ({
//         id: user.id,
//         username: user.username,
//         userId: user.userId,
//         balance: Number(user.balance),
//     }));
// }
export default async function getUsers(token: string | null) {
  if (!token) throw new Error('Missing token');

  const res = await fetch('http://localhost:3001/users', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error('Unauthorized');

  return await res.json();
}