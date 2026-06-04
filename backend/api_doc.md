# Cybernara Timesheet Portal — API Specification & Usage Guide

All endpoints (except public auth endpoints) require the `Authorization` header in the format:
```http
Authorization: Bearer <SUPABASE_JWT_ACCESS_TOKEN>
```

---

## 1. Authentication Module (`/auth`)

### 1.1 Request OTP
Initiates a login, signup, or invitation verification by sending a 6-digit OTP code to the corporate inbox.
* **Method:** `POST`
* **Path:** `/auth/request-otp`
* **Access:** Public
* **Request Body:**
  ```json
  {
    "email": "employee@cybernara.com",
    "purpose": "signup" 
  }
  ```
  *(Valid purposes: `signin` | `signup` | `invite`)*
* **Expected Response (`200 OK`):**
  ```json
  {
    "message": "OTP sent successfully to your corporate inbox."
  }
  ```
* **Error Response (`400 Bad Request`):**
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Validation failed.",
      "details": {
        "email": "Email must be a valid @cybernara.com email address."
      }
    }
  }
  ```

### 1.2 Verify OTP
Checks the bcrypt hash of the verification code. If `purpose` is `signin`, returns a full session. Otherwise, returns a short-lived token.
* **Method:** `POST`
* **Path:** `/auth/verify-otp`
* **Access:** Public
* **Request Body:**
  ```json
  {
    "email": "employee@cybernara.com",
    "code": "123456",
    "purpose": "signup"
  }
  ```
* **Expected Response - Sign-in (`200 OK`):**
  ```json
  {
    "message": "Authentication successful.",
    "session": {
      "access_token": "eyJhbGciOi...",
      "refresh_token": "rS84f...",
      "expires_in": 3600
    },
    "user": {
      "id": "1c7f8a29-012b-4c5d-9ef8-e02d8471c26b",
      "email": "employee@cybernara.com",
      "role": "employee",
      "username": "employee_user",
      "full_name": "Employee User"
    }
  }
  ```
* **Expected Response - Signup/Invite (`200 OK`):**
  ```json
  {
    "message": "OTP verified successfully.",
    "verificationToken": "eyJhbGciOi..."
  }
  ```
* **Error Response - Max Attempts (`400 Bad Request`):**
  ```json
  {
    "error": {
      "code": "OTP_MAX_ATTEMPTS",
      "message": "Verification code invalidated due to too many failed attempts.",
      "details": {}
    }
  }
  ```

### 1.3 Complete Signup
Completes public employee registration. Sets `role` to `employee` and `status` to `active`.
* **Method:** `POST`
* **Path:** `/auth/signup/complete`
* **Access:** Public (Requires verificationToken)
* **Request Body:**
  ```json
  {
    "verificationToken": "eyJhbGciOi...",
    "username": "john_doe",
    "password": "securepassword123"
  }
  ```
* **Expected Response (`201 Created`):**
  ```json
  {
    "message": "Signup complete and account activated.",
    "session": {
      "access_token": "eyJhbGciOi...",
      "refresh_token": "rS84f..."
    },
    "user": {
      "id": "1c7f8a29-012b-4c5d-9ef8-e02d8471c26b",
      "email": "john_doe@cybernara.com",
      "role": "employee",
      "username": "john_doe",
      "full_name": "john_doe"
    }
  }
  ```

### 1.4 Complete Invite
Completes manager invitation. Sets `role` to `manager` and `status` to `active`.
* **Method:** `POST`
* **Path:** `/auth/invite/complete`
* **Access:** Public (Requires inviteToken and OTP)
* **Request Body:**
  ```json
  {
    "inviteToken": "563cfd8a2bc...",
    "otp": "654321",
    "username": "manager_jane",
    "password": "securepassword456"
  }
  ```
* **Expected Response (`201 Created`):**
  *(Same structure as complete signup, but role is set to `manager`)*

### 1.5 Login
Standard username + password authentication flow.
* **Method:** `POST`
* **Path:** `/auth/login`
* **Access:** Public
* **Request Body:**
  ```json
  {
    "username": "john_doe",
    "password": "securepassword123"
  }
  ```
* **Expected Response (`200 OK`):**
  *(Same structure as complete signup/verify-otp sign-in session)*

### 1.6 Fetch Self Profile
Returns the profile info for the calling user.
* **Method:** `GET`
* **Path:** `/auth/me`
* **Access:** Protected
* **Expected Response (`200 OK`):**
  ```json
  {
    "id": "1c7f8a29-012b-4c5d-9ef8-e02d8471c26b",
    "email": "john_doe@cybernara.com",
    "role": "employee",
    "username": "john_doe",
    "full_name": "john_doe",
    "manager_id": "4da767f2-1234-4a21-9988-cc772211bbdd",
    "department": "Engineering",
    "status": "active",
    "created_via": "signup"
  }
  ```

### 1.7 Update Credentials
Updates username and/or password for the authenticated caller.
* **Method:** `PATCH`
* **Path:** `/auth/credentials`
* **Access:** Protected
* **Request Body:**
  ```json
  {
    "username": "john_new",
    "password": "newsecurepassword789"
  }
  ```
* **Expected Response (`200 OK`):**
  ```json
  {
    "message": "Credentials updated successfully.",
    "user": {
      "id": "1c7f8a29-012b-4c5d-9ef8-e02d8471c26b",
      "email": "john_doe@cybernara.com",
      "role": "employee",
      "username": "john_new",
      "full_name": "john_doe"
    }
  }
  ```

---

## 2. Timesheet Entries Module (`/entries`)

### 2.1 List Timesheet Entries
Retrieves entries matching filter criteria. Employees see own; Managers see reports; Admins see all.
* **Method:** `GET`
* **Path:** `/entries`
* **Access:** Protected
* **Query Parameters:**
  * `date` (e.g. `2026-06-05`)
  * `user_id` (UUID filter - Managers/Admins only)
  * `category_id` (UUID filter)
  * `from` (e.g. `2026-06-01`)
  * `to` (e.g. `2026-06-05`)
  * `page` (default `1`)
  * `limit` (default `50`, max `200`)
* **Expected Response (`200 OK`):**
  ```json
  {
    "data": [
      {
        "id": "ef8a2c44-789a-4c2d-8ef2-e32d1847c211",
        "user_id": "1c7f8a29-012b-4c5d-9ef8-e02d8471c26b",
        "work_date": "2026-06-05T00:00:00.000Z",
        "client_id": "bc77e212-0012-4c2d-9ef8-232187d6e41b",
        "category_id": "4da767f2-a23d-4c31-8e99-cc772211bbdd",
        "task_title": "Fix checkout bug",
        "description": "Resolved null pointer checkout issue",
        "start_time": "09:00",
        "end_time": "12:00",
        "duration_minutes": 180,
        "output_status": "done",
        "comment": "Merged in PR #42",
        "is_locked": true,
        "created_at": "2026-06-05T02:00:00.000Z",
        "updated_at": "2026-06-05T02:00:00.000Z",
        "client": {
          "id": "bc77e212-0012-4c2d-9ef8-232187d6e41b",
          "name": "Acme Corp"
        },
        "category": {
          "id": "4da767f2-a23d-4c31-8e99-cc772211bbdd",
          "name": "Development",
          "type": "system"
        },
        "user": {
          "id": "1c7f8a29-012b-4c5d-9ef8-e02d8471c26b",
          "full_name": "John Doe",
          "email": "john_doe@cybernara.com"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

### 2.2 Get Entries Weekly Summary
Aggregates task hours by work date, category, and client.
* **Method:** `GET`
* **Path:** `/entries/summary`
* **Access:** Protected
* **Query Parameters:** `from`, `to`, `user_id`, `category_id`
* **Expected Response (`200 OK`):**
  ```json
  [
    {
      "work_date": "2026-06-05T00:00:00.000Z",
      "category_id": "4da767f2-a23d-4c31-8e99-cc772211bbdd",
      "category_name": "Development",
      "client_id": "bc77e212-0012-4c2d-9ef8-232187d6e41b",
      "client_name": "Acme Corp",
      "total_minutes": 180,
      "total_hours": "3.00"
    }
  ]
  ```

### 2.3 Fetch Single Timesheet Entry
* **Method:** `GET`
* **Path:** `/entries/:id`
* **Access:** Protected
* **Expected Response (`200 OK`):**
  *(Same structure as a single object inside the list entries response data)*

### 2.4 Create Single Entry
Logs a single task. Sets `is_locked = true` upon creation.
* **Method:** `POST`
* **Path:** `/entries`
* **Access:** Protected
* **Request Body:**
  ```json
  {
    "work_date": "2026-06-05",
    "client_id": "bc77e212-0012-4c2d-9ef8-232187d6e41b",
    "category_id": "4da767f2-a23d-4c31-8e99-cc772211bbdd",
    "task_title": "Daily Standup",
    "description": "Discussed dashboard blockers",
    "start_time": "09:00",
    "end_time": "09:30",
    "output_status": "done",
    "comment": ""
  }
  ```
* **Expected Response (`201 Created`):**
  *(Same structure as single formatted entry object)*

### 2.5 Bulk Submit Entries
Submits multiple tasks for a day in a single transaction via Postgres function.
* **Method:** `POST`
* **Path:** `/entries/bulk`
* **Access:** Protected
* **Request Body:**
  ```json
  {
    "tasks": [
      {
        "work_date": "2026-06-05",
        "client_id": "",
        "category_id": "4da767f2-a23d-4c31-8e99-cc772211bbdd",
        "task_title": "Code Review",
        "description": "Reviewed Auth Module PR",
        "start_time": "14:00",
        "end_time": "15:00",
        "output_status": "done",
        "comment": ""
      },
      {
        "work_date": "2026-06-05",
        "client_id": "bc77e212-0012-4c2d-9ef8-232187d6e41b",
        "category_id": "4da767f2-a23d-4c31-8e99-cc772211bbdd",
        "task_title": "Fix Auth Bug",
        "description": "Resolved verification token crash",
        "start_time": "15:00",
        "end_time": "17:00",
        "output_status": "done",
        "comment": ""
      }
    ]
  }
  ```
* **Expected Response (`201 Created`):**
  ```json
  {
    "message": "Bulk timesheet entries submitted successfully.",
    "entry_ids": [
      "12345678-abcd-1234-abcd-1234567890ab",
      "87654321-dcba-4321-dcba-ba0987654321"
    ]
  }
  ```

### 2.6 Update Entry
Allows editing timesheet details. Employees are blocked from editing if entry has `is_locked = true`.
* **Method:** `PATCH`
* **Path:** `/entries/:id`
* **Access:** Protected (Locked check enforced for Employees)
* **Request Body:**
  ```json
  {
    "task_title": "Updated Standup Title",
    "end_time": "09:45"
  }
  ```
* **Expected Response (`200 OK`):**
  *(Returns updated entry object)*
* **Error Response - Entry Locked (`403 Forbidden`):**
  ```json
  {
    "error": {
      "code": "ENTRY_LOCKED",
      "message": "This timesheet entry is locked and cannot be edited.",
      "details": {}
    }
  }
  ```

### 2.7 Delete Entry
* **Method:** `DELETE`
* **Path:** `/entries/:id`
* **Access:** Protected (Manager and Admin only)
* **Expected Response (`200 OK`):**
  ```json
  {
    "message": "Timesheet entry deleted successfully."
  }
  ```

---

## 3. Edit Requests Module (`/edit-requests`)

### 3.1 Submit Edit Request
Enables an employee to request an unlock for a locked entry.
* **Method:** `POST`
* **Path:** `/edit-requests`
* **Access:** Employee only
* **Request Body:**
  ```json
  {
    "entry_id": "ef8a2c44-789a-4c2d-8ef2-e32d1847c211",
    "reason": "Needed to adjust end_time from 12:00 to 12:30."
  }
  ```
* **Expected Response (`201 Created`):**
  ```json
  {
    "id": "fe8a2c00-1234-abcd-9ef8-e02d8471c26b",
    "entry_id": "ef8a2c44-789a-4c2d-8ef2-e32d1847c211",
    "requested_by": "1c7f8a29-012b-4c5d-9ef8-e02d8471c26b",
    "reviewed_by": null,
    "reason": "Needed to adjust end_time from 12:00 to 12:30.",
    "status": "pending",
    "created_at": "2026-06-05T03:00:00.000Z",
    "reviewed_at": null
  }
  ```

### 3.2 List Pending Edit Requests
Lists requests logged by direct reports.
* **Method:** `GET`
* **Path:** `/edit-requests`
* **Access:** Manager/Admin only
* **Query Parameters:** `status` (e.g. `pending`), `page`, `limit`
* **Expected Response (`200 OK`):**
  ```json
  {
    "data": [
      {
        "id": "fe8a2c00-1234-abcd-9ef8-e02d8471c26b",
        "entry_id": "ef8a2c44-789a-4c2d-8ef2-e32d1847c211",
        "requested_by": "1c7f8a29-012b-4c5d-9ef8-e02d8471c26b",
        "reviewed_by": null,
        "reason": "Needed to adjust end_time from 12:00 to 12:30.",
        "status": "pending",
        "created_at": "2026-06-05T03:00:00.000Z",
        "reviewed_at": null,
        "entry": {
          "id": "ef8a2c44-789a-4c2d-8ef2-e32d1847c211",
          "work_date": "2026-06-05T00:00:00.000Z",
          "task_title": "Fix checkout bug"
        },
        "requester": {
          "id": "1c7f8a29-012b-4c5d-9ef8-e02d8471c26b",
          "full_name": "John Doe",
          "email": "john_doe@cybernara.com"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

### 3.3 List Own Request History
* **Method:** `GET`
* **Path:** `/edit-requests/mine`
* **Access:** Employee only
* **Expected Response (`200 OK`):**
  *(List structure showing own request entries)*

### 3.4 Approve Edit Request
Unlocks the entry (`is_locked = false`) allowing one modification cycle.
* **Method:** `PATCH`
* **Path:** `/edit-requests/:id/approve`
* **Access:** Manager/Admin only
* **Expected Response (`200 OK`):**
  ```json
  {
    "id": "fe8a2c00-1234-abcd-9ef8-e02d8471c26b",
    "status": "approved",
    "reviewed_by": "4da767f2-1234-4a21-9988-cc772211bbdd",
    "reviewed_at": "2026-06-05T03:05:00.000Z"
  }
  ```

### 3.5 Reject Edit Request
Entry remains locked.
* **Method:** `PATCH`
* **Path:** `/edit-requests/:id/reject`
* **Access:** Manager/Admin only
* **Request Body:**
  ```json
  {
    "reason": "Invalid justification. Entries can only be adjusted on the current day."
  }
  ```
* **Expected Response (`200 OK`):**
  *(Returns update request with status set to `rejected`)*

---

## 4. Users Module (`/users`)

### 4.1 Invite a Manager
Generates a secure 24-hour invitation token.
* **Method:** `POST`
* **Path:** `/users/invite`
* **Access:** Admin only
* **Request Body:**
  ```json
  {
    "email": "new_manager@cybernara.com"
  }
  ```
* **Expected Response (`200 OK`):**
  ```json
  {
    "message": "Manager invitation sent successfully."
  }
  ```

### 4.2 Change User Role
Changes a user's role. Demotion/promotion of own role is blocked.
* **Method:** `PATCH`
* **Path:** `/users/:id/role`
* **Access:** Admin only
* **Request Body:**
  ```json
  {
    "role": "manager"
  }
  ```
  *(Valid roles: `employee` | `manager` | `admin`)*
* **Expected Response (`200 OK`):**
  ```json
  {
    "id": "1c7f8a29-012b-4c5d-9ef8-e02d8471c26b",
    "email": "employee@cybernara.com",
    "role": "manager",
    "username": "employee_user",
    "full_name": "Employee User",
    "manager_id": null,
    "department": "Engineering",
    "status": "active",
    "created_via": "signup"
  }
  ```

### 4.3 List Users
Retrieves a paginated list of all users.
* **Method:** `GET`
* **Path:** `/users`
* **Access:** Admin only
* **Query Parameters:**
  * `role` (e.g. `employee` | `manager` | `admin`)
  * `status` (e.g. `active` | `suspended` | `pending`)
  * `page` (default `1`)
  * `limit` (default `50`)
* **Expected Response (`200 OK`):**
  ```json
  {
    "data": [
      {
        "id": "1c7f8a29-012b-4c5d-9ef8-e02d8471c26b",
        "email": "employee@cybernara.com",
        "role": "employee",
        "username": "employee_user",
        "full_name": "Employee User",
        "manager_id": "4da767f2-1234-4a21-9988-cc772211bbdd",
        "department": "Engineering",
        "status": "active",
        "created_via": "signup",
        "created_at": "2026-06-05T03:00:00.000Z",
        "updated_at": "2026-06-05T03:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

### 4.4 List Team Members
Lists all reporting users for a given manager.
* **Method:** `GET`
* **Path:** `/users/team`
* **Access:** Manager (lists own reportees) | Admin (lists reportees for any manager via query param)
* **Query Parameters:**
  * `manager_id` (UUID - required only for Admin callers)
* **Expected Response (`200 OK`):**
  ```json
  [
    {
      "id": "1c7f8a29-012b-4c5d-9ef8-e02d8471c26b",
      "email": "employee@cybernara.com",
      "role": "employee",
      "username": "employee_user",
      "full_name": "Employee User",
      "manager_id": "4da767f2-1234-4a21-9988-cc772211bbdd",
      "department": "Engineering",
      "status": "active",
      "created_via": "signup"
    }
  ]
  ```

### 4.5 Change User's Manager
Re-assigns a reporting employee to a different manager.
* **Method:** `PATCH`
* **Path:** `/users/:id/manager`
* **Access:** Admin only
* **Request Body:**
  ```json
  {
    "manager_id": "4da767f2-1234-4a21-9988-cc772211bbdd"
  }
  ```
  *(Pass `null` to clear the manager assignment)*
* **Expected Response (`200 OK`):**
  ```json
  {
    "id": "1c7f8a29-012b-4c5d-9ef8-e02d8471c26b",
    "email": "employee@cybernara.com",
    "role": "employee",
    "username": "employee_user",
    "full_name": "Employee User",
    "manager_id": "4da767f2-1234-4a21-9988-cc772211bbdd",
    "department": "Engineering",
    "status": "active",
    "created_via": "signup"
  }
  ```

### 4.6 Suspend or Activate User
Updates account state. Admin is blocked from suspending their own account.
* **Method:** `PATCH`
* **Path:** `/users/:id/status`
* **Access:** Admin only
* **Request Body:**
  ```json
  {
    "status": "suspended"
  }
  ```
  *(Valid status values: `active` | `suspended` | `pending`)*
* **Expected Response (`200 OK`):**
  ```json
  {
    "id": "1c7f8a29-012b-4c5d-9ef8-e02d8471c26b",
    "email": "employee@cybernara.com",
    "role": "employee",
    "username": "employee_user",
    "full_name": "Employee User",
    "manager_id": "4da767f2-1234-4a21-9988-cc772211bbdd",
    "department": "Engineering",
    "status": "suspended",
    "created_via": "signup"
  }
  ```

### 4.7 Get User Me Profile (Secondary Endpoint)
Returns the active session user's profile details.
* **Method:** `GET`
* **Path:** `/users/me`
* **Access:** Protected (All roles)
* **Expected Response (`200 OK`):**
  *(Same structure as `/auth/me`)*

---

## 5. Clients & Categories Modules (`/clients`, `/categories`)

### 5.1 List Active Clients
Retrieves a lightweight list of active clients for dropdown list selectors.
* **Method:** `GET`
* **Path:** `/clients`
* **Access:** Protected (All roles)
* **Expected Response (`200 OK`):**
  ```json
  [
    {
      "id": "bc77e212-0012-4c2d-9ef8-232187d6e41b",
      "name": "Acme Corp"
    }
  ]
  ```

### 5.2 Create Client
Creates a new client record.
* **Method:** `POST`
* **Path:** `/clients`
* **Access:** Manager / Admin only
* **Request Body:**
  ```json
  {
    "name": "Beta Labs Ltd"
  }
  ```
* **Expected Response (`201 Created`):**
  ```json
  {
    "id": "bc77e212-0012-4c2d-9ef8-232187d6e41b",
    "name": "Beta Labs Ltd",
    "is_active": true,
    "created_by": "1c7f8a29-012b-4c5d-9ef8-e02d8471c26b",
    "created_at": "2026-06-05T03:00:00.000Z",
    "updated_at": "2026-06-05T03:00:00.000Z"
  }
  ```

### 5.3 Update Client
Updates a client's name or toggle status.
* **Method:** `PATCH`
* **Path:** `/clients/:id`
* **Access:** Manager / Admin only
* **Request Body:**
  ```json
  {
    "name": "Beta Labs Corp",
    "is_active": false
  }
  ```
  *(Both fields are optional)*
* **Expected Response (`200 OK`):**
  ```json
  {
    "id": "bc77e212-0012-4c2d-9ef8-232187d6e41b",
    "name": "Beta Labs Corp",
    "is_active": false,
    "created_by": "1c7f8a29-012b-4c5d-9ef8-e02d8471c26b",
    "created_at": "2026-06-05T03:00:00.000Z",
    "updated_at": "2026-06-05T03:05:00.000Z"
  }
  ```

### 5.4 Delete Client
Deletes a client record. Fails with `CLIENT_IN_USE` code if any timesheet entry is logged against this client.
* **Method:** `DELETE`
* **Path:** `/clients/:id`
* **Access:** Admin only
* **Expected Response (`200 OK`):**
  ```json
  {
    "message": "Client deleted successfully."
  }
  ```
* **Error Response - Client In Use (`400 Bad Request`):**
  ```json
  {
    "error": {
      "code": "CLIENT_IN_USE",
      "message": "Cannot delete a client that has logged timesheet entries. Deactivate instead.",
      "details": {}
    }
  }
  ```

### 5.5 List Active Categories
Retrieves active categories for dropdown selection.
* **Method:** `GET`
* **Path:** `/categories`
* **Access:** Protected (All roles)
* **Expected Response (`200 OK`):**
  ```json
  [
    {
      "id": "4da767f2-a23d-4c31-8e99-cc772211bbdd",
      "name": "Development",
      "type": "system"
    }
  ]
  ```

### 5.6 Create Category
Creates a new custom category.
* **Method:** `POST`
* **Path:** `/categories`
* **Access:** Manager / Admin only
* **Request Body:**
  ```json
  {
    "name": "Internal Projects"
  }
  ```
* **Expected Response (`201 Created`):**
  ```json
  {
    "id": "4da767f2-a23d-4c31-8e99-cc772211bbdd",
    "name": "Internal Projects",
    "type": "custom",
    "is_active": true,
    "created_by": "1c7f8a29-012b-4c5d-9ef8-e02d8471c26b",
    "created_at": "2026-06-05T03:00:00.000Z",
    "updated_at": "2026-06-05T03:00:00.000Z"
  }
  ```

### 5.7 Update Category
Updates custom category name or toggle status.
* **Method:** `PATCH`
* **Path:** `/categories/:id`
* **Access:** Manager / Admin only
* **Request Body:**
  ```json
  {
    "name": "Administration & Support",
    "is_active": false
  }
  ```
  *(Both fields are optional)*
* **Expected Response (`200 OK`):**
  ```json
  {
    "id": "4da767f2-a23d-4c31-8e99-cc772211bbdd",
    "name": "Administration & Support",
    "type": "custom",
    "is_active": false,
    "created_by": "1c7f8a29-012b-4c5d-9ef8-e02d8471c26b",
    "created_at": "2026-06-05T03:00:00.000Z",
    "updated_at": "2026-06-05T03:05:00.000Z"
  }
  ```

### 5.8 Delete Category
Deletes a custom category. Fails if the category type is `system` or if entries reference it.
* **Method:** `DELETE`
* **Path:** `/categories/:id`
* **Access:** Admin only
* **Expected Response (`200 OK`):**
  ```json
  {
    "message": "Category deleted successfully."
  }
  ```
* **Error Response - Category In Use (`400 Bad Request`):**
  ```json
  {
    "error": {
      "code": "CATEGORY_IN_USE",
      "message": "Cannot delete a category that is referenced by existing timesheet entries.",
      "details": {}
    }
  }
  ```

---

## 6. Reports Module (`/reports`)

### 6.1 Export Timesheet Data to CSV
Fills CSV data sheet, saves to storage, and generates 1-hour signed URL.
* **Method:** `POST`
* **Path:** `/reports/export/csv`
* **Access:** Manager/Admin only
* **Request Body:**
  ```json
  {
    "from": "2026-06-01",
    "to": "2026-06-05",
    "user_ids": ["1c7f8a29-012b-4c5d-9ef8-e02d8471c26b"],
    "category_ids": [],
    "client_ids": []
  }
  ```
* **Expected Response (`200 OK`):**
  ```json
  {
    "url": "https://uxemyxdwphnprmddyigl.supabase.co/storage/v1/object/sign/reports/timesheet-export-17219800.csv?token=ey..."
  }
  ```

### 6.2 Export Timesheet Data to PDF
Fills PDF table page, saves to storage, and generates 1-hour signed URL.
* **Method:** `POST`
* **Path:** `/reports/export/pdf`
* **Access:** Manager/Admin only
* **Request Body:** Same filters as CSV.
* **Expected Response (`200 OK`):**
  *(Similar signed URL response referencing target `.pdf` file)*

### 6.3 Fetch Team Aggregate Summary
Summarizes weekly workload stats.
* **Method:** `GET`
* **Path:** `/reports/team-summary`
* **Access:** Manager/Admin only
* **Query Parameters:** `manager_id` (Admins only)
* **Expected Response (`200 OK`):**
  ```json
  {
    "totalHoursThisWeek": 24.5,
    "activeMembers": 3,
    "topCategory": "Development",
    "topClient": "Acme Corp",
    "hoursByDay": [
      { "date": "2026-05-30", "hours": 0.0 },
      { "date": "2026-05-31", "hours": 0.0 },
      { "date": "2026-06-01", "hours": 8.0 },
      { "date": "2026-06-02", "hours": 6.5 },
      { "date": "2026-06-03", "hours": 7.0 },
      { "date": "2026-06-04", "hours": 3.0 },
      { "date": "2026-06-05", "hours": 0.0 }
    ]
  }
  ```

---

## 7. Notifications Module (`/notifications`)

### 7.1 Fetch User Notifications
* **Method:** `GET`
* **Path:** `/notifications`
* **Access:** Protected (All roles)
* **Expected Response (`200 OK`):**
  ```json
  {
    "data": [
      {
        "id": "e02d8471-1234-abcd-9ef8-e02d8471c26b",
        "user_id": "1c7f8a29-012b-4c5d-9ef8-e02d8471c26b",
        "title": "Edit request approved",
        "body": "Your edit request for 6/5/2026 has been approved. You can now edit the entry.",
        "is_read": false,
        "created_at": "2026-06-05T03:05:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

### 7.2 Mark Single Notification as Read
* **Method:** `PATCH`
* **Path:** `/notifications/:id/read`
* **Access:** Protected
* **Expected Response (`200 OK`):**
  *(Returns updated notification object with `is_read = true`)*

### 7.3 Mark All Notifications as Read
* **Method:** `PATCH`
* **Path:** `/notifications/read-all`
* **Access:** Protected
* **Expected Response (`200 OK`):**
  ```json
  {
    "message": "All notifications marked as read."
  }
  ```

---

## 8. Audit Logs Module (`/audit-logs`)

### 8.1 Fetch Audit Log List
Retrieves full paginated list of audit events.
* **Method:** `GET`
* **Path:** `/audit-logs`
* **Access:** Admin only
* **Query Parameters:** `entity`, `user_id`, `action`, `from`, `to`, `page`, `limit`
* **Expected Response (`200 OK`):**
  ```json
  {
    "data": [
      {
        "id": "c07f8a29-1234-abcd-9ef8-e02d8471c26b",
        "user_id": "1c7f8a29-012b-4c5d-9ef8-e02d8471c26b",
        "action": "UPDATE",
        "entity": "timesheet_entries",
        "entity_id": "ef8a2c44-789a-4c2d-8ef2-e32d1847c211",
        "payload": {
          "before": {
            "is_locked": true,
            "task_title": "Fix checkout bug"
          },
          "after": {
            "is_locked": false,
            "task_title": "Fix checkout bug"
          }
        },
        "created_at": "2026-06-05T03:05:00.000Z",
        "user": {
          "id": "1c7f8a29-012b-4c5d-9ef8-e02d8471c26b",
          "full_name": "John Doe",
          "email": "john_doe@cybernara.com"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

### 8.2 Get Audit Log Detail
Retrieves detailed information for a specific audit log record.
* **Method:** `GET`
* **Path:** `/audit-logs/:id`
* **Access:** Admin only
* **Expected Response (`200 OK`):**
  ```json
  {
    "id": "c07f8a29-1234-abcd-9ef8-e02d8471c26b",
    "user_id": "1c7f8a29-012b-4c5d-9ef8-e02d8471c26b",
    "action": "UPDATE",
    "entity": "timesheet_entries",
    "entity_id": "ef8a2c44-789a-4c2d-8ef2-e32d1847c211",
    "payload": {
      "before": {
        "is_locked": true,
        "task_title": "Fix checkout bug"
      },
      "after": {
        "is_locked": false,
        "task_title": "Fix checkout bug"
      }
    },
    "created_at": "2026-06-05T03:05:00.000Z",
    "user": {
      "id": "1c7f8a29-012b-4c5d-9ef8-e02d8471c26b",
      "full_name": "John Doe",
      "email": "john_doe@cybernara.com"
    }
  }
  ```
