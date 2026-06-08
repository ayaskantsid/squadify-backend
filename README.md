# Squadfish Backend API Documentation

## Overview
Squadfish is a trip expense-sharing application backend built with Express.js, TypeScript, and MongoDB. It supports trip management with role-based access control, participant invitations, and expense tracking.

## Authentication

All API endpoints require Firebase authentication. Include the Firebase ID token in the `Authorization` header:

```
Authorization: Bearer <firebase_id_token>
```

### Authentication Flow
- Users sign in via Firebase (Google/Phone)
- Frontend receives Firebase ID token
- Include token in all subsequent API requests
- Backend verifies token and extracts user UID and email

---

## API Endpoints

### Auth Endpoints

#### Login / Register User
- **POST** `/api/auth/me`
- **Description**: Create or update the authenticated user in MongoDB after Firebase sign-in
- **Auth**: Required
- **Request Body**:
  ```json
  {
    "displayName": "John Doe"
  }
  ```
- **Response** (200):
  ```json
  {
    "_id": "user-id",
    "firebaseUid": "firebase-uid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "phoneNumber": "+1234567890",
    "createdAt": "2026-06-03T10:00:00Z"
  }
  ```
- **Notes**:
  - This endpoint is called after Firebase Google or phone sign-in
  - If the user was previously invited by email, pending invitations are auto-linked to the user record (userId is attached) but are NOT automatically accepted. Invitations remain in `invited` state until the user explicitly accepts.

---

### Trip Endpoints

#### Create Trip
- **POST** `/api/trips`
- **Description**: Create a new trip (user becomes admin)
- **Auth**: Required
- **Request Body**:
  ```json
  {
    "name": "Summer Vacation",
    "description": "Beach trip with friends",
    "startDate": "2026-07-01T00:00:00Z",
    "endDate": "2026-07-10T00:00:00Z"
  }
  ```
- **Response** (201):
  ```json
  {
    "_id": "trip-id",
    "name": "Summer Vacation",
    "description": "Beach trip with friends",
    "startDate": "2026-07-01T00:00:00Z",
    "endDate": "2026-07-10T00:00:00Z",
    "createdBy": "user-id",
    "createdAt": "2026-06-03T10:00:00Z"
  }
  ```
- **Notes**: 
  - Creator is automatically added as an admin participant
  - Only invited users can see this trip

#### Get All User's Trips
- **GET** `/api/trips?page=1&limit=10`
- **Description**: Get trips where user is an accepted participant
- **Auth**: Required
- **Query Parameters**:
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Items per page (default: 10)
- **Response** (200):
  ```json
  {
    "trips": [
      {
        "_id": "trip-id",
        "name": "Summer Vacation",
        "description": "Beach trip",
        "startDate": "2026-07-01T00:00:00Z",
        "endDate": "2026-07-10T00:00:00Z",
        "createdBy": "user-id",
        "createdAt": "2026-06-03T10:00:00Z"
      }
    ],
    "totalCount": 5,
    "hasMore": true
  }
  ```
- **Notes**: 
  - Only returns trips where user status is "accepted"
  - Does not include invitations that are pending or declined

#### Get Trip by ID
- **GET** `/api/trips/:id`
- **Description**: Get trip details with expense summary
- **Auth**: Required
- **Response** (200):
  ```json
  {
    "_id": "trip-id",
    "name": "Summer Vacation",
    "description": "Beach trip",
    "startDate": "2026-07-01T00:00:00Z",
    "endDate": "2026-07-10T00:00:00Z",
    "createdBy": "user-id",
    "createdAt": "2026-06-03T10:00:00Z",
    "totalExpense": 1500.00,
    "noOfExpenses": 12
  }
  ```
- **Errors**:
  - 403: User is not an accepted participant
  - 404: Trip not found
- **Notes**: 
  - User must be an accepted participant to view trip details

#### Update Trip
- **PUT** `/api/trips/:id`
- **Description**: Update trip details (admin only)
- **Auth**: Required
- **Request Body** (all optional):
  ```json
  {
    "name": "Updated Trip Name",
    "description": "Updated description",
    "startDate": "2026-07-01T00:00:00Z",
    "endDate": "2026-07-10T00:00:00Z"
  }
  ```
- **Response** (200): Updated trip object
- **Errors**:
  - 403: User is not trip admin
  - 404: Trip not found

#### Delete Trip
- **DELETE** `/api/trips/:id`
- **Description**: Delete trip and all associated data (admin only)
- **Auth**: Required
- **Response** (200):
  ```json
  {
    "message": "Trip deleted successfully"
  }
  ```
- **Errors**:
  - 403: User is not trip admin
  - 404: Trip not found
- **Notes**: 
  - Also deletes all participant records
  - Should cascade delete expenses (if configured in model)

---

### Participant Endpoints

#### Invite User to Trip
- **POST** `/api/participants/invite`
- **Description**: Send trip invitation to user by email (admin only)
- **Auth**: Required
- **Request Body**:
  ```json
  {
    "tripId": "trip-id",
    "email": "friend@example.com"
  }
  ```
- **Response** (201):
  ```json
  {
    "message": "Invitation sent successfully",
    "participant": {
      "_id": "participant-id",
      "tripId": "trip-id",
      "role": "participant",
      "status": "invited",
      "email": "friend@example.com",
      "invitedAt": "2026-06-03T10:00:00Z"
    }
  }
  ```
- **Notes**:
  - The invited user does not need to already exist in the database
  - If the invited email later signs in with Firebase, pending invitations are auto-linked to the user record but remain in `invited` status until explicitly accepted.

#### Invitation Endpoints (DB-driven)

- **POST** `/api/participants/invite` (admin only)
  - Create or update an invitation for an email. Does not send email.

- **GET** `/api/participants/invitations/pending`
  - Returns pending invitations for the authenticated user (by email). Response includes `invitationId`, `tripId`, `tripName`, `invitedBy`, `status`.

- **PATCH** `/api/participants/invitations/accept`
  - Body: `{ "invitationId": "..." }`
  - Authenticated user's email must match invitation email. Sets invitation `status = "accepted"` and creates trip membership (Participant) with `status = "accepted"`.

- **PATCH** `/api/participants/invitations/reject`
  - Body: `{ "invitationId": "..." }`
  - Authenticated user's email must match invitation email. Sets invitation `status = "rejected"`.

- **Errors**:
  - 400: User already a participant or invitation already sent
  - 403: Current user is not trip admin
  - 404: Trip not found

#### Get Trip Participants
- **GET** `/api/participants/trip/:tripId`
- **Description**: List all participants in a trip
- **Auth**: Required
- **Response** (200):
  ```json
  [
    {
      "_id": "participant-id",
      "userId": {
        "_id": "user-id",
        "displayName": "John Doe",
        "email": "john@example.com",
        "phoneNumber": "+1234567890"
      },
      "tripId": "trip-id",
      "role": "admin",
      "status": "accepted",
      "invitedAt": "2026-06-03T10:00:00Z",
      "acceptedAt": "2026-06-03T10:05:00Z"
    }
  ]
  ```
- **Errors**:
  - 403: User is not an accepted participant of this trip
  - 404: Trip not found or no participants
- **Notes**: 
  - Only participants of the trip can view participant list
  - Shows full user details for each participant

#### Get Single Participant
- **GET** `/api/participants/:id`
- **Description**: Get specific participant record
- **Auth**: Required
- **Response** (200):
  ```json
  {
    "_id": "participant-id",
    "userId": {
      "_id": "user-id",
      "displayName": "John Doe",
      "email": "john@example.com"
    },
    "tripId": "trip-id",
    "role": "participant",
    "status": "accepted",
    "invitedAt": "2026-06-03T10:00:00Z",
    "acceptedAt": "2026-06-03T10:05:00Z"
  }
  ```

#### Accept Invitation
- **PATCH** `/api/participants/accept`
- **Description**: Accept a pending trip invitation
- **Auth**: Required
- **Request Body**:
  ```json
  {
    "participantId": "participant-id"
  }
  ```
- **Response** (200):
  ```json
  {
    "message": "Invitation accepted successfully",
    "participant": {
      "_id": "participant-id",
      "userId": "user-id",
      "tripId": "trip-id",
      "role": "participant",
      "status": "accepted",
      "invitedAt": "2026-06-03T10:00:00Z",
      "acceptedAt": "2026-06-03T10:05:00Z"
    }
  }
  ```
- **Errors**:
  - 400: Invitation not in pending state
  - 403: User can only accept their own invitations
  - 404: Invitation not found

#### Decline Invitation
- **PATCH** `/api/participants/decline`
- **Description**: Decline a pending trip invitation
- **Auth**: Required
- **Request Body**:
  ```json
  {
    "participantId": "participant-id"
  }
  ```
- **Response** (200):
  ```json
  {
    "message": "Invitation declined successfully",
    "participant": {
      "_id": "participant-id",
      "userId": "user-id",
      "tripId": "trip-id",
      "role": "participant",
      "status": "declined",
      "invitedAt": "2026-06-03T10:00:00Z",
      "declinedAt": "2026-06-03T10:05:00Z"
    }
  }
  ```
- **Errors**:
  - 400: Invitation not in pending state
  - 403: User can only decline their own invitations
  - 404: Invitation not found

#### Get Pending Invitations
- **GET** `/api/participants/invitations/pending`
- **Description**: Get all pending trip invitations for current user
- **Auth**: Required
- **Response** (200):
  ```json
  [
    {
      "_id": "participant-id",
      "userId": "current-user-id",
      "tripId": {
        "_id": "trip-id",
        "name": "Summer Vacation",
        "description": "Beach trip",
        "startDate": "2026-07-01T00:00:00Z",
        "endDate": "2026-07-10T00:00:00Z"
      },
      "role": "participant",
      "status": "invited",
      "invitedAt": "2026-06-03T10:00:00Z"
    }
  ]
  ```

#### Remove Participant
- **DELETE** `/api/participants/:participantId`
- **Description**: Remove user from trip (admin only)
- **Auth**: Required
- **Response** (200):
  ```json
  {
    "message": "Participant removed successfully"
  }
  ```
- **Errors**:
  - 403: User is not trip admin
  - 404: Participant not found
- **Notes**: 
  - Only trip admin can remove participants
  - Cannot remove trip creator (admin)

---

### Expense Endpoints

#### Create Expense
- **POST** `/api/expenses`
- **Description**: Create new trip expense
- **Auth**: Required
- **Request Body**:
  ```json
  {
    "tripId": "trip-id",
    "description": "Hotel booking",
    "amount": 300.00,
    "expenseDate": "2026-06-08T20:00:00.000Z",
    "paidBy": "participant-id",
    "splits": [
      { "participantId": "participant-1-id", "share": 180.00 },
      { "participantId": "participant-2-id", "share": 120.00 }
    ]
  }
  ```
- **Notes**:
  - `expenseDate` is required.
  - `paidBy` must be a `Participant` id.
  - `splits` is optional; if omitted, the backend will split the expense equally among all trip participants.
- **Response** (201): Expense object

#### Get Trip Expenses
- **GET** `/api/expenses/trip/:tripId`
- **Description**: Get all expenses for a trip
- **Auth**: Required
- **Response** (200): Array of expense objects

#### Get Expense by ID
- **GET** `/api/expenses/:id`
- **Description**: Get specific expense details
- **Auth**: Required
- **Response** (200): Expense object

#### Update Expense
- **PUT** `/api/expenses/:id`
- **Description**: Update expense details
- **Auth**: Required
- **Request Body** (optional fields):
  ```json
  {
    "description": "Updated description",
    "amount": 350.00
  }
  ```
- **Response** (200): Updated expense object

#### Delete Expense
- **DELETE** `/api/expenses/:id`
- **Description**: Delete expense
- **Auth**: Required
- **Response** (200): Success message

---

### Balance Endpoints

#### Get Settlement
- **GET** `/api/balances/:tripId`
- **Description**: Get settlement details for a trip
- **Auth**: Required
- **Response** (200): Settlement breakdown

#### Get Settlement Details
- **GET** `/api/balances/:tripId/settlements`
- **Description**: Get minimal settlement instructions for a trip
- **Auth**: Required
- **Response** (200): Settlement breakdown

---

## Database Models

### User
```typescript
{
  _id: ObjectId,
  firebaseUid: string (unique),
  email: string (unique),
  phoneNumber: string,
  displayName: string,
  createdAt: Date,
  updatedAt: Date
}
```

### Trip
```typescript
{
  _id: ObjectId,
  name: string,
  description: string,
  startDate: Date,
  endDate: Date,
  createdBy: ObjectId (ref: User),
  createdAt: Date,
  updatedAt: Date
}
```

### Participant
```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  tripId: ObjectId (ref: Trip),
  role: "admin" | "participant",
  status: "invited" | "accepted" | "declined",
  invitedAt: Date,
  acceptedAt: Date (optional),
  declinedAt: Date (optional),
  createdAt: Date,
  updatedAt: Date
}
```
**Unique Index**: `userId + tripId` (prevents duplicate entries)

### Expense
```typescript
{
  _id: ObjectId,
  tripId: ObjectId (ref: Trip),
  description: string,
  amount: number,
  paidBy: ObjectId (ref: Participant),
  expenseDate: Date,
  splits: Array<{
    participantId: ObjectId (ref: Participant),
    share: number
  }>,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Access Control Rules

### Trip Access
- **View Trip**: User must be accepted participant
- **Update Trip**: User must be trip admin
- **Delete Trip**: User must be trip admin
- **See Participants**: User must be accepted participant

## Backend Authorization Middlewares

- `authMiddleware`: verifies Firebase ID token and populates `req.user` with Firebase claims.
- `resolveCurrentUser`: resolves MongoDB `User` by `firebaseUid` and attaches it to `req.currentUser` (returns 401 if not found).
- `requireAcceptedParticipant`: ensures the current user is a participant with `status: accepted` for the target trip (returns 403 otherwise).
- `requireTripAdmin`: ensures the current user is a participant with `role: admin` and `status: accepted` for the target trip (returns 403 otherwise).

Notes:
- These checks run on the server — the frontend must not assume access control.
- `tripId` is read from `params.tripId`, `params.id`, `body.tripId`, or inferred from `participantId`/`expenseId` when applicable.

### Participant Management
- **Invite User**: Must be trip admin
- **Accept/Decline**: Only the invited user
- **Remove Participant**: Must be trip admin
- **View Invitations**: Own pending invitations only

---

## Error Responses

All errors follow this format:

```json
{
  "message": "Error description",
  "error": "Detailed error info (optional)"
}
```

### Common HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request (invalid input)
- **401**: Unauthorized (missing/invalid token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **500**: Internal Server Error

---

## Environment Variables

```env
# Server Configuration
PORT=5000
HOST=0.0.0.0

# Database
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/squadfish
DB_NAME=squadfish
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://192.168.1.41:5173,https://squadfish-web.vercel.app

# Firebase
# Use either inline JSON or a local service account key file path
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=./firebase-service-account-key.json
# or
# FIREBASE_SERVICE_ACCOUNT_KEY={...json...}

# Email Service (Resend)
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Frontend
FRONTEND_URL=http://localhost:3000
```

### Resend Setup (Discontinued)

1. Sign up at [Resend.com](https://resend.com)
2. Get your API key from the dashboard
3. Verify your sending domain (or use default Resend domain)
4. Add to `.env`:
   ```
   RESEND_API_KEY=re_your_key_here
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

5. Install Resend package:
   ```bash
   npm install resend
   ```

---

## Setup & Running

### Install Dependencies
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Production
```bash
npm start
```

---

## Key Changes from Previous API

### Breaking Changes
1. **Participant Model**: No longer stores generic contact info (name, email, phone)
   - Now links to actual User records via `userId`
   - Adds `role` and `status` fields

2. **Trip Endpoints**:
   - `GET /api/trips` now filters by authenticated user
   - All trip endpoints require authentication
   - Deleted trips cascade delete participants

3. **Participant Endpoints**:
   - Removed: `POST /api/participants` (generic create)
   - Removed: `PUT /api/participants/:id` (update)
   - Added: `POST /api/participants/invite` (invite by email)
   - Added: `PATCH /api/participants/accept` (accept invitation)
   - Added: `PATCH /api/participants/decline` (decline invitation)
   - Added: `GET /api/participants/invitations/pending` (pending invites)
   - Renamed: `DELETE /api/participants/:id` → `DELETE /api/participants/:participantId`

### Migration Guide
If you have existing data:
1. Migrate participant records to reference existing User documents by email matching
2. Set `role` = "admin" for trip creators, "participant" for others
3. Set `status` = "accepted" for all existing participants
4. Remove old generic participant fields

---

## Support
For issues or questions, contact the development team.
