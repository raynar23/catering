// Dedicated route handler for user password reset by Admin GA
import { NextRequest } from "next/server";
import { PUT } from "../route";

export async function POST(req: NextRequest) {
  return PUT(req);
}
