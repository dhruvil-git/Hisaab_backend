import { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";

const prisma = new PrismaClient();

export async function AddTransaction(username: string, to: string, amt: Decimal, desc: string) {
    const trans = await prisma.transaction.create({
        data: {
            userId: username,
            Lend: false,
            Amount: amt,
            To: to,
            Description: desc,
        }
    })
}


export async function LendTrans(From: string, username: string, to: string, amt: Decimal, desc: string) {
    From = From.toLowerCase();
    to = to.toLowerCase();

    if (From === "me") {
        if (to === "me") {
            const transaction = await prisma.transaction.create({
                data: {
                    userId: username,
                    Lend: false,
                    Amount: amt,
                    To: to,
                    Description: desc,
                }
            });

            return;
        }

        let userTo = await prisma.others.findFirst({
            where: {
                userId: username,
                username: to,
            }
        });

        if (!userTo) {
            userTo = await prisma.others.create({
                data: {
                    username: to,
                    userId: username,
                    balance: 0,
                }
            })
        }

        const transaction = await prisma.transaction.create({
            data: {
                userId: username,
                Lend: true,
                Amount: amt,
                To: to,
                Description: desc,
            }
        });

        await prisma.others.update({
            data: {
                balance: Number(userTo.balance) + Number(amt),
            },
            where: {
                username: to,
            }
        });
    }
    else if (to === "me") {
        let userFrom = await prisma.others.findFirst({
            where: {
                userId: username,
                username: From,
            }
        });

        if (!userFrom) {
            userFrom = await prisma.others.create({
                data: {
                    username: From,
                    userId: username,
                    balance: 0,
                }
            })
        }

        const transaction = await prisma.transaction.create({
            data: {
                userId: username,
                Lend: true,
                Amount: (-1) * Number(amt),
                To: From,
                Description: desc,
            }
        });

        await prisma.others.update({
            data: {
                balance: Number(userFrom.balance) - Number(amt),
            },
            where: {
                username: From,
            }
        });
    }
    else {
        let userFrom = await prisma.others.findFirst({
            where: {
                userId: username,
                username: From,
            }
        });

        if (!userFrom) {
            userFrom = await prisma.others.create({
                data: {
                    username: From,
                    userId: username,
                    balance: 0,
                }
            })
        }

        let userTo = await prisma.others.findFirst({
            where: {
                userId: username,
                username: to,
            }
        });

        if (!userTo) {
            userTo = await prisma.others.create({
                data: {
                    username: to,
                    userId: username,
                    balance: 0,
                }
            })
        }
        
        
        const transaction = await prisma.transaction.create({
            data: {
                userId: username,
                Lend: false,
                Amount: 0,
                To: "Indirect Payment",
                Description: `${From} paid ₹${amt} to ${to}`,
            }
        });


        await prisma.others.update({
            data: {
                balance: Number(userFrom.balance) - Number(amt),
            },
            where: {
                username: From,
            }
        });

        await prisma.others.update({
            data: {
                balance: Number(userTo.balance) + Number(amt),
            },
            where: {
                username: to,
            }
        });
    }
}