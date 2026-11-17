import { publicConfig } from "../../../lib/public-config";
import { apiFailure, guardRequest } from "../../../lib/api-security";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    guardRequest(request, "config");
    return Response.json(await publicConfig(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiFailure(error, "Could not read public configuration.");
  }
}
