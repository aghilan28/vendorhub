import { notFound } from "next/navigation";
import { Heart, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { PriceDisplay } from "@/components/commerce/price-display";
import { ProductGallery } from "@/components/commerce/product-gallery";
import { RatingDisplay } from "@/components/commerce/rating-display";
import { StockBadge } from "@/components/commerce/stock-badge";
import { PageContainer } from "@/components/layout/page-container";
import { SectionWrapper } from "@/components/layout/section-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductGeoPanel } from "@/features/geo/components/product-geo-panel";
import { RelatedProductStrip } from "@/features/intelligence/components/recommendation-strip";
import { BuyerTrustPanel } from "@/features/trust-os/components/buyer-trust-panel";
import { ProductDeliveryPromise } from "@/features/logistics/components/delivery-commerce-panels";
import { ProductAddActions } from "@/features/marketplace/components/product-add-actions";
import { formatEta, getProductActivityLine, getProductFreshnessLine, getProductReviewSnippets, getVendorActivityLine, getVendorHumanLine } from "@/features/marketplace/lib/data";
import { BuyerSellerTrustCard } from "@/features/trust/components/buyer-seller-trust-card";
import { getLiveProductBySlug, listVectorRelatedProducts } from "@/lib/api/queries/products";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getLiveProductBySlug(slug);
  if (!product) notFound();
  const { products: relatedProducts } = await listVectorRelatedProducts(product.id, product.category.slug, { pageSize: 12 });

  return (
    <PageContainer className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px]">
        <ProductGallery
          productName={product.name}
          items={
            product.gallery && product.gallery.length > 0
              ? product.gallery
              : product.imageUrl
                ? [{ url: product.imageUrl, thumbUrl: product.imageUrl, alt: product.name, isPrimary: true }]
                : []
          }
        />

        <aside className="space-y-5 rounded-lg border border-border bg-surface p-5 shadow-sm lg:sticky lg:top-24 lg:h-fit">
          <div className="flex flex-wrap gap-2">
            <Badge variant="default"><ShieldCheck className="size-3" /> Verified seller</Badge>
            <Badge variant="secondary">{product.category.name}</Badge>
          </div>
          <div>
            <h1 className="text-2xl font-semibold leading-tight text-primary-text sm:text-3xl">{product.name}</h1>
            <p className="mt-2 text-sm text-secondary-text">{product.vendor.name} - {product.vendor.locality}</p>
            <p className="mt-2 text-sm font-medium text-emerald-700">{getProductFreshnessLine(product)} · {getProductActivityLine(product)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <RatingDisplay rating={product.rating} count={product.reviewCount} />
            <StockBadge count={product.stockCount} />
            <span className="inline-flex items-center gap-1 text-sm text-secondary-text"><Truck className="size-4" /> {formatEta(product.deliveryMinutes)}</span>
          </div>
          <div className="rounded-md bg-slate-50 p-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl"><PriceDisplay value={product.price} currency={product.currency} /></span>
              {product.originalPrice ? <span className="text-sm text-secondary-text line-through">Rs {product.originalPrice}</span> : null}
              <span className="text-sm text-secondary-text">/ {product.unit}</span>
            </div>
          </div>
          <ProductAddActions product={product} />
          <section className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
            <h2 className="font-semibold text-primary-text">{product.vendor.name}</h2>
            <p className="mt-1 text-sm leading-6 text-secondary-text">{getVendorHumanLine(product.vendor)}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-emerald-900">
              <span className="rounded-full bg-white px-2.5 py-1">{getVendorActivityLine(product.vendor)}</span>
              <span className="rounded-full bg-white px-2.5 py-1">{product.vendor.area}</span>
            </div>
          </section>
          <BuyerSellerTrustCard vendor={product.vendor} />
          <ProductDeliveryPromise deliveryMinutes={product.deliveryMinutes} stockCount={product.stockCount} />
          <Button variant="secondary" className="w-full"><Heart /> Save for later</Button>
          <div className="grid gap-2 text-sm">
            {(product.trustSignals ?? []).map((signal) => (
              <span key={signal} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-secondary-text">
                <PackageCheck className="size-4 text-brand" /> {signal}
              </span>
            ))}
          </div>
        </aside>
      </section>

      <ProductGeoPanel product={product} />

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <h2 className="font-semibold text-primary-text">Product details</h2>
          <p className="mt-3 text-sm leading-6 text-secondary-text">{product.description}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <h2 className="font-semibold text-primary-text">Specifications</h2>
          <dl className="mt-3 space-y-2 text-sm">
            {Object.entries(product.specs ?? {}).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-3 border-b border-border pb-2 last:border-0">
                <dt className="text-secondary-text">{key}</dt>
                <dd className="font-medium text-primary-text">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <BuyerTrustPanel
        sellerName={product.vendor?.name ?? "Seller"}
        sellerVerified={Boolean(product.vendor?.verified)}
        rating={product.rating ?? 0}
        reviewCount={product.reviewCount ?? 0}
      />

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="font-semibold text-primary-text">Recent local reviews</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {getProductReviewSnippets(product).map((review) => (
            <blockquote key={`${review.name}-${review.area}`} className="rounded-md bg-slate-50 p-4 text-sm text-secondary-text">
              <p>&ldquo;{review.text}&rdquo;</p>
              <footer className="mt-3 text-xs font-medium text-primary-text">{review.name} · {review.area}</footer>
            </blockquote>
          ))}
        </div>
      </section>

      <SectionWrapper title="You may also like">
        <RelatedProductStrip productId={product.id} products={relatedProducts} />
      </SectionWrapper>
    </PageContainer>
  );
}
