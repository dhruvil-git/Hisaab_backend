import { PrismaClient, User } from "@prisma/client"
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt'

const prisma = new PrismaClient();
const SECRET_KEY = process.env.JWT_SECRET || 'Secret_of_JWT';

const saltRounds = 11;
const hashPassword = async (plainTextPassword: string): Promise<string> => {
    const hash = await bcrypt.hash(plainTextPassword, saltRounds);
    return hash;
};

export async function ValidateUser(password: string, email?: string, username?: string): Promise<User | null> {
    if (email != '') {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user)
            return null;

        const passkey = user.password;

        let userFrom = await prisma.others.findFirst({
            where: {
                userId: user.username,
                username: "me",
            }
        });

        if (!userFrom) {
            userFrom = await prisma.others.create({
                data: {
                    username: "me",
                    userId: user.username,
                    balance: 0,
                }
            })
        }
        
        if (await bcrypt.compare(password, passkey))
            return user;
    }
    
    if (username != '') {
        const user = await prisma.user.findUnique({
            where: { username },
        });
        
        if (!user)
            return null;
        
        let userFrom = await prisma.others.findFirst({
            where: {
                userId: user.username,
                username: "me",
            }
        });
    
        if (!userFrom) {
            userFrom = await prisma.others.create({
                data: {
                    username: "me",
                    userId: user.username,
                    balance: 0,
                }
            })
        }
        
        const passkey = user.password;

        if (await bcrypt.compare(password, passkey))
            return user;
    }

    return null;
}


export function GenerateToken(user: User): string {
    const payload = {
        id: user.id,
        username: user.username,
        email: user.email,
    }

    const token = jwt.sign(payload, SECRET_KEY, {
        expiresIn: '1h',
    });
    return token;
}

export async function CheckUsername(username: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { username },
    });

    if (user)
        return true;

    return false;
}

export async function CheckEmail(email: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (user)
        return true;

    return false;
}

export async function CreateUser(name: string, email: string, username: string, password: string) {
    const passkey = await hashPassword(password)
    const user = await prisma.user.create({
        data: { username, password: passkey, name, email }
    });
}