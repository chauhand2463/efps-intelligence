Tier 1 (Operational Core)
01 Dashboard
02 Lifting Records
07 CBDC/Transactions
08 Customer Registration
10 eFPS Govt Sync

Tier 2 (Derived Intelligence)
03 Monthly Report
04 Stock Report
05 Commodity Sales
06 Commission Calc
09 Pending List
14 Bank Commission
16 Income & Expense

Tier 3 (Master & Compliance)
11 My Ads
12 MDM & ICDS
13 FPS Profile
15 Social Audit
17 Gujarat Directory

Infrastructure
PostgreSQL
Redis
BullMQ
External Systems
COMPONENT 01 — DASHBOARD
Purpose

Central control panel for dealer and officers.

Reads From
02 Lifting Records
07 Transactions
08 Customer Registration
10 Govt Sync
03 Monthly Report
04 Stock Report
05 Commodity Sales
09 Pending List
Displays
Current Stock
Today's Sales
Monthly Sales
Pending Beneficiaries
Online Status
Alerts
Commission Summary
Writes To
None
(Read-only Aggregation Layer)
Dependencies
PostgreSQL
Redis
COMPONENT 02 — LIFTING RECORDS
Purpose

Tracks stock received from government warehouses.

Inputs
Warehouse Allocation
Commodity Type
Quantity
Date
Vehicle Details
Writes To
stock_allocations
inventory_movements
Consumed By
04 Stock Report
05 Commodity Sales
06 Commission Calc
09 Pending List
Events Produced
StockReceived
AllocationCreated
AllocationUpdated
COMPONENT 03 — MONTHLY REPORT
Purpose

Generate monthly FPS reports.

Reads
Transactions
Allocations
Beneficiaries
Commissions
Outputs
Monthly Summary
PDF
Excel
CSV
Consumed By
Dashboard
Govt Sync
Auditors
COMPONENT 04 — STOCK REPORT
Purpose

Inventory intelligence.

Reads
Opening Stock
Incoming Stock
Sales
Adjustments
Formula
Closing =
Opening + Received - Sold
Outputs
Current Inventory
Daily Stock
Monthly Stock
Used By
Dashboard
Audit
Govt Sync
COMPONENT 05 — COMMODITY SALES
Purpose

Commodity analytics.

Reads
Transactions
Inventory
Beneficiaries
Outputs
Rice Sold
Wheat Sold
Sugar Sold
Trend Analysis
Used By
Commission Engine
Dashboard
Monthly Reports
COMPONENT 06 — COMMISSION CALCULATOR
Purpose

Dealer earnings calculation.

Inputs
Commodity Sold
Commission Rate
Formula
Commission =
Quantity × Govt Rate
Writes
commissions
Consumed By
Income & Expense
Bank Commission
Dashboard
COMPONENT 07 — CBDC / MANUAL TRANSACTIONS
Purpose

Core transaction engine.

This is the most critical module.

Inputs
Beneficiary
Commodity
Quantity
Payment
Validations
Quota Check
Stock Check
Duplicate Check
Writes
transactions
payments
inventory_movements
Produces Events
TransactionCompleted
PaymentCompleted
QuotaConsumed
Consumed By
05 Commodity Sales
06 Commission
09 Pending List
14 Bank Commission
15 Audit
COMPONENT 08 — CUSTOMER REGISTRATION
Purpose

Beneficiary master system.

Stores
Ration Cards
Family Members
Quota Data
Writes
beneficiaries
ration_cards
Consumed By
Transactions
Pending List
Reports
Govt Sync
COMPONENT 09 — PENDING LIST
Purpose

Find beneficiaries not yet collected.

Reads
Beneficiaries
Transactions
Quota Data
Logic
Quota Assigned
BUT
No Transaction

=
Pending
Outputs
Pending Beneficiary List
Used By
Dashboard
SMS Alerts
District Officers
COMPONENT 10 — EFPS UPDATE / GOVT SYNC
Purpose

Government integration gateway.

Imports
Allocations
Beneficiaries
Policies
Exports
Sales
Stock
Reports
External Systems
Gov FPS API
PDS API
State API
Queue Usage
BullMQ
COMPONENT 11 — MY ADS
Purpose

Dealer promotion engine.

Features
Announcements
Dealer Notices
Offers
Reads
FPS Profile
Dealer Data
COMPONENT 12 — MDM & ICDS
Purpose

School nutrition reporting.

Reads
Commodity Distribution
School Data
Outputs
Nutrition Reports
ICDS Reports
Consumed By
Government Departments
COMPONENT 13 — FPS PROFILE
Purpose

Dealer master data.

Stores
Dealer Details
FPS Details
Location
Bank Info
Referenced By
Transactions
Reports
Audit
Directory
COMPONENT 14 — BANK COMMISSION
Purpose

Commission settlement.

Inputs
Sales
Commission Data
Calculates
Gross Commission
TDS
Net Commission
Writes
bank_settlements
Consumed By
Income & Expense
Reports
COMPONENT 15 — SOCIAL AUDIT
Purpose

Compliance and fraud detection.

Inputs
Government CSV
Transactions
Inventory
Beneficiaries
Detects
Ghost Beneficiary
Duplicate Sales
Stock Leakage
Quota Abuse
Outputs
Audit Findings
Compliance Reports
COMPONENT 16 — INCOME & EXPENSE
Purpose

Dealer financial intelligence.

Inputs
Commission
Expenses
Bank Settlements
Calculates
Profit
Loss
Net Earnings
Dashboard Metrics
Monthly Income
Monthly Expense
Net Profit
COMPONENT 17 — GUJARAT DIRECTORY
Purpose

Master directory of all FPS dealers.

Stores
Dealer Name
FPS ID
Village
District
Status
Used By
Government
District Officers
Reports
Search
DATABASE CONNECTION MAP
02 Lifting
      ↓

07 Transactions
      ↓

08 Beneficiaries
      ↓

10 Govt Sync

      ↓

PostgreSQL
      ↓

03 Monthly Report
04 Stock Report
05 Commodity Sales
09 Pending List

      ↓

06 Commission
14 Bank Commission
16 Income & Expense

      ↓

15 Social Audit
MOST CRITICAL MODULES

If you had to build in phases:

Phase 1 (MVP)
01 Dashboard
02 Lifting Records
07 Transactions
08 Beneficiary Registration
10 Govt Sync
PostgreSQL
Redis
Phase 2
03 Reports
04 Stock Report
05 Commodity Sales
09 Pending List
Phase 3
06 Commission
14 Bank Commission
16 Income & Expense
Phase 4
15 Social Audit
12 MDM
17 Directory
11 My Ads