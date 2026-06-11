# eFPS Intelligence

## Intelligent Fair Price Shop Management, Analytics, Compliance & Decision Support Platform

**Version:** 1.0
**Document Type:** Product Requirements Document (PRD)
**Product Category:** Public Distribution System (PDS) Management Platform
**Deployment Model:** Government Cloud / State Data Center / SaaS
**Prepared For:** State Food & Civil Supplies Department

---

# 1. Executive Summary

## 1.1 Purpose

eFPS Intelligence is a centralized, intelligent, and scalable platform designed to digitize and manage all operational, financial, compliance, and analytical activities of Fair Price Shops (FPS) operating under the Public Distribution System (PDS).

The platform provides real-time visibility into stock allocation, beneficiary distribution, dealer operations, financial settlements, government synchronization, audit compliance, and advanced analytics through a single integrated ecosystem.

---

## 1.2 Vision

To create a transparent, fraud-resistant, data-driven, and fully auditable Public Distribution System capable of serving millions of beneficiaries while providing actionable intelligence to dealers, district officers, and government administrators.

---

## 1.3 Key Outcomes

* Complete FPS digitization
* Real-time stock tracking
* Automated dealer commission processing
* State-wide analytics and reporting
* Fraud detection and anomaly monitoring
* Audit-ready operational records
* Government system integration
* Predictive intelligence for planning and compliance

---

# 2. Business Objectives

| ID  | Objective                                  |
| --- | ------------------------------------------ |
| O1  | Digitize FPS operations                    |
| O2  | Provide real-time stock visibility         |
| O3  | Reduce fraud and leakage                   |
| O4  | Automate commission calculations           |
| O5  | Improve government reporting               |
| O6  | Enable state-wide analytics                |
| O7  | Ensure complete audit traceability         |
| O8  | Support future multi-state deployment      |
| O9  | Improve beneficiary service delivery       |
| O10 | Enable predictive operational intelligence |

---

# 3. Stakeholders

## Primary Stakeholders

### FPS Dealer

Responsible for daily commodity distribution and inventory operations.

### Beneficiary

Citizen receiving subsidized commodities.

### District Supply Officer

Monitors FPS operations within assigned jurisdiction.

### State Administrator

Manages statewide operations and policy implementation.

---

## Secondary Stakeholders

### Government Agencies

Provide allocation, beneficiary, and policy data.

### Banking Institutions

Handle commission settlements and reconciliation.

### Auditors

Verify compliance and identify discrepancies.

### System Administrators

Maintain platform infrastructure and security.

---

# 4. User Roles & Access Control

## Dealer

### Permissions

* Login
* View dashboard
* Manage transactions
* View stock
* Generate reports
* View commission statements
* Receive notifications

---

## District Officer

### Permissions

* View all assigned FPS
* View district reports
* Monitor inventory
* Monitor beneficiary activity
* Review audit findings

---

## State Administrator

### Permissions

* Manage users
* Manage allocations
* Configure policies
* Manage integrations
* View statewide analytics
* Override operational settings

---

## Auditor

### Permissions

* Read-only access
* Generate audit reports
* Review transaction history
* Review inventory movement
* Export compliance reports

---

# 5. Functional Modules

## Module 01 — Authentication & Identity Management

### Features

* Secure Login
* Refresh Token Rotation
* Password Recovery
* OTP Verification
* Session Management
* Device Tracking

### Inputs

* FPS ID
* Username
* Password

### Outputs

* JWT Access Token
* Refresh Token

### Acceptance Criteria

* Failed login attempts logged
* Session expiration enforced
* Multi-device tracking supported

---

## Module 02 — Dealer Management

### Features

* Create Dealer
* Update Dealer
* Suspend Dealer
* Activate Dealer
* Manage Bank Information

### Dealer Profile Fields

* Dealer Name
* FPS ID
* Mobile Number
* Email
* District
* Taluka
* Village
* Address
* Bank Account Number
* IFSC Code
* Status

---

## Module 03 — Beneficiary Management

### Features

* Registration
* Search
* Profile View
* Quota Tracking
* Family Member Management

### Beneficiary Fields

* Ration Card Number
* Aadhaar Number
* Mobile Number
* Family Head
* Category
* Address
* Village
* District

### Validation Rules

* Duplicate Aadhaar prohibited
* Duplicate ration card prohibited
* Mobile number validation required

---

## Module 04 — Stock Allocation & Lifting

### Features

* Allocation Creation
* Allocation Approval
* Stock Receipt Confirmation
* Warehouse Mapping

### Commodity Types

* Rice
* Wheat
* Sugar
* Kerosene
* Pulses
* State-Specific Commodities

---

## Module 05 — Inventory Intelligence

### Features

* Opening Stock
* Incoming Stock
* Inventory Ledger
* Closing Stock
* Stock Adjustment
* Wastage Tracking

### Formula

Closing Stock = Opening Stock + Received Stock − Sold Stock − Adjustments

### Alerts

* Low Stock Alert
* Negative Stock Alert
* Allocation Delay Alert

---

## Module 06 — Transaction Management

### Features

* Beneficiary Verification
* Commodity Distribution
* Receipt Generation
* Transaction History

### Payment Modes

* CBDC
* UPI
* Cash
* Manual Entry

### Validation

* No duplicate collection
* No quota violation
* No negative stock generation

---

## Module 07 — CBDC Intelligence Engine

### Features

* Payment Request
* Transaction Verification
* Settlement Tracking
* Refund Processing

### Transaction States

* Initiated
* Pending
* Success
* Failed
* Refunded

---

## Module 08 — Government Synchronization

### Imports

* Beneficiaries
* Dealer Information
* Allocations
* Quotas
* Policy Updates

### Exports

* Monthly Sales
* Commodity Distribution
* Stock Position
* Audit Reports

### Reliability Requirements

* Retry Queue
* Dead Letter Queue
* Sync Monitoring Dashboard

---

## Module 09 — Reporting & Analytics

### Reports

* Monthly Sales Report
* Inventory Report
* Commodity Report
* Beneficiary Report
* Allocation Report
* Commission Report
* Audit Report

### Export Formats

* PDF
* CSV
* Excel

---

## Module 10 — Commodity Intelligence

### Metrics

* Commodity Distribution Trends
* District Performance
* Allocation Efficiency
* Commodity Consumption Patterns
* FPS Rankings

---

## Module 11 — Beneficiary Intelligence

### Features

* Pending Beneficiary List
* Collection Trends
* Missed Distribution Analysis
* Beneficiary Activity Dashboard

---

## Module 12 — Commission Intelligence

### Inputs

* Commodity Type
* Quantity Sold
* Commission Rate
* TDS Rules

### Outputs

* Gross Commission
* TDS Deduction
* Net Commission

---

## Module 13 — Financial Intelligence

### Features

* Income Tracking
* Expense Tracking
* Profit & Loss Calculation
* Settlement Tracking

---

## Module 14 — Audit Intelligence

### Features

* CSV Import
* Compliance Verification
* Stock Reconciliation
* Audit Evidence Generation

### Fraud Detection Rules

* Duplicate Beneficiaries
* Ghost Beneficiaries
* Inventory Mismatch
* Unusual Sales Patterns

---

## Module 15 — Notification Center

### Channels

* SMS
* Email
* In-App Notification

### Events

* OTP Delivery
* Allocation Received
* Low Stock
* Monthly Reports
* Audit Findings

---

## Module 16 — FPS Directory

### Search Filters

* District
* Taluka
* Village
* Dealer
* Status

---

## Module 17 — AI Intelligence Engine (Future Ready)

### Capabilities

* Demand Forecasting
* Stock Prediction
* Fraud Detection
* Dealer Risk Scoring
* Beneficiary Trend Analysis
* Predictive Allocation Planning

---

# 6. Dashboard Requirements

## Dealer Dashboard

### Widgets

* Current Inventory
* Today's Transactions
* Monthly Sales
* Pending Beneficiaries
* Commission Summary
* Alerts

---

## District Dashboard

### Widgets

* District Distribution
* FPS Performance
* Commodity Movement
* Audit Alerts

---

## State Dashboard

### Widgets

* State Inventory
* Beneficiary Coverage
* Distribution Analytics
* Fraud Alerts
* Performance Heatmaps

---

# 7. Non-Functional Requirements

## Availability

99.9% uptime

## Performance

* API Response < 300ms (95th percentile)
* Dashboard Load < 2 seconds

## Scalability

* 10,000+ FPS
* 5 Million Beneficiaries
* 50 Million Transactions

## Security

* JWT Authentication
* Refresh Token Rotation
* RBAC Authorization
* TLS 1.3
* AES-256 Encryption

## Reliability

* Automatic Backups
* Disaster Recovery
* Multi-Zone Deployment

---

# 8. Audit Requirements

Every change must record:

* User ID
* Timestamp
* Action Type
* Old Value
* New Value
* IP Address
* Device Information

Audit records must be immutable.

---

# 9. Core Database Entities

* Users
* Roles
* Permissions
* Dealers
* Beneficiaries
* Ration Cards
* Commodities
* Stock Allocations
* Inventory Movements
* Transactions
* Payments
* Commissions
* Expenses
* Audit Logs
* Notifications
* Reports
* Sessions

---

# 10. Technology Architecture

Frontend:

* Next.js

Backend:

* NestJS

Database:

* PostgreSQL

Caching:

* Redis

Background Jobs:

* BullMQ

Storage:

* Cloudflare R2

Messaging:

* MSG91

Authentication:

* JWT + Refresh Tokens

Deployment:

* Docker
* Kubernetes

---

# 11. Success Metrics

Operational Metrics

* 99% Allocation Accuracy
* 99.5% Transaction Success Rate
* <1% Inventory Variance

Business Metrics

* 90% Reduction in Manual Reporting
* 70% Reduction in Audit Discrepancies
* 80% Reduction in Stock Reconciliation Time

---

# 12. Product Roadmap

## Phase 1

Core Operations Platform

## Phase 2

Advanced Analytics

## Phase 3

AI Intelligence Engine

## Phase 4

State-Wide Multi-Tenant Expansion

## Phase 5

National PDS Integration Platform
