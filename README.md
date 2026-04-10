# 📋 Project Hub — ClickUp Clone

> A full-featured project management web application inspired by ClickUp, built with **Laravel 12 + Inertia.js + React 18 + Tailwind CSS 4**.

---

## 🗂️ Table of Contents

1. [Tech Stack](#-tech-stack)
2. [Requirements](#-requirements)
3. [Installation](#-installation)
4. [Environment Setup](#-environment-setup)
5. [Database & ERD](#-database--erd)
6. [Modules & Flow](#-modules--flow)
7. [Role & Permission System](#-role--permission-system)
8. [In-App Notifications](#-in-app-notifications)
9. [Project Structure](#-project-structure)
10. [License](#-license)

---

## 🛠 Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Backend     | Laravel 12 (PHP 8.2+)             |
| Frontend    | React 18 + Inertia.js v2          |
| Styling     | Tailwind CSS 4                    |
| Build Tool  | Vite 7                            |
| Database    | MySQL (via Laragon / XAMPP)       |
| Auth        | Laravel Session Auth              |
| Notif       | Laravel Database Notifications    |

---

## 📋 Requirements

- PHP **8.2** or higher
- Composer **2.x**
- Node.js **18+** and npm
- MySQL **8.0+** (or MariaDB)
- A local server environment (Laragon, XAMPP, Herd, or Sail)

---

## 🚀 Installation

### 1. Clone the repository

```bash
git clone <repo-url> project-hub
cd project-hub
```

### 2. Install PHP dependencies

```bash
composer install
```

### 3. Install Node dependencies

```bash
npm install
```

### 4. Configure environment

```bash
cp .env.example .env
php artisan key:generate
```

Edit `.env` and set your database credentials:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=project_hub
DB_USERNAME=root
DB_PASSWORD=
```

### 5. Run migrations

```bash
php artisan migrate
```

This creates all tables and seeds the default role permissions.

### 6. Build frontend assets

```bash
npm run build
```

### 7. Start the development server

```bash
# Option A — Laravel built-in server + Vite hot reload
composer run dev

# Option B — Manual (two terminals)
php artisan serve
npm run dev
```

The app will be available at **http://localhost:8000**.

---

## 🔧 Environment Setup

Key `.env` values to review:

```env
APP_NAME="Project Hub"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

SESSION_DRIVER=database
SESSION_LIFETIME=120

MAIL_MAILER=log   # No email service needed — notifications use db driver
```

---

## 🗃️ Database & ERD

### Entity Relationship Diagram

```
┌──────────────┐     n:m via team_user     ┌──────────────┐
│    users     │◄─────────────────────────►│    teams     │
│──────────────│                           │──────────────│
│ id           │                           │ id           │
│ name         │                           │ name         │
│ email        │         n:m via           │ description  │
│ password     │      project_team         │ created_by   │
│ role         │◄────────────────────────► │ timestamps   │
│ timestamps   │                           └──────────────┘
└──────┬───────┘
       │ assigned_to
       │
       │          ┌──────────────┐      1:n      ┌──────────────┐
       │          │   projects   │──────────────►│    boards    │
       │          │──────────────│               │──────────────│
       │          │ id           │               │ id           │
       │          │ name         │               │ name         │
       │          │ description  │               │ description  │
       │          │ timestamps   │               │ project_id   │
       │          └──────────────┘               │ user_id      │
       │                                         │ timestamps   │
       │                                         └──────┬───────┘
       │                                                │ 1:n
       │                                                ▼
       │                                        ┌──────────────┐
       └───────────────────────────────────────►│    tasks     │
                                                │──────────────│
                                                │ id           │
                                                │ title        │
                                                │ description  │
                                                │ status       │ todo|in_progress|done
                                                │ priority     │ low|medium|high|critical
                                                │ progress     │ 0–100
                                                │ due_date     │
                                                │ start_date   │
                                                │ board_id     │ FK
                                                │ assigned_to  │ FK → users
                                                │ timestamps   │
                                                └──────┬───────┘
                                                       │ 1:n
                                     ┌─────────────────┴──────────────────┐
                                     ▼                                     ▼
                             ┌──────────────────┐              ┌───────────────────────┐
                             │  task_comments   │              │  task_activity_logs   │
                             │──────────────────│              │───────────────────────│
                             │ id               │              │ id                    │
                             │ task_id          │              │ task_id               │
                             │ user_id          │              │ user_id               │
                             │ body             │              │ action                │
                             │ timestamps       │              │ old_values (JSON)     │
                             └──────────────────┘              │ new_values (JSON)     │
                                                               │ timestamps            │
                                                               └───────────────────────┘

┌──────────────────────┐        ┌──────────────────────────┐
│   role_permissions   │        │      notifications       │
│──────────────────────│        │──────────────────────────│
│ id                   │        │ id (uuid)                │
│ role                 │        │ type                     │
│ permission           │        │ notifiable_type          │
│ enabled (boolean)    │        │ notifiable_id            │
│ timestamps           │        │ data (JSON)              │
└──────────────────────┘        │ read_at                  │
                                │ created_at               │
                                └──────────────────────────┘

Pivot tables:
  team_user      → team_id, user_id, role (member|leader)
  project_team   → project_id, team_id
```

### Table Summary

| Table                 | Description                                          |
|-----------------------|------------------------------------------------------|
| `users`               | Authenticated users with role (admin/manager/user)   |
| `teams`               | Groups of users; created by admins/managers          |
| `projects`            | Top-level containers for boards                      |
| `boards`              | Kanban-style boards within a project                 |
| `tasks`               | Work items inside a board; assigned to a user        |
| `task_comments`       | User comments on a task                              |
| `task_activity_logs`  | Audit trail of every change on a task                |
| `team_user`           | Pivot: user ↔ team with role                         |
| `project_team`        | Pivot: project ↔ team                                |
| `role_permissions`    | Per-role permission flags (admin always full)        |
| `notifications`       | Laravel database notifications (bell icon)           |

---

## 📦 Modules & Flow

### 1. Authentication

```
Visitor → /login (email + password)
        → Session created → redirect /dashboard

Visitor → /register (name, email, password)
        → User created with role=user → redirect /dashboard

Authenticated → POST /logout → Session destroyed → redirect /
```

**Files:** `AuthController.php` · `Login.jsx` · `Register.jsx`

---

### 2. Dashboard (Informative)

```
/dashboard
  Admin   → All stats + all projects + 4 task widgets
  Manager → Their teams' projects + 4 task widgets
  User    → Assigned projects + 4 task widgets

Quick-stat cards (2×2 grid):
  📅 Tasks Due Today   🔴 Overdue Tasks
  📦 Created This Week ✅ Done This Week

Task-list widgets (3 columns):
  • Tasks Due Today    — sorted by priority
  • Overdue Tasks      — sorted by due date asc
  • Recently Updated   — sorted by updated_at desc

Weekly Trend chart:
  — Native CSS dual-bar chart (no external library)
  — Blue bars = tasks created, emerald bars = tasks completed
  — Last 7 days rolling window
```

**Files:** `AuthController::dashboard()` · `Dashboard.jsx`

---

### 3. Project Management

```
Dashboard → [+ New Project] → POST /projects

/projects/{id}
  → Tabs: Tasks | Boards | Teams
  → Edit project name/description
  → Attach/detach teams
  → Create / delete boards
  → Delete project
```

Permissions enforced: `create_project`, `delete_project`.

**Files:** `ProjectController.php` · `ProjectDetail.jsx`

---

### 4. Board (Kanban)

```
/boards/{board}
  → 3 columns: Todo | In Progress | Done
  → Drag task card to change status (PATCH /tasks/{task}/status)
  → [+ Task] → create modal → POST /boards/{board}/tasks
  → Click task → TaskDetailDrawer (3 tabs: Details / Comments / Activity)
  → Edit modal → PATCH /tasks/{task}
  → Progress slider → PATCH /tasks/{task}/progress
  → Assign user dropdown → PATCH /tasks/{task}/assignment
  → Delete task → DELETE /tasks/{task}/delete
```

**TaskDetailDrawer tabs:**
| Tab | Content |
|-----|---------|
| Details | Title, description, status, priority, progress, dates, assignee |
| Comments | Threaded comments — POST / DELETE `/tasks/{task}/comments` |
| Activity | Full audit log — who changed what and when |

**Files:** `BoardController.php` · `Board.jsx` · `TaskDetailDrawer.jsx`

---

### 5. My Tasks

```
/my-tasks
  Admin   → shows all unassigned tasks
  Others  → shows tasks assigned to the logged-in user

View toggle: Card view | List view
Filter: Status | Search
Pagination: 10 per page
Progress slider on each card (gated by canUpdateProgress permission)
```

**Files:** `AuthController::myTasks()` · `MyTasks.jsx`

---

### 6. Team Management

```
/teams (Admin only)
  → Create / edit / delete teams
  → Add member → POST /teams/{team}/members
  → Change member role (member/leader)
  → Remove member

/my-team (All users)
  → View own team details and members
```

**Files:** `TeamController.php` · `Teams.jsx` · `MyTeam.jsx`

---

### 7. Manage Tasks (Datatable)

```
/manage-tasks (requires permission: access_manage_tasks)
  Admin   → all tasks across all boards
  Manager → tasks in boards belonging to their teams' projects
  User    → only their assigned tasks

Actions:
  → Create / edit / delete task
  → Filter: project, board, status, priority, assignee, search
  → Pagination: 10 per page
  → TaskDetailDrawer accessible from table rows
```

**Files:** `TaskController.php` · `ManageTask.jsx`

---

### 8. Workload

```
/workload (requires permission: access_workload)
  → Task distribution per team member
  Admin   → all teams
  Manager → their teams
  User    → their teams

Member card shows:
  → Total tasks, todo/in-progress/done counts
  → Progress bar per task
```

**Files:** `WorkloadController.php` · `Workload.jsx`

---

### 9. Reporting

```
/reporting (requires permission: access_reporting)
  → Filter: Yearly | Monthly | Weekly period
  → Filter: Project, Team, Board, Status, Assignee
  → Stats: Total, Todo, In Progress, Done, Completion Rate
  → Paginated task table (10 per page)

Data scope:
  Admin   → all tasks
  Manager → tasks in their teams' projects
  User    → only their assigned tasks
```

**Files:** `ReportingController.php` · `Reporting.jsx`

---

### 10. Calendar

```
/calendar
  → Monthly calendar grid showing tasks with due_date
  → Click a date cell to see tasks due that day
```

**Files:** `CalendarController.php` · `Calendar.jsx`

---

### 11. User Management

```
/users (Admin only)
  → View all users with roles
  → Create / edit / delete user
  → Filter by role | Search by name or email
  → Pagination: 10 per page
```

**Files:** `UserController.php` · `Users.jsx`

---

### 12. Manage Roles & Permissions

```
/roles (Admin only)
  → Tab: Overview     — role cards with user lists
  → Tab: Permissions  — toggle matrix for Manager and User roles
  → Tab: Users        — change any user's role

Configurable permissions (13 total):
  Page access : access_reporting, access_workload, access_manage_tasks
  Project     : create_project, delete_project
  Board       : create_board, delete_board
  Task        : create_task, delete_task, assign_task
  Granular    : edit_task_detail, edit_task_status, update_task_progress

Default state:
  manager → all enabled
  user    → only update_task_progress enabled
```

**Files:** `RoleController.php` · `RolePermission.php` · `ManageRoles.jsx`

---

### 13. Profile

```
/profile
  → Edit name and email → PATCH /profile
  → Change password     → PATCH /profile/password
```

**Files:** `ProfileController.php` · `Profile.jsx`

---

### 14. Task Comments & Activity Log

Every task has a built-in audit trail. All changes (create, assign, status change, progress update, field edit) are recorded in `task_activity_logs` and displayed in the **Activity** tab of `TaskDetailDrawer`.

Users can also leave comments in the **Comments** tab.

```
POST   /tasks/{task}/comments          → add comment
DELETE /tasks/{task}/comments/{comment} → delete own comment
```

**Files:** `TaskCommentController.php` · `TaskActivityLog.php` · `TaskDetailDrawer.jsx`

---

## 🔐 Role & Permission System

### Roles

| Role      | Description                                                   |
|-----------|---------------------------------------------------------------|
| `admin`   | Full access to everything. Not configurable.                  |
| `manager` | Access configured via permission toggles (default: all on).   |
| `user`    | Access configured via permission toggles (default: most off). |

### Configurable Permissions

| Permission Key          | Category     | What it controls                              |
|-------------------------|--------------|-----------------------------------------------|
| `access_reporting`      | Page access  | Can view the Reporting page                   |
| `access_workload`       | Page access  | Can view the Workload page                    |
| `access_manage_tasks`   | Page access  | Can view the Manage Tasks datatable           |
| `create_project`        | Project      | Can create and edit projects                  |
| `delete_project`        | Project      | Can delete projects                           |
| `create_board`          | Board        | Can create and edit boards                    |
| `delete_board`          | Board        | Can delete boards                             |
| `create_task`           | Task         | Can create tasks                              |
| `delete_task`           | Task         | Can delete tasks                              |
| `assign_task`           | Task         | Can assign tasks to other users               |
| `edit_task_detail`      | Granular     | Can edit title, description, priority, dates  |
| `edit_task_status`      | Granular     | Can change task status (todo/in_progress/done)|
| `update_task_progress`  | Granular     | Can move the progress slider (0–100)          |

Permissions are checked server-side via `RolePermission::check($role, $permission)` and shared to the frontend as `userPermissions[]` through `HandleInertiaRequests`, so:
- Sidebar links are hidden when the user lacks the required permission
- Form fields in modals are **disabled** when `edit_task_detail` / `edit_task_status` / `update_task_progress` is off
- Buttons (Add, Edit, Delete) are conditionally rendered per permission

---

## 🔔 In-App Notifications

### Overview

A full in-app notification system using **Laravel Database Notifications**. No external service required — all notifications are stored in the `notifications` table.

### Events that trigger notifications

| Trigger | Type | Who gets notified |
|---------|------|-------------------|
| Task assigned to a user | `TaskAssigned` | The assigned user |
| Assignment changed | `TaskAssigned` | The new assignee |
| Task status changed | `TaskStatusChanged` | The assigned user |
| Task due today or tomorrow | `DeadlineApproaching` | The assigned user |

> Self-notifications are always skipped (you won't notify yourself).

### Notification classes

| Class | File |
|-------|------|
| `TaskAssigned` | `app/Notifications/TaskAssigned.php` |
| `TaskStatusChanged` | `app/Notifications/TaskStatusChanged.php` |
| `DeadlineApproaching` | `app/Notifications/DeadlineApproaching.php` |

### Deadline check command

```bash
php artisan tasks:check-deadlines
```

Checks all non-done tasks due **today or tomorrow**, sends `DeadlineApproaching` notifications, and avoids duplicate notifications within the same day.

**Scheduler** — runs automatically every morning at 08:00 (register cron on server):

```bash
* * * * * cd /path/to/project && php artisan schedule:run >> /dev/null 2>&1
```

Configured in `routes/console.php`:

```php
Schedule::command('tasks:check-deadlines')->dailyAt('08:00');
```

### Bell icon UI

- **Badge** in the top navbar showing unread count (shows `9+` when > 9)
- Count is shared globally via `HandleInertiaRequests` as `unreadNotifCount`
- Badge syncs automatically after every Inertia navigation
- **Dropdown panel** (click bell to open):
  - 📋 Assigned / 🔄 Status changed / ⏰ Deadline icons per type
  - Unread items have a blue background + blue dot indicator
  - Click any unread notification → marks it read instantly
  - **"Mark all read"** button clears the entire list
  - Scrollable list (max 30 notifications shown)

### API endpoints

| Method | URL | Description |
|--------|-----|-------------|
| `GET` | `/notifications` | Fetch latest 30 notifications (JSON) |
| `PATCH` | `/notifications/{id}/read` | Mark a single notification as read |
| `PATCH` | `/notifications/read-all` | Mark all notifications as read |

---

## 🗂️ Project Structure

```
app/
├── Console/
│   └── Commands/
│       └── CheckDeadlines.php          # php artisan tasks:check-deadlines
├── Http/
│   ├── Controllers/
│   │   ├── AuthController.php          # Login, register, logout, dashboard, my-tasks
│   │   ├── BoardController.php         # Board CRUD + task CRUD + notifications
│   │   ├── CalendarController.php      # Calendar view
│   │   ├── NotificationController.php  # Bell dropdown API (fetch, mark read)
│   │   ├── ProfileController.php       # Profile update
│   │   ├── ProjectController.php       # Project CRUD + team attachment
│   │   ├── ReportingController.php     # Reporting page
│   │   ├── RoleController.php          # Manage roles & permissions
│   │   ├── TaskCommentController.php   # Task comments CRUD
│   │   ├── TaskController.php          # Manage tasks datatable + notifications
│   │   ├── TeamController.php          # Team CRUD + members
│   │   ├── UserController.php          # User management
│   │   └── WorkloadController.php      # Workload view
│   └── Middleware/
│       └── HandleInertiaRequests.php   # Shares auth, flash, userPermissions, unreadNotifCount
├── Models/
│   ├── Board.php
│   ├── Project.php
│   ├── RolePermission.php              # Static check/cache for permissions
│   ├── Task.php
│   ├── TaskActivityLog.php             # Audit trail model + log() helper
│   ├── Team.php
│   └── User.php                        # Has Notifiable trait
├── Notifications/
│   ├── DeadlineApproaching.php
│   ├── TaskAssigned.php
│   └── TaskStatusChanged.php
resources/
├── js/
│   ├── Components/
│   │   ├── AppLayout.jsx               # Sidebar + topbar + NotificationBell
│   │   ├── ConfirmDialog.jsx           # Reusable confirm modal
│   │   ├── Modal.jsx                   # Reusable form modal with field helpers
│   │   ├── Pagination.jsx              # Reusable pagination component
│   │   ├── Sidebar.jsx
│   │   ├── TaskDetailDrawer.jsx        # 3-tab drawer: Details / Comments / Activity
│   │   └── Toast.jsx                   # Global toast notification
│   ├── lib/
│   │   └── toast.js                    # toast.success() / toast.error() helpers
│   └── Pages/
│       ├── Board.jsx
│       ├── Calendar.jsx
│       ├── Dashboard.jsx               # Informative: 4 widgets + weekly trend chart
│       ├── Login.jsx
│       ├── ManageRoles.jsx
│       ├── ManageTask.jsx
│       ├── MyTasks.jsx
│       ├── MyTeam.jsx
│       ├── Profile.jsx
│       ├── ProjectDetail.jsx
│       ├── Register.jsx
│       ├── Reporting.jsx
│       ├── Teams.jsx
│       ├── TeamDetail.jsx
│       ├── Users.jsx
│       └── Workload.jsx
database/
└── migrations/                         # All migration files
routes/
├── console.php                         # Scheduler (tasks:check-deadlines daily 08:00)
└── web.php                             # All application routes
```

---

## 📄 License

This project is open-sourced software for educational and demonstration purposes.


---

## 🗂️ Table of Contents

1. [Tech Stack](#-tech-stack)
2. [Requirements](#-requirements)
3. [Installation](#-installation)
4. [Environment Setup](#-environment-setup)
5. [Database & ERD](#-database--erd)
6. [Modules & Flow](#-modules--flow)
7. [Role & Permission System](#-role--permission-system)
8. [Project Structure](#-project-structure)

---

## 🛠 Tech Stack

| Layer       | Technology                    |
|-------------|-------------------------------|
| Backend     | Laravel 12 (PHP 8.2+)         |
| Frontend    | React 18 + Inertia.js v2      |
| Styling     | Tailwind CSS 4                |
| Build Tool  | Vite 7                        |
| Database    | MySQL (via Laragon / XAMPP)   |
| Auth        | Laravel Session Auth          |

---

## 📋 Requirements

- PHP **8.2** or higher
- Composer **2.x**
- Node.js **18+** and npm
- MySQL **8.0+** (or MariaDB)
- A local server environment (Laragon, XAMPP, Herd, or Sail)

---

## 🚀 Installation

### 1. Clone the repository

```bash
git clone <repo-url> project-hub
cd project-hub
```

### 2. Install PHP dependencies

```bash
composer install
```

### 3. Install Node dependencies

```bash
npm install
```

### 4. Configure environment

```bash
cp .env.example .env
php artisan key:generate
```

Edit `.env` and set your database credentials:

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=project_hub
DB_USERNAME=root
DB_PASSWORD=
```

### 5. Run migrations

```bash
php artisan migrate
```

This will create all tables and seed the default role permissions (manager = all enabled, user = all disabled).

### 6. Build frontend assets

```bash
npm run build
```

### 7. Start the development server

```bash
# Option A — Laravel built-in server + Vite (hot reload)
composer run dev

# Option B — Manual (two terminals)
php artisan serve
npm run dev
```

The app will be available at **http://localhost:8000**.

---

## 🔧 Environment Setup

Key `.env` values to review:

```env
APP_NAME="Project Hub"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

SESSION_DRIVER=database
SESSION_LIFETIME=120

MAIL_MAILER=log   # No email service needed for local dev
```

---

## 🗃️ Database & ERD

### Entity Relationship Diagram

```
┌──────────────┐     n:m via team_user     ┌──────────────┐
│    users     │◄─────────────────────────►│    teams     │
│──────────────│                           │──────────────│
│ id           │                           │ id           │
│ name         │                           │ name         │
│ email        │                           │ description  │
│ password     │         n:m via           │ created_by   │
│ role         │      project_team         │ timestamps   │
│ timestamps   │         ┌─────────────────┤              │
└──────┬───────┘         │                 └──────────────┘
       │ assigned_to     │
       │                 ▼
       │          ┌──────────────┐      1:n      ┌──────────────┐
       │          │   projects   │──────────────►│    boards    │
       │          │──────────────│               │──────────────│
       │          │ id           │               │ id           │
       │          │ name         │               │ name         │
       │          │ description  │               │ description  │
       │          │ timestamps   │               │ project_id   │
       │          └──────────────┘               │ created_by   │
       │                                         │ timestamps   │
       │                                         └──────┬───────┘
       │                                                │ 1:n
       │                                                ▼
       │                                        ┌──────────────┐
       └───────────────────────────────────────►│    tasks     │
                                                │──────────────│
                                                │ id           │
                                                │ title        │
                                                │ description  │
                                                │ status       │  todo | in_progress | done
                                                │ priority     │  low | medium | high | critical
                                                │ progress     │  0–100
                                                │ due_date     │
                                                │ start_date   │
                                                │ board_id     │ FK
                                                │ assigned_to  │ FK → users
                                                │ timestamps   │
                                                └──────────────┘

┌──────────────────────┐
│   role_permissions   │
│──────────────────────│
│ id                   │
│ role                 │  manager | user
│ permission           │  access_reporting | create_task | etc.
│ enabled              │  boolean
│ timestamps           │
└──────────────────────┘

Pivot tables:
  team_user      → team_id, user_id, role (member|leader)
  project_team   → project_id, team_id
```

### Table Summary

| Table              | Description                                        |
|--------------------|----------------------------------------------------|
| `users`            | Authenticated users with role (admin/manager/user) |
| `teams`            | Groups of users; created by admins/managers        |
| `projects`         | Top-level containers for boards                    |
| `boards`           | Kanban-style boards within a project               |
| `tasks`            | Work items inside a board; assigned to a user      |
| `team_user`        | Pivot: user ↔ team with role                       |
| `project_team`     | Pivot: project ↔ team                              |
| `role_permissions` | Per-role permission flags (admin always full)      |

---

## 📦 Modules & Flow

### 1. Authentication

**Flow:**
```
Visitor → /login (email + password)
        → Session created → redirect /dashboard

Visitor → /register (name, email, password)
        → User created with role=user → redirect /dashboard

Authenticated → POST /logout → Session destroyed → redirect /
```

**Files:**
- Controller: `app/Http/Controllers/AuthController.php`
- Pages: `resources/js/Pages/Login.jsx`, `Register.jsx`

---

### 2. Dashboard

**Flow:**
```
Login → /dashboard
  Admin   → sees all stats + projects + unassigned tasks
  Manager → sees stats + projects + their team's project IDs
  User    → sees stats + projects + assigned tasks
```

Each project card shows its boards. Clicking a board navigates to the Kanban board (`/boards/{id}`).

**Files:**
- Controller: `AuthController::dashboard()`
- Page: `resources/js/Pages/Dashboard.jsx`

---

### 3. Project Management

**Flow:**
```
Dashboard → [+ New Project] button
  → POST /projects (name, description)
  → Redirect to /projects/{id}

Project Detail page:
  → Tabs: Tasks | Boards | Teams
  → Edit project name/description
  → Attach/detach teams
  → Create boards
  → Delete project
```

Permissions enforced: `create_project`, `delete_project`.

**Files:**
- Controller: `app/Http/Controllers/ProjectController.php`
- Page: `resources/js/Pages/ProjectDetail.jsx`

---

### 4. Board (Kanban)

**Flow:**
```
/boards/{board}
  → 3 columns: Todo | In Progress | Done
  → Drag-and-drop (status update via PATCH /tasks/{task}/status)
  → [+ Task] → modal → POST /boards/{board}/tasks
  → Click task card → edit modal → PATCH /tasks/{task}
  → Update progress bar → PATCH /tasks/{task}/progress
  → Assign user → PATCH /tasks/{task}/assignment
  → Delete task → DELETE /tasks/{task}/delete
```

**Files:**
- Controller: `app/Http/Controllers/BoardController.php`
- Page: `resources/js/Pages/Board.jsx`

---

### 5. My Tasks

**Flow:**
```
/my-tasks
  Admin   → shows all unassigned tasks
  Others  → shows tasks assigned to the logged-in user

View toggle: Card view | List view
Filter by: Status | Search
Pagination: 10 per page
```

**Files:**
- Controller: `AuthController::myTasks()`
- Page: `resources/js/Pages/MyTasks.jsx`

---

### 6. Team Management

**Flow:**
```
/teams (Admin only)
  → Create team → POST /teams
  → Edit team name/description → PATCH /teams/{team}
  → Delete team → DELETE /teams/{team}
  → Add member → POST /teams/{team}/members
  → Change member role (member/leader) → PATCH /teams/{team}/members/{user}
  → Remove member → DELETE /teams/{team}/members/{user}

/my-team (All users)
  → View own team details and members
```

**Files:**
- Controller: `app/Http/Controllers/TeamController.php`
- Pages: `resources/js/Pages/Teams.jsx`, `MyTeam.jsx`

---

### 7. Manage Tasks (Datatable)

**Flow:**
```
/manage-tasks (requires permission: access_manage_tasks)
  Admin   → sees all tasks across all boards
  Manager → sees tasks in boards belonging to their teams' projects
  User    → sees only their assigned tasks

Actions:
  → Create task → POST /manage-tasks
  → Edit task → PATCH /manage-tasks/{task}
  → Delete task → DELETE /manage-tasks/{task}
  → Filter by: project, board, status, priority, assignee, search
  → Pagination: 10 per page
```

**Files:**
- Controller: `app/Http/Controllers/TaskController.php`
- Page: `resources/js/Pages/ManageTask.jsx`

---

### 8. Workload

**Flow:**
```
/workload (requires permission: access_workload)
  → Visualizes task distribution per team member
  Admin   → all teams
  Manager → their teams
  User    → their teams

Each member card shows:
  → Total tasks, todo/in-progress/done counts
  → Progress bar per task
```

**Files:**
- Controller: `app/Http/Controllers/WorkloadController.php`
- Page: `resources/js/Pages/Workload.jsx`

---

### 9. Reporting

**Flow:**
```
/reporting (requires permission: access_reporting)
  → Filter by period: Yearly | Monthly | Weekly
  → Filter by: Project, Team, Board, Status, Assignee
  → Stats: Total, Todo, In Progress, Done, Completion Rate
  → Paginated task table (10 per page)
  
Data scope:
  Admin   → all tasks
  Manager → tasks in their teams' projects
  User    → only their assigned tasks
```

**Files:**
- Controller: `app/Http/Controllers/ReportingController.php`
- Page: `resources/js/Pages/Reporting.jsx`

---

### 10. Calendar

**Flow:**
```
/calendar
  → Displays tasks with due_date on a monthly calendar grid
  → Click a date to see tasks due that day
```

**Files:**
- Controller: `app/Http/Controllers/CalendarController.php`
- Page: `resources/js/Pages/Calendar.jsx`

---

### 11. User Management

**Flow:**
```
/users (Admin only)
  → View all users with roles
  → Create user → POST /users
  → Edit user (name, email, role) → PATCH /users/{user}
  → Delete user → DELETE /users/{user}
  → Filter by role | Search by name/email
  → Pagination: 10 per page
```

**Files:**
- Controller: `app/Http/Controllers/UserController.php`
- Page: `resources/js/Pages/Users.jsx`

---

### 12. Manage Roles & Permissions

**Flow:**
```
/roles (Admin only)
  → Tab: Overview — role cards with user lists
  → Tab: Permissions — toggle matrix for Manager and User roles
      Each toggle calls PATCH /roles/{role}/permissions
  → Tab: Users — change any user's role via dropdown
      Calls PATCH /roles/users/{user}

10 configurable permissions:
  Halaman  : access_reporting, access_workload, access_manage_tasks
  Project  : create_project, delete_project
  Board    : create_board, delete_board
  Task     : create_task, delete_task, assign_task

Note: Admin always has full access (not configurable).
```

**Files:**
- Controller: `app/Http/Controllers/RoleController.php`
- Model: `app/Models/RolePermission.php`
- Page: `resources/js/Pages/ManageRoles.jsx`

---

### 13. Profile

**Flow:**
```
/profile
  → Edit name and email → PATCH /profile
  → Change password → PATCH /profile/password
```

**Files:**
- Controller: `app/Http/Controllers/ProfileController.php`
- Page: `resources/js/Pages/Profile.jsx`

---

## 🔐 Role & Permission System

### Roles

| Role      | Description                                                  |
|-----------|--------------------------------------------------------------|
| `admin`   | Full access to everything. Cannot be restricted.             |
| `manager` | Access configured via permission toggles (default: all on).  |
| `user`    | Access configured via permission toggles (default: all off). |

### Configurable Permissions

| Permission Key        | Category | What it controls                          |
|-----------------------|----------|-------------------------------------------|
| `access_reporting`    | Halaman  | Can view the Reporting page               |
| `access_workload`     | Halaman  | Can view the Workload page                |
| `access_manage_tasks` | Halaman  | Can view the Manage Tasks datatable       |
| `create_project`      | Project  | Can create and edit projects              |
| `delete_project`      | Project  | Can delete projects                       |
| `create_board`        | Board    | Can create and edit boards                |
| `delete_board`        | Board    | Can delete boards                         |
| `create_task`         | Task     | Can create tasks                          |
| `delete_task`         | Task     | Can delete tasks                          |
| `assign_task`         | Task     | Can assign tasks to other users           |

Permissions are checked via `RolePermission::check($role, $permission)` and also shared to the frontend as `userPermissions` through `HandleInertiaRequests`, so the sidebar hides links the user cannot access.

---

## 🗂️ Project Structure

```
app/
├── Http/
│   ├── Controllers/
│   │   ├── AuthController.php       # Login, register, logout, dashboard, my-tasks
│   │   ├── BoardController.php      # Board CRUD + task CRUD within boards
│   │   ├── CalendarController.php   # Calendar view
│   │   ├── ProfileController.php    # Profile update
│   │   ├── ProjectController.php    # Project CRUD + team attachment
│   │   ├── ReportingController.php  # Reporting page
│   │   ├── RoleController.php       # Manage roles & permissions
│   │   ├── TaskController.php       # Manage tasks datatable
│   │   ├── TeamController.php       # Team CRUD + members
│   │   ├── UserController.php       # User management
│   │   └── WorkloadController.php   # Workload view
│   └── Middleware/
│       └── HandleInertiaRequests.php  # Shares auth, flash, userPermissions
├── Models/
│   ├── Board.php
│   ├── Project.php
│   ├── RolePermission.php   # Static check/cache for permissions
│   ├── Task.php
│   ├── Team.php
│   └── User.php
resources/
├── js/
│   ├── Components/
│   │   ├── AppLayout.jsx    # Sidebar + topbar layout with grouped nav
│   │   └── Pagination.jsx   # Reusable pagination component
│   └── Pages/
│       ├── Board.jsx
│       ├── Calendar.jsx
│       ├── Dashboard.jsx
│       ├── Login.jsx
│       ├── ManageRoles.jsx
│       ├── ManageTask.jsx
│       ├── MyTasks.jsx
│       ├── MyTeam.jsx
│       ├── Profile.jsx
│       ├── ProjectDetail.jsx
│       ├── Register.jsx
│       ├── Reporting.jsx
│       ├── Teams.jsx
│       ├── Users.jsx
│       └── Workload.jsx
database/
└── migrations/              # 15 migration files
routes/
└── web.php                  # All application routes
```

---

## 📄 License

This project is open-sourced software for educational and demonstration purposes.
