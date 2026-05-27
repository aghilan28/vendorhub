import { buildEmbeddingInput } from "@/lib/ai/embedding-config";
import { cosineSimilarity, createDeterministicEmbedding } from "@/lib/ai/local-embeddings";
import type { CartItem, Product } from "@/types";
import { applyDiversityBalancing, scoreHybridRank } from "./hybrid-ranking";
import { localDemandScore, popularityScore, sellerQualityScore, trendingVelocityScore } from "./marketplace-signals";
import type { ProductRecommendation, RecommendationContext } from "./types";

function productVector(product: Product) {
  return createDeterministicEmbedding(
    buildEmbeddingInput([product.name, product.description, product.category.name, product.vendor.name, product.vendor.locality, ...(product.tags ?? [])]),
  );
}

function recommendationReason(product: Product, context?: RecommendationContext) {
  if (context?.isNewUser) return "Popular nearby and available now.";
  if (context?.recentlyViewedProductIds?.length) return `More ${product.category.name.toLowerCase()} picks you may like.`;
  if ((product.reviewCount ?? 0) > 150) return "Popular nearby with a trusted seller.";
  if ((product.vendor.orderCount ?? 0) < 5500) return "Fresh local pick worth a look.";
  return "Recommended for your next basket.";
}

export function getRelatedProducts(product: Product, products: Product[], limit = 4, context?: RecommendationContext): ProductRecommendation[] {
  const sourceVector = productVector(product);
  const ranked = products
    .filter((candidate) => candidate.id !== product.id && candidate.stockCount > 0)
    .map((candidate) => {
      const similarity = (cosineSimilarity(sourceVector, productVector(candidate)) + 1) / 2;
      const categoryAffinity = candidate.category.slug === product.category.slug ? 0.22 : 0;
      const rankedProduct = scoreHybridRank({
        product: candidate,
        products,
        query: `${product.name} ${product.category.name}`,
        semanticScore: similarity,
        fuzzyScore: categoryAffinity,
        keywordScore: categoryAffinity,
        context,
      });
      return {
        ...rankedProduct,
        score: rankedProduct.score + categoryAffinity,
      };
    });

  return applyDiversityBalancing(ranked, limit).map((item) => ({
    product: item.product,
    score: item.score,
    reason: item.product.category.slug === product.category.slug ? "Similar picks from trusted local sellers." : recommendationReason(item.product, context),
    source: item.product.category.slug === product.category.slug ? "semantic_similarity" : "category_affinity",
    explanations: item.explanations,
    confidence: item.score > 0.7 ? "high" : "medium",
  }));
}

export function getHomepageRecommendations(products: Product[], cartItems: CartItem[] = [], limit = 4, context?: RecommendationContext): ProductRecommendation[] {
  const sessionContext = {
    ...context,
    cartProductIds: cartItems.map((item) => item.product.id),
    exploredCategorySlugs: [...new Set([...(context?.exploredCategorySlugs ?? []), ...cartItems.map((item) => item.product.category.slug)])],
    isNewUser: context?.isNewUser ?? cartItems.length === 0,
  };
  const contextText = cartItems.length
    ? cartItems.map((item) => `${item.product.name} ${item.product.category.name}`).join(" ")
    : [...(sessionContext.recentQueries ?? []), ...(sessionContext.exploredCategorySlugs ?? []), "high demand nearby products available now trusted sellers"].join(" ");
  const contextVector = createDeterministicEmbedding(contextText);

  const ranked = products
    .filter((product) => product.stockCount > 0)
    .map((product) => {
      const similarity = (cosineSimilarity(contextVector, productVector(product)) + 1) / 2;
      return scoreHybridRank({
        product,
        products,
        query: contextText,
        semanticScore: similarity,
        fuzzyScore: product.category.slug && sessionContext.exploredCategorySlugs?.includes(product.category.slug) ? 0.86 : 0.35,
        keywordScore: similarity > 0.7 ? 0.78 : 0.45,
        context: sessionContext,
      });
    });

  return applyDiversityBalancing(ranked, limit).map((item) => ({
    product: item.product,
    score: item.score,
    reason: cartItems.length ? "Goes well with your basket." : recommendationReason(item.product, sessionContext),
    source: cartItems.length ? "basket_context" : sessionContext.isNewUser ? "cold_start" : "session_similarity",
    explanations: item.explanations,
    confidence: item.score > 0.7 ? "high" : "medium",
  }));
}

export function getCategoryIntelligence(categorySlug: string, products: Product[]) {
  const categoryProducts = products.filter((product) => product.category.slug === categorySlug);
  const available = categoryProducts.filter((product) => product.stockCount > 0);
  const averageRating = available.reduce((sum, product) => sum + product.rating, 0) / Math.max(1, available.length);
  const fastest = [...available].sort((a, b) => (a.deliveryMinutes ?? 999) - (b.deliveryMinutes ?? 999))[0];
  const localMomentum = available.reduce((sum, product) => sum + trendingVelocityScore(product) + localDemandScore(product), 0) / Math.max(1, available.length);
  const trustDepth = available.reduce((sum, product) => sum + sellerQualityScore(product.vendor), 0) / Math.max(1, available.length);
  const popularity = available.reduce((sum, product) => sum + popularityScore(product), 0) / Math.max(1, available.length);

  return {
    availableCount: available.length,
    averageRating,
    fastest,
    localMomentum,
    trustDepth,
    popularity,
    demandSignal: localMomentum > 0.74 ? "High local momentum with time-aware demand" : popularity > 0.68 ? "High repeat demand nearby" : "Steady local demand",
  };
}
