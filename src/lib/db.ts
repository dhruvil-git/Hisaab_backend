import { PrismaClient } from "@prisma/client";

type TransactionType = {
    id: string,
    username: string,
    userId: string,
    balance: Number,
  };

export default async function db(username: string) {

    const prisma = new PrismaClient();

    const others = await prisma.others.findMany({
        where: {
            userId: username,
        }
    })

    return others.map(user => ({
        id: user.id,
        username: user.username,
        userId: user.userId,
        balance: Number(user.balance),
    }));
}