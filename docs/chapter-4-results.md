# CHAPTER FOUR
# SYSTEM IMPLEMENTATION, TESTING, AND EVALUATION

## 4.1 Introduction

This chapter presents the implementation outcome and empirical evaluation of the multi-tenant SaaS inventory management platform described in Chapters One to Three. The evaluation was executed against live local service instances using the scripted workload in `scripts/evaluate-platform.ts`, and the raw results were persisted to `scripts/results.json` (run started `2026-11-09T13:45:18.498Z`, finished `2026-11-09T13:45:48.216Z`, Node `v24.21.0`).

The chapter reports evidence for the three evaluation metrics defined in Chapter Three: data-isolation integrity, API response time under simulated load, and tenant scalability. It also verifies the four project objectives stated in Chapter One.

## 4.2 System Architecture and Execution Environment

### 4.2.1 Implemented Architecture

| Layer / Component | Implementation in This Evaluation |
|---|---|
| Architectural style | Multi-tenant SaaS with microservices decomposition |
| Client layer | React.js web client (project scope); evaluation exercised REST endpoints directly |
| Service layer | NestJS services: Authentication/Tenant Management, Inventory, Order/Sales, Notification |
| Data isolation model | Shared PostgreSQL database, separate schema per tenant (`tenant_<tenantId>`), plus `platform` schema for global tenant/user records |
| Tenant provisioning | Native programmatic provisioning: `TenantConnectionService.createTenantSchema()` / `ensureTenantTables()` create tenant schemas and required tables (`products`, `stock_movements`, `sales`, `sale_items`, `notifications`) from entity metadata; table/column synchronization supports schema evolution |
| Inter-service communication | REST over HTTP (Order service calls Inventory service with bearer token); RabbitMQ event channel `low_stock_alerts` for asynchronous low-stock notifications |
| Authentication | JWT bearer tokens carrying verified `userId`, `tenantId`, and `role`; protected endpoints validate token claims |
| Container/runtime dependencies | PostgreSQL 16 and RabbitMQ 3 (management image) running in Docker containers |

### 4.2.2 Execution Environment Specifications

| Item | Specification |
|---|---|
| Host operating system | Microsoft Windows 10.0.19045 |
| CPU | Intel(R) Core(TM) i5-5300U CPU @ 2.30GHz |
| Physical memory (RAM) | 7.89 GB |
| Node.js runtime | v24.21.0 |
| Evaluation script | `scripts/evaluate-platform.ts` executed via `tsx` |
| Database container | `orgstack-postgres` (`postgres:16`), port `5432`, database `orgstack_db` |
| Message broker container | `orgstack-rabbitmq` (`rabbitmq:3-management`), AMQP `5672`, management `15672` |
| Service endpoints | Auth `http://localhost:3001`, Inventory `http://localhost:3002`, Orders `http://localhost:3003`, Notifications `http://localhost:3004` |
| Test data isolation | Evaluation created dedicated tenants (Alpha/Beta/perf/scale tenants) with unique timestamped emails; isolation assertions used only Alpha/Beta contexts |

### 4.2.3 Evaluation Notes

- The inventory product-creation failure observed in the prior run (`POST /inventory/products` returning HTTP 500 due to tenant-schema/table resolution issues) was resolved by normalizing native tenant schema provisioning and ensuring tenant-scoped table creation/synchronization in service data paths. In this run, product creation, stock movement, order creation, and notification access succeeded for authenticated tenant contexts.
- Performance and scalability measurements were collected in a controlled local development environment, not a production cloud deployment. Results are empirical for the stated environment and workload profile.

## 4.3 Data Isolation Integrity Test Matrix

The isolation tests used two independent tenants (Tenant Alpha `c1787148-e202-460a-91a1-e2f8a6f84326`, Tenant Beta `d66c3f0c-ef24-471f-ae01-212e14eb4010`). Tenant Alpha created three products and two completed sales; Tenant Beta created its own product. Cross-tenant reads, writes, and tenant-header spoofing were attempted with authenticated requests.

| Test ID | Authenticated Context | Target / Attempted Operation | Expected Result | Actual Result | HTTP Status | Outcome |
|---|---|---|---|---:|---:|---|
| ISO-001 | Tenant Beta | `GET /inventory/products/{alphaProductId}` (read Alpha product by ID) | HTTP 404 (not found in tenant scope) or 403 | HTTP 404 `Product not found` for `/inventory/products/4e706d21-99b6-46f0-a28f-86902b6ef382` | 404 | PASS |
| ISO-002 | Tenant Beta | `GET /orders` (attempt to view Alpha sales) | HTTP 200 with empty array / no Alpha data | HTTP 200, `count=0`, `hasAlphaRef=false`, body `[]` | 200 | PASS |
| ISO-003 | Tenant Beta | `GET /notifications` (attempt to view Alpha notifications) | HTTP 200 with empty array | HTTP 200, `count=0`, body `[]` | 200 | PASS |
| ISO-004 | Tenant Beta | `PATCH /inventory/products/{alphaProductId}` with `{unitPrice:0.01}` | HTTP 404/403/400 and Alpha price unchanged | HTTP 404; Alpha re-check returned HTTP 200 with `unitPrice=100.00` (`unchanged=true`) | 404 | PASS |
| ISO-005 | Tenant Alpha token | `GET /inventory/products` with spoofed `X-Tenant-Id` set to Tenant Beta | System ignores client tenant header and returns Tenant Alpha data | HTTP 200, `seesAlpha=true`, `seesBeta=false`, `count=3` (Alpha products returned) | 200 | PASS |

**Isolation summary:** 5/5 tests passed (100% pass rate). No cross-tenant read, write, or header-injection leakage was observed.

## 4.4 API Response Time Under Simulated Load

Load tests were executed by `scripts/evaluate-platform.ts` against representative protected endpoints using a dedicated performance tenant. Concurrency levels were 1, 10, and 25 virtual users. Per-user iterations were endpoint-specific (login/products/notifications: 12/4/2 requests per user by level; stock movements/orders: 6/2/1 requests per user by level, as recorded in the raw test design).

### 4.4.1 Response-Time and Throughput Results

| Endpoint | Concurrency (VUsers) | Total Requests | Avg Latency (ms) | Median (ms) | P90 (ms) | P95 Latency (ms) | P99 (ms) | Min (ms) | Max (ms) | Throughput (req/s) | Error Rate (%) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `POST /auth/login` | 1 | 12 | 129.00 | 118.69 | 133.63 | 228.01 | 228.01 | 110.76 | 228.01 | 7.73 | 0.00 |
| `GET /inventory/products` | 1 | 12 | 10.65 | 10.41 | 12.27 | 13.02 | 13.02 | 8.30 | 13.02 | 90.96 | 0.00 |
| `POST /inventory/stock-movements` | 1 | 6 | 22.76 | 22.25 | 26.61 | 26.61 | 26.61 | 20.78 | 26.61 | 43.30 | 0.00 |
| `POST /orders` | 1 | 6 | 87.13 | 81.36 | 131.56 | 131.56 | 131.56 | 68.07 | 131.56 | 11.43 | 0.00 |
| `GET /notifications` | 1 | 12 | 27.42 | 25.94 | 30.03 | 46.00 | 46.00 | 22.78 | 46.00 | 36.03 | 0.00 |
| `POST /auth/login` | 10 | 40 | 365.34 | 318.60 | 620.09 | 734.52 | 867.74 | 181.46 | 867.74 | 23.16 | 0.00 |
| `GET /inventory/products` | 10 | 40 | 93.17 | 40.17 | 305.87 | 325.15 | 365.57 | 11.04 | 365.57 | 88.11 | 0.00 |
| `POST /inventory/stock-movements` | 10 | 20 | 128.18 | 127.90 | 140.70 | 143.64 | 146.73 | 109.54 | 146.73 | 73.74 | 0.00 |
| `POST /orders` | 10 | 20 | 395.46 | 372.13 | 594.52 | 680.86 | 716.79 | 140.41 | 716.79 | 23.15 | 0.00 |
| `GET /notifications` | 10 | 40 | 144.51 | 96.26 | 364.67 | 398.27 | 494.80 | 29.18 | 494.80 | 57.98 | 0.00 |
| `POST /auth/login` | 25 | 50 | 811.94 | 936.91 | 1028.99 | 1058.95 | 1170.32 | 251.64 | 1170.32 | 24.72 | 0.00 |
| `GET /inventory/products` | 25 | 50 | 171.17 | 178.18 | 229.64 | 255.16 | 269.68 | 90.38 | 269.68 | 128.11 | 0.00 |
| `POST /inventory/stock-movements` | 25 | 25 | 229.78 | 221.26 | 327.95 | 328.30 | 336.48 | 133.29 | 336.48 | 71.94 | 0.00 |
| `POST /orders` | 25 | 25 | 704.50 | 733.93 | 893.43 | 894.36 | 902.44 | 511.75 | 902.44 | 27.22 | 0.00 |
| `GET /notifications` | 25 | 50 | 347.06 | 338.02 | 406.19 | 422.97 | 432.23 | 286.29 | 432.23 | 68.36 | 0.00 |

### 4.4.2 Performance Interpretation

| Metric | Result |
|---|---|
| Total performance rows | 15 |
| Rows with 0.00% error rate | 15/15 (100%) |
| Rows meeting the Chapter 3 proposed P95 target (< 1000 ms) | 14/15 |
| Row above proposed P95 target | `POST /auth/login` at 25 VUsers: P95 = 1058.95 ms, error rate = 0.00% |

The login endpoint is computationally heavier because it performs credential verification and token issuance; all inventory, stock-movement, order, and notification measurements remained below 1000 ms P95 in this run. Importantly, the evaluation achieved **0% error rates across 1, 10, and 25 simulated virtual users** for all measured endpoints.

## 4.5 Tenant Scalability Evaluation

Scalability was tested by provisioning fresh tenant accounts and running mixed tenant-scoped operations (`GET /inventory/products` and `POST /orders`, 6 requests per active tenant context). The evaluated tenant-count stages were 2, 5, and 15 tenants.

| Tenant Count | Provisioned Successfully | Total Active VUsers | Total Requests | Avg Latency (ms) | P95 Latency (ms) | Throughput (req/s) | Error Rate (%) | Notes |
|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 2 | 2/2 | 2 | 12 | 57.72 | 134.66 | 32.57 | 0.00 | Mixed GET products + POST order; 6 req/tenant; host resource impact not sampled in-script. |
| 5 | 5/5 | 5 | 30 | 93.72 | 235.40 | 49.93 | 0.00 | Mixed GET products + POST order; 6 req/tenant; host resource impact not sampled in-script. |
| 15 | 15/15 | 15 | 90 | 317.56 | 823.71 | 44.19 | 0.00 | Mixed GET products + POST order; 6 req/tenant; host resource impact not sampled in-script. |

**Scalability summary:** All requested tenant stages (2, 5, and 15) provisioned successfully and completed mixed tenant-scoped workloads with 0.00% error rate. Latency increased with tenant/VUser count as expected in the local test environment, but P95 remained below the 1000 ms proposed target at the 15-tenant stage (823.71 ms).

## 4.6 Summary of Objective Verification

The table below maps Chapter One objectives to the implemented evidence from this evaluation.

| Chapter 1 Objective | Verification Evidence | Result |
|---|---|---|
| **Objective 1:** Review existing literature on multi-tenant SaaS design, microservices architecture, and inventory management systems to establish evidence-based design principles. | Chapters Two and Three document the reviewed literature and translate it into design decisions: shared PostgreSQL database with separate schema per tenant, microservices decomposition, REST/JWT service boundaries, and RabbitMQ-based asynchronous notifications. | Achieved (documented in Chapters 2–3). |
| **Objective 2:** Design a tenant-aware microservices architecture covering Authentication/Tenant Management, Inventory, Order/Sales, and Notification services with clear responsibilities and interfaces. | The implemented system exposes service-specific REST endpoints (`/auth/*`, `/inventory/*`, `/orders*`, `/notifications*`), uses JWT-derived tenant context, coordinates order stock deduction through the Inventory service, and publishes/consumes low-stock events through RabbitMQ. | Achieved and exercised by evaluation. |
| **Objective 3:** Implement core microservices with isolated tenant data using a shared-database, separate-schema-per-tenant strategy enforced at the data access layer. | Native tenant provisioning creates `tenant_<id>` schemas and required tables programmatically. All isolation tests (ISO-001–ISO-005) passed: cross-tenant product read denied (404), cross-tenant sales/notifications not exposed (empty scoped results), cross-tenant update denied with unchanged source data, and spoofed `X-Tenant-Id` ignored in favor of token claims. | Achieved (5/5 isolation tests passed, 100%). |
| **Objective 4:** Evaluate the system against API response time under simulated load, concurrent-tenant scalability, and data-isolation integrity, and report results. | `scripts/evaluate-platform.ts` produced `scripts/results.json` with 5 isolation cases, 15 performance rows (1/10/25 VUsers), and 3 scalability rows (2/5/15 tenants). All measured requests completed with 0.00% error rate; scalability stages provisioned 2/2, 5/5, and 15/15 tenants successfully; isolation passed 5/5. | Achieved with empirical local-environment evidence. |

## 4.7 Chapter Conclusion

The Chapter Four evaluation provides empirical evidence that the implemented platform satisfies its core multi-tenant and microservices objectives in the tested environment. Native per-tenant schema/table provisioning and tenant-scoped data access prevented cross-tenant access in all isolation scenarios. The platform handled representative API workloads at 1, 10, and 25 simulated virtual users with 0% observed error rates, and it provisioned and exercised 2, 5, and 15 tenant contexts successfully in the scalability test. These results support the feasibility of the proposed shared-schema-per-tenant, microservices-based SaaS inventory architecture for the project scope; production-scale claims remain bounded by the controlled local test environment documented in this chapter.
