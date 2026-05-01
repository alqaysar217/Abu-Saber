# **App Name**: أبو صابر

## Core Features:

- Dashboard & Quick Actions: Provide a financial summary including total profits, debts owed to and by the business, current liquidity, and quick access buttons for adding invoices, expenses, and campaigns, all optimized for RTL layout.
- Campaign Management (الحملات): Create and manage 'campaigns' (رحلات البيع) with linked purchases, expenses (ثلج, ديزل, عمال), and sales invoices to track profitability per campaign.
- Invoice System (الفواتير): Generate invoices with multiple fish types, auto-calculated quantities, prices, and totals. Support various payment types (نقد, دين, جزئي), track paid and remaining amounts, and manage invoice status.
- Customer & Supplier Management: Manage customer and supplier details, including contact information (اسم, رقم) and a full history of invoices, payments, and outstanding balances.
- Expense & Payment Tracking: Record categorized expenses (ديزل, عمال, ثلج, أخرى) and track payments, allowing allocation to specific invoices and supporting partial payments across multiple invoices.
- AI Invoice Data Extraction Tool: Enable users to upload an image of a handwritten invoice and utilize an AI tool to extract fish types, quantities, and prices, presenting an editable preview before saving.
- Firebase Integration: Secure user authentication (Firebase Auth), real-time data storage and retrieval for all business operations (Firestore), and asset management (Storage) to support the PWA functionality.

## Style Guidelines:

- Color scheme: Light theme, emphasizing clarity and professionalism, suitable for financial data. Primary: A vibrant yet earthy green (#29993D) to reflect freshness and growth. Background: A subtle, desaturated tint of the primary green (#EEF5EF) to provide a clean base. Accent: A lively turquoise (#26DEC4) for call-to-actions and key interactive elements. Success state: A distinct green (#24B824). Warning state: Bright yellow (#F2DB1A). Danger state: Bold red (#EB2929).
- Body and headline font: 'Inter' (sans-serif), chosen for its modern, objective readability and excellent support for Arabic (RTL) text across all screens. Note: currently only Google Fonts are supported.
- Utilize clear, intuitive modern icons for actions such as add, edit, delete, and reporting, ensuring visual consistency and support for Right-to-Left orientation.
- Mobile-first, optimized for smartphone screens, and fully responsive with a Right-to-Left (RTL) layout. Incorporate rounded corners (12-16px border-radius), an 8px grid for consistent spacing, large easy-to-tap buttons, and a bottom navigation bar featuring 'الرئيسية', 'الحملات', 'الديون', and 'التقارير' tabs.
- Implement subtle, performant transitions and micro-interactions to enhance user experience, ensuring smooth loading and navigation without compromising the PWA's speed or responsiveness.