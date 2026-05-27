# Request Edit Feature Implementation

## Summary
Added comprehensive request editing capability for Buyer and Prosumer users. Users can now edit their pending purchase requests and have all changes immediately reflected in the database.

## Features Implemented

### 1. **EditRequestModal Component** (`src/components/shared/EditRequestModal.js`)
   - Form-based modal for editing request details
   - Fully editable fields:
     - Item title
     - Product link (URL validation)
     - Amount (numeric validation)
     - Category (dropdown selection)
     - Required card type (dropdown)
     - Deadline (date picker)
     - Description (textarea)
     - Public marketplace visibility toggle
   - Real-time validation with error messages
   - Loading states and success feedback
   - Only accessible for pending requests
   - Automatically refreshes dashboard after saving

### 2. **BuyerDashboard Updates**
   - Added EditRequestModal integration
   - Edit button appears on hover for pending requests
   - Styled with blue color (#3b82f6) to distinguish from view action
   - Seamless workflow: edit → submit → refresh → close

### 3. **ProsumerDashboard Updates**
   - Added EditRequestModal integration to buyer-side requests
   - Edit button appears on hover for pending requests
   - Maintains split-view UI design (buyer side / provider side)
   - Same seamless workflow as buyer dashboard

### 4. **API Route Enhancement** (`src/app/api/data/route.js`)
   - Added authorization checks in PATCH endpoint
   - Verifies user ownership of request
   - Blocks editing of non-pending requests
   - Prevents unauthorized modifications
   - Returns proper HTTP status codes (403 for unauthorized, 400 for invalid state)

### 5. **Database Schema Support**
   - Leverages existing MongoDB RequestSchema fields:
     - `title` - Item name
     - `amount` - Purchase amount (INR)
     - `category` - Product category
     - `deadline` - Request validity date
     - `description` - Item details
     - `product_link` - Product URL
     - `required_card` - Required card type
     - `is_public` - Marketplace visibility
     - `status` - Request status (only pending can be edited)

## Validation Rules

1. **Title**: Required, must not be empty
2. **Amount**: Required, must be positive number
3. **Category**: Required, must be selected from predefined list
4. **Deadline**: Required, must be a future date
5. **Description**: Required, must not be empty
6. **Product Link**: Optional, but if provided must be valid HTTP(S) URL
7. **Status Check**: Only "pending" requests can be edited

## User Experience Flow

### Buyer Dashboard
1. View list of your requests
2. Hover over a pending request
3. Edit button appears (blue pencil icon)
4. Click edit → modal opens with pre-filled form
5. Modify desired fields
6. Click "Save Changes"
7. Form validates in real-time
8. On success: confirmation shown, modal closes, dashboard refreshes

### Prosumer Dashboard
1. In the "My Purchase Requests" buyer section
2. Hover over pending request
3. Same workflow as above

## Security Features

- **Request Ownership Verification**: Only the request owner (creator) can edit
- **Status Protection**: Only pending requests can be edited
- **Authorization Headers**: JWT token required for all edits
- **Database Transaction**: Updates are atomic MongoDB operations
- **Input Validation**: All fields validated before database update

## Technical Stack

- **Frontend**: React 19, Framer Motion (animations), TailwindCSS (styling)
- **State Management**: React hooks (useState, useCallback, useEffect, useRef)
- **API**: REST with PATCH method using existing `api.update()` method
- **Database**: MongoDB with Mongoose ORM
- **Authorization**: JWT token-based user identification

## API Endpoint

**PATCH** `/api/data`

**Request Body**:
```json
{
  "type": "requests",
  "id": "request-id",
  "title": "Updated Item Name",
  "amount": 5000,
  "category": "Electronics",
  "deadline": "2026-06-15",
  "description": "Updated description",
  "product_link": "https://example.com/product",
  "required_card": "HDFC Bank",
  "is_public": true
}
```

**Response (Success)**:
```json
{
  "data": {
    "id": "request-id",
    "user_id": "user-id",
    "title": "Updated Item Name",
    "amount": 5000,
    "status": "pending",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Error Responses**:
- `400`: Invalid type or non-pending request
- `403`: Unauthorized (not request owner)
- `404`: Request not found
- `500`: Server error

## Files Modified

1. **src/components/shared/EditRequestModal.js** - NEW
   - Complete edit form component with validation
   - 130+ lines of production code

2. **src/components/buyer/BuyerDashboard.js** - UPDATED
   - Added EditRequestModal import
   - Added editingReq state management
   - Modified RequestRow to accept onEdit callback
   - Added edit button on pending requests
   - Modal integration with onUpdated callback

3. **src/components/prosumer/ProsumerDashboard.js** - UPDATED
   - Added EditRequestModal import
   - Added editingReq state management
   - Modified request row rendering with edit button
   - Tag icon added to imports
   - Modal integration for buyer-side requests

4. **src/app/api/data/route.js** - UPDATED
   - Enhanced PATCH handler with authorization
   - User ownership verification
   - Status validation (pending-only)
   - Proper error handling and HTTP status codes

## Testing Checklist

- [ ] Edit button appears only for pending requests
- [ ] Edit button hidden for matched/completed/cancelled requests
- [ ] Form pre-fills with existing request data
- [ ] All fields can be independently modified
- [ ] Validation works for all fields
- [ ] Database updates reflect all changes
- [ ] Unauthorized users cannot edit others' requests
- [ ] Non-pending requests cannot be edited
- [ ] Success message displays after save
- [ ] Dashboard refreshes with updated data
- [ ] Modal closes after successful edit

## Future Enhancements

1. **Soft Delete**: Archive old request versions instead of direct update
2. **Audit Trail**: Track who edited what and when
3. **Bulk Edit**: Edit multiple requests at once
4. **Auto-save Draft**: Save progress without submitting
5. **Edit History**: Show previous values of edited fields
6. **Notifications**: Alert matched providers of request changes
7. **Conflict Resolution**: Handle simultaneous edits gracefully
