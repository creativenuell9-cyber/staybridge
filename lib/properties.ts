import "server-only";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface PublishedProperty {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
  imageUrl: string | null;
  photos: { id: string; alt_text: string; imageUrl: string | null }[];
  rooms: {
    id: string;
    name: string;
    description: string;
    maximum_occupants: number;
    bed_configuration: string;
    price_per_night: number;
    facilities: string[];
    booking_conditions: string | null;
  }[];
  facilities: string[];
}

const publicPropertySelect =
  "id,name,slug,category,description,address,city,state,country,facilities,property_photos(id,storage_path,alt_text),rooms(id,name,description,maximum_occupants,bed_configuration,price_per_night,facilities,booking_conditions)";

const publicPropertySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  category: z.string(),
  description: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  facilities: z.array(z.string()).default([]),
  property_photos: z.array(
    z.object({
      id: z.string().uuid(),
      storage_path: z.string(),
      alt_text: z.string(),
    }),
  ).default([]),
  rooms: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      description: z.string(),
      maximum_occupants: z.number(),
      bed_configuration: z.string(),
      price_per_night: z.coerce.number(),
      facilities: z.array(z.string()).default([]),
      booking_conditions: z.string().nullable(),
    }),
  ).default([]),
});

async function signPhotoUrls(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  photos: { storage_path: string }[],
) {
  if (photos.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase.storage
    .from("property-photos")
    .createSignedUrls(
      photos.map((photo) => photo.storage_path),
      900,
    );

  if (error) {
    throw new Error(`Could not load approved property photos: ${error.message}`);
  }

  const signedUrls = new Map<string, string>();
  (data ?? []).forEach((item) => {
    if (item.path && item.signedUrl) {
      signedUrls.set(item.path, item.signedUrl);
    }
  });
  return signedUrls;
}

function mapPublicProperty(
  record: z.infer<typeof publicPropertySchema>,
  signedUrls: Map<string, string>,
): PublishedProperty {
  const photos = record.property_photos.map((photo) => ({
    id: photo.id,
    alt_text: photo.alt_text,
    imageUrl: signedUrls.get(photo.storage_path) ?? null,
  }));

  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    category: record.category,
    description: record.description,
    address: record.address,
    city: record.city,
    state: record.state,
    country: record.country,
    imageUrl: photos.find((photo: PublishedProperty["photos"][number]) => photo.imageUrl)?.imageUrl ?? null,
    photos,
    rooms: record.rooms,
    facilities: record.facilities,
  };
}

export async function getPublishedProperties(limit = 12) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("properties")
    .select(publicPropertySelect)
    .eq("publication_status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Could not load approved properties: ${error.message}`);
  }

  const records = z.array(publicPropertySchema).parse(data ?? []);
  const photos = records.flatMap((record) => record.property_photos);
  const signedUrls = await signPhotoUrls(supabase, photos);

  return records.map((record) => mapPublicProperty(record, signedUrls));
}

export async function getPublishedPropertyBySlug(slug: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("properties")
    .select(publicPropertySelect)
    .eq("slug", slug)
    .eq("publication_status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load the approved property: ${error.message}`);
  }
  if (!data) {
    return null;
  }

  const record = publicPropertySchema.parse(data);
  const signedUrls = await signPhotoUrls(supabase, record.property_photos);
  return mapPublicProperty(record, signedUrls);
}
