# Squadify Backend API Documentation

> Base URL: `https://squadify-backend-z8mw.onrender.com`

This repository exposes the Squadify backend REST API for managing trips, participants, expenses, and balance calculations.

---

## Health Check

- `GET /`
- Response: plain text message

```bash
curl https://squadify-backend-z8mw.onrender.com/
```

---

## Trips

### Create Trip

- `POST /api/trips`
- Body:
  ```json
  {
    "name": "Beach Trip",
    "description": "Friends weekend getaway",
    "startDate": "2026-06-01",
    "endDate": "2026-06-05"
  }
  ```
- Success response: `201`
  ```json
  {
    "_id": "642...",
    "name": "Beach Trip",
    "description": "Friends weekend getaway",
    "startDate": "2026-06-01T00:00:00.000Z",
    "endDate": "2026-06-05T00:00:00.000Z",
    "participants": [],
    "createdAt": "2026-06-02T00:00:00.000Z",
    "updatedAt": "2026-06-02T00:00:00.000Z",
    "__v": 0
  }
  ```

### List Trips

- `GET /api/trips`
- Query parameters:
  - `page` (optional, default `1`)
  - `limit` (optional, default `10`)
- Success response: `200`
  ```json
  {
    "trips": [
      {
        "_id": "642...",
        "name": "Beach Trip",
        "description": "Friends weekend getaway",
        "startDate": "2026-06-01T00:00:00.000Z",
        "endDate": "2026-06-05T00:00:00.000Z",
        "participants": [],
        "createdAt": "2026-06-02T00:00:00.000Z",
        "updatedAt": "2026-06-02T00:00:00.000Z",
        "__v": 0
      }
    ],
    "totalCount": 1,
    "hasMore": false
  }
  ```

### Get Trip by ID

- `GET /api/trips/:id`
- Response includes trip details plus aggregated expense data
- Success response: `200`
  ```json
  {
    "_id": "642...",
    "name": "Beach Trip",
    "description": "Friends weekend getaway",
    "startDate": "2026-06-01T00:00:00.000Z",
    "endDate": "2026-06-05T00:00:00.000Z",
    "participants": [],
    "createdAt": "2026-06-02T00:00:00.000Z",
    "updatedAt": "2026-06-02T00:00:00.000Z",
    "totalExpense": 250.0,
    "noOfExpenses": 3,
    "__v": 0
  }
  ```

### Update Trip

- `PUT /api/trips/:id`
- Body: any trip fields to update
  ```json
  {
    "name": "Updated Beach Trip",
    "description": "Updated description"
  }
  ```
- Success response: `200`
  ```json
  {
    "_id": "642...",
    "name": "Updated Beach Trip",
    "description": "Updated description",
    "startDate": "2026-06-01T00:00:00.000Z",
    "endDate": "2026-06-05T00:00:00.000Z",
    "participants": [],
    "createdAt": "2026-06-02T00:00:00.000Z",
    "updatedAt": "2026-06-02T00:00:00.000Z",
    "__v": 0
  }
  ```

### Delete Trip

- `DELETE /api/trips/:id`
- Success response: `200`
  ```json
  {
    "message": "Trip deleted successfully"
  }
  ```

---

## Participants

### Create Participant

- `POST /api/participants`
- Body:
  ```json
  {
    "name": "Alicia",
    "email": "alicia@example.com",
    "phone": "+1234567890",
    "tripId": "642..."
  }
  ```
- Success response: `201`
  ```json
  {
    "message": "Participant created successfully",
    "participant": {
      "_id": "642...",
      "name": "Alicia",
      "email": "alicia@example.com",
      "phone": "+1234567890",
      "tripId": "642...",
      "createdAt": "2026-06-02T00:00:00.000Z",
      "updatedAt": "2026-06-02T00:00:00.000Z",
      "__v": 0
    }
  }
  ```

### Get Participants by Trip

- `GET /api/participants/trip/:tripId`
- Success response: `200`
  ```json
  [
    {
      "_id": "642...",
      "name": "Alicia",
      "email": "alicia@example.com",
      "phone": "+1234567890",
      "tripId": "642...",
      "createdAt": "2026-06-02T00:00:00.000Z",
      "updatedAt": "2026-06-02T00:00:00.000Z",
      "__v": 0
    }
  ]
  ```

### Get Participant by ID

- `GET /api/participants/:id`
- Success response: `200`
  ```json
  {
    "_id": "642...",
    "name": "Alicia",
    "email": "alicia@example.com",
    "phone": "+1234567890",
    "tripId": "642...",
    "createdAt": "2026-06-02T00:00:00.000Z",
    "updatedAt": "2026-06-02T00:00:00.000Z",
    "__v": 0
  }
  ```

### Update Participant

- `PUT /api/participants/:id`
- Body: any participant fields to update
  ```json
  {
    "phone": "+0987654321"
  }
  ```
- Success response: `200`
  ```json
  {
    "_id": "642...",
    "name": "Alicia",
    "email": "alicia@example.com",
    "phone": "+0987654321",
    "tripId": "642...",
    "createdAt": "2026-06-02T00:00:00.000Z",
    "updatedAt": "2026-06-02T00:00:00.000Z",
    "__v": 0
  }
  ```

### Delete Participant

- `DELETE /api/participants/:id`
- Success response: `200`
  ```json
  {
    "message": "Participant deleted successfully"
  }
  ```

---

## Expenses

### Get Expenses by Trip

- `GET /api/expenses/trip/:tripId`
- Success response: `200`
  ```json
  [
    {
      "_id": "642...",
      "tripId": "642...",
      "description": "Dinner",
      "amount": 120,
      "paidBy": {
        "_id": "642...",
        "name": "Alicia"
      },
      "expenseDate": "2026-06-02T00:00:00.000Z",
      "splits": [
        {
          "participantId": {
            "_id": "642...",
            "name": "Alicia"
          },
          "share": 40
        }
      ],
      "createdAt": "2026-06-02T00:00:00.000Z",
      "updatedAt": "2026-06-02T00:00:00.000Z",
      "__v": 0,
      "splitType": "equal"
    }
  ]
  ```

### Get Expense by ID

- `GET /api/expenses/:id`
- Success response: `200`
  ```json
  {
    "message": "Expense details fetched successfully.",
    "data": {
      "_id": "642...",
      "tripId": "642...",
      "description": "Dinner",
      "amount": 120,
      "paidBy": {
        "_id": "642...",
        "name": "Alicia"
      },
      "expenseDate": "2026-06-02T00:00:00.000Z",
      "splits": [
        {
          "participantId": {
            "_id": "642...",
            "name": "Alicia"
          },
          "share": 40
        }
      ],
      "createdAt": "2026-06-02T00:00:00.000Z",
      "updatedAt": "2026-06-02T00:00:00.000Z",
      "__v": 0,
      "splitType": "equal"
    }
  }
  ```

### Add Expense

- `POST /api/expenses`
- Body:
  ```json
  {
    "tripId": "642...",
    "paidBy": "643...",
    "description": "Lunch",
    "amount": 90,
    "expenseDate": "2026-06-02",
    "splits": [
      { "participantId": "643...", "share": 30 },
      { "participantId": "644...", "share": 30 },
      { "participantId": "645...", "share": 30 }
    ]
  }
  ```
- Notes:
  - `tripId`, `paidBy`, `amount`, and `expenseDate` are required.
  - If `splits` is omitted or empty, the system splits the amount equally among all trip participants.
  - Custom splits must sum exactly to `amount`.
- Success response: `201`
  ```json
  {
    "message": "Expense added successfully.",
    "data": {
      "_id": "642...",
      "tripId": "642...",
      "description": "Lunch",
      "amount": 90,
      "paidBy": "643...",
      "expenseDate": "2026-06-02T00:00:00.000Z",
      "splits": [
        { "participantId": "643...", "share": 30 },
        { "participantId": "644...", "share": 30 },
        { "participantId": "645...", "share": 30 }
      ],
      "createdAt": "2026-06-02T00:00:00.000Z",
      "updatedAt": "2026-06-02T00:00:00.000Z",
      "__v": 0,
      "splitType": "custom"
    }
  }
  ```

### Update Expense

- `PUT /api/expenses/:id`
- Body: any expense fields to update
  ```json
  {
    "description": "Dinner updated",
    "amount": 100
  }
  ```
- Success response: `200`
  ```json
  {
    "message": "Expense updated successfully",
    "expense": {
      "_id": "642...",
      "tripId": "642...",
      "description": "Dinner updated",
      "amount": 100,
      "paidBy": {
        "_id": "643...",
        "name": "Alicia"
      },
      "expenseDate": "2026-06-02T00:00:00.000Z",
      "splits": [
        {
          "participantId": {
            "_id": "643...",
            "name": "Alicia"
          },
          "share": 50
        }
      ],
      "createdAt": "2026-06-02T00:00:00.000Z",
      "updatedAt": "2026-06-02T00:00:00.000Z",
      "__v": 0,
      "splitType": "custom"
    }
  }
  ```

### Delete Expense

- `DELETE /api/expenses/:id`
- Success response: `200`
  ```json
  {
    "message": "Expense deleted successfully"
  }
  ```

---

## Balances

### Get Trip Balances

- `GET /api/balances/:tripId`
- Response: list of participant balances
- Success response: `200`
  ```json
  [
    {
      "participantId": "643...",
      "name": "Alicia",
      "balance": 30.0
    },
    {
      "participantId": "644...",
      "name": "Brian",
      "balance": -15.0
    }
  ]
  ```

### Get Minimal Settlements

- `GET /api/balances/:tripId/settlements`
- Response: balances before and after settlement plus suggested transactions
- Success response: `200`
  ```json
  {
    "balanceBeforeSettlement": [
      {
        "participantId": "643...",
        "name": "Alicia",
        "balance": 30.0
      },
      {
        "participantId": "644...",
        "name": "Brian",
        "balance": -15.0
      }
    ],
    "balances": [
      {
        "participantId": "643...",
        "name": "Alicia",
        "balance": 0
      },
      {
        "participantId": "644...",
        "name": "Brian",
        "balance": 0
      }
    ],
    "settlements": [
      {
        "from": "Brian",
        "to": "Alicia",
        "amount": 15.0
      }
    ]
  }
  ```

---

## Notes

- All date values are stored as ISO 8601 timestamps.
- `tripId`, `paidBy`, and participant IDs are MongoDB ObjectId strings.
- Validation errors return `400` with an error message.
- Not found resources return `404`.
- Server errors return `500`.

---

## Example cURL

```bash
curl -X POST https://squadify-backend-z8mw.onrender.com/api/trips \
  -H "Content-Type: application/json" \
  -d '{"name":"Beach Trip","description":"Weekend getaway","startDate":"2026-06-01","endDate":"2026-06-05"}'
```

```bash
curl https://squadify-backend-z8mw.onrender.com/api/balances/642...
```
