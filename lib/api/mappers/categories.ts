import type { Category } from "@/types";
import type { Tables } from "@/types/database";

export function mapCategoryRowToCategory(row: Tables<"categories">): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parent_id ?? undefined,
    description: row.description ?? undefined,
    imageUrl: row.image_url ?? undefined,
  };
}
