import { notFound } from "next/navigation";
import { Heart, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import Image from "next/image";
import { PriceDisplay } from "@/components/commerce/price-display";
import { RatingDisplay } from "@/components/commerce/rating-display";
import { StockBadge } from "@/components/commerce/stock-badge";
import { PageContainer } from "@/components/layout/page-container";
import { SectionWrapper } from "@/components/layout/section-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductGeoPanel } from "@/features/geo/components/product-geo-panel";
import { RelatedProductStrip } from "@/features/intelligence/components/recommendation-strip";
import { ProductDeliveryPromise } from "@/features/logistics/components/delivery-commerce-panels";
import { ProductAddActions } from "@/features/marketplace/components/product-add-actions";
import { formatEta } from "@/features/marketplace/lib/data";
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
        <div className="rounded-lg border border-border bg-surface p-3 shadow-sm">
          <div className="relative aspect-square overflow-hidden rounded-md bg-slate-100">
            {product.imageUrl ? <Image src={product.imageUrl} alt={product.name} fill priority sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover" /> : null}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[product.imageUrl, product.imageUrl, product.imageUrl, product.imageUrl].map((image, index) => (
              <div key={index} className="relative aspect-square overflow-hidden rounded-md bg-slate-100">
                {image ? <Image src={image} alt={`${product.name} view ${index + 1}`} fill sizes="120px" className="object-cover" /> : null}
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-5 rounded-lg border border-border bg-surface p-5 shadow-sm lg:sticky lg:top-24 lg:h-fit">
          <div className="flex flex-wrap gap-2">
            <Badge variant="default"><ShieldCheck className="size-3" /> Verified seller</Badge>
            <Badge variant="secondary">{product.category.name}</Badge>
          </div>
          <div>
            <h1 className="text-2xl font-semibold leading-tight text-primary-text sm:text-3xl">{product.name}</h1>
            <p className="mt-2 text-sm text-secondary-text">{product.vendor.name} · {product.vendor.locality}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <RatingDisplay rating={product.rating} count={product.reviewCount} />
            <StockBadge count={product.stockCount} />
            <span className="inline-flex items-center gap-1 text-sm text-secondary-text"><Truck className="size-4" /> {formatEta(product.deliveryMinutes)}</span>
          </div>
          <div className="rounded-md bg-slate-50 p-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl"><PriceDisplay value={product.price} currency={product.currency} /></span>
              {product.originalPrice ? <span className="text-sm text-secondary-text line-through">₹{product.originalPrice}</span> : null}
              <span className="text-sm text-secondary-text">/ {product.unit}</span>
            </div>
          </div>
          <ProductAddActions product={product} />
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

      <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="font-semibold text-primary-text">Reviews preview</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {["Arrived exactly within the promised window.", "Stock and freshness matched the product page."].map((review) => (
            <blockquote key={review} className="rounded-md bg-slate-50 p-4 text-sm text-secondary-text">
              “{review}”
            </blockquote>
          ))}
        </div>
      </section>

      <SectionWrapper title="Similar products" description="Related products ranked by product meaning, category fit, stock, and local seller quality.">
        <RelatedProductStrip productId={product.id} products={relatedProducts} />
      </SectionWrapper>
    </PageContainer>
  );
}
