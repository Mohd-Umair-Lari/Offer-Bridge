# Contextual Mapping & Request Field Updates

## Overall Goal
Enhance the New Request flow by capturing specific product and card requirements, and implement a contextual matching algorithm so card providers only see requests that match their available cards. 

## 1. Database Schema Updates
We need to add three new columns to the `requests` table:
- `product_link` (text): URL to the online item.
- `required_card` (text): The specific bank or card name requested by the customer (e.g., "HDFC Bank" or "SBI Card PRIME").
- `is_public` (boolean): Whether the request is posted to the open public marketplace or kept private/direct matched.

**Actions:**
- Write an `ALTER TABLE` SQL command for the Supabase SQL editor.
- Update `scripts/schema.sql` to include these defaults for fresh setups.
- Update `lib/mockData.js` to append these fields to testing data.

## 2. Updates to `NewRequest.js`
Modify the customer request form to include:
- **Product Link Input:** A URL field validated for web links.
- **Card Requirement Dropdown:** A select menu populated dynamically from known banks (e.g., HDFC Bank, SBI Card, ICICI Bank, Axis Bank, Any).
- **Marketplace Checkbox (`is_public`):** An option giving customers the choice: 
  - Checked: "Post to Marketplace" (Publicly visible to *any* provider with the matching card).
  - Unchecked: "Direct Match Only" (System privately matches with top-rated providers).

## 3. Matching Algorithm (`BrowseRequests.js`)
We will rewrite the Provider's `BrowseRequests.js` component to handle contextual mapping.

**The Algorithm Strategy:**
1. **Identify Provider's Cards:** We determine the current provider's active cards by looking at the `offers` table (for prototype purposes, filtering offers matching the logged-in user's `displayName` or simulating their portfolio).
2. **Strict Matching:** A request will **only** appear for this provider if `required_card` equals "Any" OR matches the `bank` or `card_name` of one of their active cards.
3. **Display Separation:**
   - **Marketplace Requests:** Matching requests where `is_public = true` will show in a public dashboard view.
   - **Direct Matches:** Matching requests where `is_public = false` will be highlighted separately as "Exclusive Direct Matches".

## User Review Required
> [!IMPORTANT]
> - Do you want the `required_card` option to be a list of **Banks** (e.g., HDFC, SBI) or specific **Card Types** (e.g., HDFC Diners Club)? (I will default to "Banks" as it is easier for a customer to know).
> - For the prototype's contextual matching, should we assume the provider viewing `BrowseRequests.js` has access to *all* mock cards, or should I explicitly filter the pool to match the currently logged in user's name?
> Please approve this plan or provide your preferences!
