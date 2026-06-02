# HL-3 ETA Engine Specification

## Overview
HL-3 implements a high-performance, multi-factor Estimated Time of Arrival (ETA) engine for VendorHub. It goes beyond simple distance-based calculations by incorporating store fulfillment readiness, transport modes, real-time traffic, and environmental risks.

## Core Components

### 1. Distance-Time Engine
Converts geospatial distance into travel time based on:
- **Transport Modes**: Walking, Bike, Scooter, Car, Delivery Vehicle.
- **Traffic Intensity**: Light, Normal, Heavy, Gridlock.

### 2. Store Fulfillment Engine
Models the internal operations of different store types:
- **Dark Stores**: Optimized for <10 min dispatch.
- **Supermarkets**: Factoring in larger picking areas and higher backlogs.
- **Pharmacies**: Specialized packing and verification timings.

### 3. Risk Engine
Identifies and quantifies delivery risks:
- **Traffic Risk**: Based on congestion patterns.
- **Capacity Risk**: Based on store backlog and operational pressure.
- **Weather Risk**: Impact on delivery vehicle speed and safety.

### 4. Confidence Engine
Provides a confidence score (0-1) and level (Very High to Unreliable) for every estimate based on data freshness and environmental stability.

## Database Schema
- `eta_requests`: Audit trail of all buyer ETA inquiries.
- `eta_results`: Historical record of predictions for performance tuning.
- `eta_intelligence`: Aggregated store-level delivery performance metrics.

## Performance
- **Latency**: <5ms per estimate.
- **Scalability**: Certified for 10K concurrent stores and 100K products.
