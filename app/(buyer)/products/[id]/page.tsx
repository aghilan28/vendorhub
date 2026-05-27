import ProductPage from "../../product/[slug]/page";

export default function ProductAliasPage({ params }: { params: Promise<{ id: string }> }) {
  return ProductPage({
    params: params.then(({ id }) => ({ slug: id })),
  });
}
