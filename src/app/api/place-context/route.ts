import { fail, ok } from "@/lib/api";
import { getPlaceContexts } from "@/lib/place-context";
import { listPlaces } from "@/lib/store";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const requestedPlaceIds = new Set(
      (url.searchParams.get("placeIds") ?? "")
        .split(",")
        .map((placeId) => placeId.trim())
        .filter(Boolean),
    );
    const places = await listPlaces();
    const filteredPlaces = requestedPlaceIds.size > 0 ? places.filter((place) => requestedPlaceIds.has(place.id)) : places;

    return ok(await getPlaceContexts(filteredPlaces));
  } catch (error) {
    return fail(error);
  }
}
