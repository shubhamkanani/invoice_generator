import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { connectToDatabase } from "@/lib/db/connect";
import { UserModel, isDuplicateKeyError, isObjectIdString, type UserDoc } from "@/lib/db/models";

export type UserDTO = { id: string; name: string; email: string };

export class EmailTakenError extends Error {
  constructor() {
    super("That email is already registered");
    this.name = "EmailTakenError";
  }
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const toDTO = (user: Pick<UserDoc, "_id" | "name" | "email">): UserDTO => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
});

export async function createUser(input: { name: string; email: string; password: string }): Promise<UserDTO> {
  await connectToDatabase();
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await UserModel.create({ name: input.name.trim(), email: normalizeEmail(input.email), passwordHash });
    return toDTO(user);
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new EmailTakenError();
    throw error;
  }
}

// Compared against when the email is unknown, so both failure paths take the same time.
let decoyHash: Promise<string> | undefined;

/** Returns the user when the email and password match, otherwise null. */
export async function authenticateUser(email: string, password: string): Promise<UserDTO | null> {
  await connectToDatabase();
  const user = await UserModel.findOne({ email: normalizeEmail(email) }).lean();
  if (!user) {
    await verifyPassword(password, await (decoyHash ??= hashPassword("decoy-password")));
    return null;
  }
  return (await verifyPassword(password, user.passwordHash)) ? toDTO(user) : null;
}

export async function getUserById(id: string): Promise<UserDTO | null> {
  if (!isObjectIdString(id)) return null;
  await connectToDatabase();
  const user = await UserModel.findById(id).lean();
  return user ? toDTO(user) : null;
}
