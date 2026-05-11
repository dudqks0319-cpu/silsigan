import { fail, ok } from "@/lib/api";
import { listPlaces } from "@/lib/store";

export async function GET() {
  try {
    return ok(await listPlaces());
  } catch (error) {
    return fail(error);
  }
}
