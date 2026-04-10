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
| Print/PDF   | react-to-print                    |

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

This creates all tables and seeds the default role permissions (manager = all enabled, user = most disabled).

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
┌──────────────┐   n:m via team_user   ┌──────────────┐
│    users     │◄─────────────────────►│    teams     │
│──────────────│                       │──────────────│
│ id           │                       │ id           │
│ name         │       n:m via         │ name         │
│ email        │    project_team       │ description  │
│ password     │◄─────────────────────►│ created_by   │
│ role         │                       │ timestamps   │
│ timestamps   │                       └──────────────┘
└──────┬───────┘
       │ assigned_to (FK)
       │
       │      ┌──────────────┐    1:n    ┌──────────────┐
       │      │   projects   │──────────►│    boards    │
       │      │──────────────│           │──────────────│
       │      │ id           │           │ id           │
       │      │ name         │           │ name         │
       │      │ description  │           │ description  │
       │      │ timestamps   │           │ project_id   │
       │      └──────┬───────┘           │ created_by   │
       │             │                   │ timestamps   │
       │             │ 1:n labels        └──────┬───────┘
       │             ▼                          │ 1:n
       │      ┌──────────────┐                  ▼
       │      │    labels    │         ┌────────────────┐
       │      │──────────────│         │     tasks      │
       │      │ id           │         │────────────────│
       │      │ project_id   │  n:m    │ id             │
       │      │ name         │◄───────►│ title          │
       │      │ color        │label_task│ description    │
       │      │ timestamps   │         │ status         │ todo|in_progress|done
       │      └──────────────┘         │ priority       │ low|medium|high|critical
       │                               │ progress       │ 0-100
       │                               │ due_date       │
       │                               │ start_date     │
       └──────────────────────────────►│ board_id       │ FK
                                       │ assigned_to    │ FK -> users
                                       │ parent_id      │ FK -> tasks (subtasks)
                                       │ timestamps     │
                                       └───────┬────────┘
                                               │ 1:n
                          ┌────────────────────┴─────────────────────┐
                          ▼                                           ▼
                 ┌──────────────────┐                  ┌───────────────────────┐
                 │  task_comments   │                  │  task_activity_logs   │
                 │──────────────────│                  │───────────────────────│
                 │ id               │                  │ id                    │
                 │ task_id          │                  │ task_id               │
                 │ user_id          │                  │ user_id               │
                 │ body             │                  │ action                │
                 │ timestamps       │                  │ old_values  (JSON)    │
                 └──────────────────┘                  │ new_values  (JSON)    │
                                                       │ timestamps            │
                                                       └───────────────────────┘

┌──────────────────────┐       ┌──────────────────────────┐
│   role_permissions   │       │      notifications       │
│──────────────────────│       │──────────────────────────│
│ id                   │       │ id  (uuid)               │
│ role                 │       │ type                     │
│ permission           │       │ notifiable_type          │
│ enabled  (boolean)   │       │ notifiable_id            │
│ timestamps           │       │ data  (JSON)             │
└──────────────────────┘       │ read_at                  │
                               │ created_at               │
                               └──────────────────────────┘

Pivot tables:
  team_user      -> team_id, user_id, role (member|leader)
  project_team   -> project_id, team_id
  label_task     -> label_id, task_id
```

### Table Summary

| Table                 | Description                                                    |
|-----------------------|----------------------------------------------------------------|
| `users`               | Authenticated users with role (admin / manager / user)         |
| `teams`               | Groups of users; created by admins or managers                 |
| `projects`            | Top-level containers for boards                                |
| `boards`              | Kanban-style boards within a project                           |
| `tasks`               | Work items inside a board; supports subtasks via `parent_id`   |
| `labels`              | Colored tags scoped to a project                               |
| `task_comments`       | User comments on a task                                        |
| `task_activity_logs`  | Full audit trail of every change on a task                     |
| `team_user`           | Pivot: user team with role (member / leader)                   |
| `project_team`        | Pivot: project team                                            |
| `label_task`          | Pivot: label task (many-to-many)                               |
| `role_permissions`    | Per-role permission flags (admin always has full access)       |
| `notifications`       | Laravel database notifications (bell icon in topbar)           |

---

## 📦 Modules & Flow

### 1. Authentication

```
Visitor -> /login  (email + password)
        -> Session created -> redirect /dashboard

Visitor -> /register  (name, email, password)
        -> User created with role=user -> redirect /dashboard

Authenticated -> POST /logout -> Session destroyed -> redirect /
```

**Files:** `AuthController.php` · `Login.jsx` · `Register.jsx`

---

### 2. Dashboard

```
/dashboard
  Admin   -> All stats + all projects + task widgets
  Manager -> Their teams projects + task widgets
  User    -> Assigned projects + task widgets

Quick-stat cards (2x2 grid):
  📅 Tasks Due Today   🔴 Overdue Tasks
  📦 Created This Week ✅ Done This Week

Task-list widgets (3 columns):
  Tasks Due Today   -- sorted by priority
  Overdue Tasks     -- sorted by due date asc
  Recently Updated  -- sorted by updated_at desc

Weekly Trend chart:
  -- Native CSS dual-bar chart (no external library)
  -- Blue bars = tasks created, Emerald bars = tasks completed
  -- Last 7 days rolling window
```

**Files:** `AuthController::dashboard()` · `Dashboard.jsx`

---

### 3. Project Management

```
/projects/{id}
  -> Tabs: Overview | Boards | Teams
  -> Edit project name / description
  -> Attach / detach teams
  -> Create / delete boards
  -> Delete project
  -> Manage labels (create, edit, delete per project)
```

Permissions enforced: `create_project`, `delete_project`.

**Files:** `ProjectController.php` · `ProjectDetail.jsx`

---

### 4. Board (Kanban)

```
/boards/{board}
  -> 3 columns: Todo | In Progress | Done
  -> Drag task card to change status -> PATCH /tasks/{task}/status
  -> [+ Task] -> create modal -> POST /boards/{board}/tasks
  -> Click task card -> TaskDetailDrawer (3 tabs)
  -> Edit modal -> PATCH /tasks/{task}
  -> Progress slider -> PATCH /tasks/{task}/progress
  -> Assign user -> PATCH /tasks/{task}/assignment
  -> Attach / remove labels -> POST /tasks/{task}/labels
  -> Delete task -> DELETE /tasks/{task}/delete
```

TaskDetailDrawer tabs:

| Tab      | Content                                                                            |
|----------|------------------------------------------------------------------------------------|
| Details  | Title, description, status, priority, progress, dates, assignee, labels, subtasks  |
| Comments | Threaded comments -- POST / DELETE /tasks/{task}/comments                          |
| Activity | Full audit log -- who changed what and when                                        |

**Files:** `BoardController.php` · `Board.jsx` · `TaskDetailDrawer.jsx`

---

### 5. My Tasks

```
/my-tasks
  Admin   -> shows all unassigned tasks
  Others  -> shows tasks assigned to the logged-in user

View toggle : Card view | List view
Filter      : Status | Search
Pagination  : 10 per page
Progress slider on each card (gated by update_task_progress permission)
```

**Files:** `AuthController::myTasks()` · `MyTasks.jsx`

---

### 6. Team Management

```
/teams  (Admin only)
  -> Create / edit / delete teams
  -> Add member        -> POST   /teams/{team}/members
  -> Change member role -> PATCH  /teams/{team}/members/{user}
  -> Remove member     -> DELETE /teams/{team}/members/{user}

/my-team  (All roles)
  -> View own team details, members, and projects
```

Permissions enforced: `access_manage_teams`, `manage_team_members`.

**Files:** `TeamController.php` · `Teams.jsx` · `MyTeam.jsx`

---

### 7. Manage Tasks (Datatable)

```
/manage-tasks  (requires permission: access_manage_tasks)
  Admin   -> all tasks across all boards
  Manager -> tasks in boards belonging to their teams projects
  User    -> only their assigned tasks

Actions per row:
  -> Create / edit / delete task
  -> Filter: project, board, status, priority, assignee, search, label
  -> Pagination: 10 per page
  -> TaskDetailDrawer accessible from each row
```

**Files:** `TaskController.php` · `ManageTask.jsx`

---

### 8. Workload

```
/workload  (requires permission: access_workload)
  -> Task distribution per team member
  Admin   -> all teams
  Manager -> their teams
  User    -> their teams

Member card shows:
  -> Total tasks, todo / in-progress / done counts
  -> Progress bar per individual task
```

**Files:** `WorkloadController.php` · `Workload.jsx`

---

### 9. Calendar

```
/calendar
  -> Monthly calendar grid showing tasks with due_date
  -> Click a date cell to see all tasks due that day
```

**Files:** `CalendarController.php` · `Calendar.jsx`

---

### 10. Reporting

```
/reporting  (requires permission: access_reporting)
  -> Filter: Yearly | Monthly | Weekly period
  -> Filter: Project, Team, Board, Status, Assignee
  -> Stats: Total, Todo, In Progress, Done, Completion Rate
  -> Paginated task table -- 10 per page

Data scope:
  Admin   -> all tasks
  Manager -> tasks in their teams projects
  User    -> only their assigned tasks
```

**Files:** `ReportingController::index()` · `Reporting.jsx`

---

### 11. Executive Report

```
/executive-report  (requires permission: access_executive_report)

An advanced analytics page for decision-makers.
All charts are pure CSS -- no external chart library required.

Filters (top bar):
  -> Period: Bulanan | Tahunan
  -> Year, Month
  -> Project, Team

Sections:
  1. KPI Summary Cards (6 cards):
       Total Tasks · Selesai · In Progress · Todo · Overdue · Completion Rate %
  2. Overall Completion Bar:
       Segmented bar -- emerald = done, blue = in progress, gray = todo
  3. Project Health  (left panel):
       Per-project stacked progress bar sorted by task count
       Shows done / in-progress / todo + overdue warning badge
  4. Member Workload  (right panel):
       Per-assignee stacked bar with avatar initials
       Shows completion rate and overdue count
  5. Task Trend  (CSS bar chart):
       Monthly -> week-by-week (W1-W5)
       Yearly  -> month-by-month (Jan-Dec)
       Blue = created · Emerald = completed · Hover tooltip
  6. Priority Risk Matrix  (table):
       All active Critical / High tasks that are overdue or due <= 7 days
       Color-coded rows: red = critical, orange = overdue, yellow = due soon
       Not filtered by period -- always shows live risk

Print PDF:
  -> "Print PDF" button renders only the report content via react-to-print
  -> Isolated iframe -- sidebar / topbar excluded automatically
  -> Background colors preserved (print-color-adjust: exact)
  -> @page { margin: 1.5cm; size: A4 }
  -> Table headers repeat on every printed page

Data scope:
  Admin   -> all tasks and projects
  Manager -> tasks and projects belonging to their teams
```

**Files:** `ReportingController::executive()` · `ExecutiveReport.jsx`

---

### 12. Task Labels

```
Labels are colored tags scoped per project.
Admin and Manager can create / edit / delete labels.
Any user can attach or detach labels on their tasks.

Label API:
  GET    /projects/{project}/labels   -> list labels for a project
  POST   /projects/{project}/labels   -> create label (name, #hex color)
  PATCH  /labels/{label}              -> update label
  DELETE /labels/{label}              -> delete label
  POST   /tasks/{task}/labels         -> sync label_ids on a task

UI entry points:
  Board.jsx          -> LabelPicker chip in the task card / create modal
  ManageTask.jsx     -> Label column + filter in the datatable
  TaskDetailDrawer   -> Labels row in the Details tab
  ProjectDetail.jsx  -> Manage Labels section per project

Label chip appearance:
  -> Solid badge using the custom hex color as background
  -> Contrast-aware text (auto black or white)
  -> Tooltip with full label name on hover
```

**Files:** `LabelController.php` · `Label.php` · `LabelManager.jsx` · `Board.jsx` · `ManageTask.jsx` · `TaskDetailDrawer.jsx`

---

### 13. Subtasks

```
Tasks support one level of subtasks via the parent_id column.

  -> Create subtask inside TaskDetailDrawer -> Details tab
  -> Subtasks share the same structure (title, status, assignee, priority)
  -> Subtask progress rolls up to the parent task progress bar
  -> Subtasks are excluded from Board / Manage Tasks lists (whereNull parent_id)
```

**Files:** `TaskDetailDrawer.jsx` · `BoardController.php` · `TaskController.php`

---

### 14. Task Comments & Activity Log

Every task has a built-in audit trail. All changes (create, assign, status change, progress update, field edit) are recorded in `task_activity_logs` and shown in the **Activity** tab of `TaskDetailDrawer`.

```
POST   /tasks/{task}/comments               -> add comment
DELETE /tasks/{task}/comments/{comment}     -> delete own comment
```

**Files:** `TaskCommentController.php` · `TaskActivityLog.php` · `TaskDetailDrawer.jsx`

---

### 15. User Management

```
/users  (Admin only)
  -> View all users with roles
  -> Create / edit / delete user
  -> Filter by role | Search by name or email
  -> Pagination: 10 per page
```

**Files:** `UserController.php` · `Users.jsx`

---

### 16. Manage Roles & Permissions

```
/roles  (Admin only)
  -> Tab: Overview     -- role cards with member lists
  -> Tab: Permissions  -- toggle matrix for Manager and User roles
      Each toggle calls PATCH /roles/{role}/permissions
  -> Tab: Users        -- change any user role via dropdown
      Calls PATCH /roles/users/{user}
```

See the Role & Permission System section below for the full permissions table.

**Files:** `RoleController.php` · `RolePermission.php` · `ManageRoles.jsx`

---

### 17. Profile

```
/profile
  -> Edit name and email -> PATCH /profile
  -> Change password     -> PATCH /profile/password
```

**Files:** `ProfileController.php` · `Profile.jsx`

---

## 🔐 Role & Permission System

### Roles

| Role      | Description                                                    |
|-----------|----------------------------------------------------------------|
| `admin`   | Full access to everything. Cannot be restricted.               |
| `manager` | Access configured via permission toggles (default: all on).    |
| `user`    | Access configured via permission toggles (default: most off).  |

### Configurable Permissions (18 total)

| Permission Key            | Category      | What it controls                                        |
|---------------------------|---------------|---------------------------------------------------------|
| `access_reporting`        | Halaman       | Can view the Reporting page                             |
| `access_executive_report` | Halaman       | Can view the Executive Report page                      |
| `access_workload`         | Halaman       | Can view the Workload page                              |
| `access_manage_tasks`     | Halaman       | Can view the Manage Tasks datatable                     |
| `create_project`          | Project       | Can create and edit projects                            |
| `delete_project`          | Project       | Can delete projects                                     |
| `create_board`            | Board         | Can create and edit boards                              |
| `delete_board`            | Board         | Can delete boards                                       |
| `create_task`             | Task          | Can create tasks                                        |
| `edit_task_detail`        | Task          | Can edit title, description, priority, and dates        |
| `edit_task_status`        | Task          | Can change task status (todo / in_progress / done)      |
| `update_task_progress`    | Task          | Can move the progress slider (0-100)                    |
| `delete_task`             | Task          | Can delete tasks                                        |
| `assign_task`             | Task          | Can assign tasks to other users                         |
| `access_manage_teams`     | Tim           | Can access the Manage Teams page                        |
| `manage_team_members`     | Tim           | Can add, change role, or remove team members            |
| `access_manage_users`     | Administrasi  | Can access the Manage Users page                        |
| `access_manage_roles`     | Administrasi  | Can access the Manage Roles & Permissions page          |

### How it works

Permissions are checked server-side via `RolePermission::check($role, $permission)`.
Admin always returns `true` regardless of the database.

The full set of enabled permissions for the current user is shared to the frontend as `userPermissions[]`
through `HandleInertiaRequests`, so:

- **Sidebar links** are hidden when the user lacks the required permission
- **Form fields** in modals are disabled when `edit_task_detail` / `edit_task_status` / `update_task_progress` is off
- **Action buttons** (Add, Edit, Delete) are conditionally rendered per permission

---

## 🔔 In-App Notifications

### Overview

A full in-app notification system using **Laravel Database Notifications**.
No external service required -- all notifications are stored in the `notifications` table.

### Events that trigger notifications

| Trigger                    | Notification Class    | Who gets notified   |
|----------------------------|-----------------------|---------------------|
| Task assigned to a user    | `TaskAssigned`        | The assigned user   |
| Assignment changed         | `TaskAssigned`        | The new assignee    |
| Task status changed        | `TaskStatusChanged`   | The assigned user   |
| Task due today or tomorrow | `DeadlineApproaching` | The assigned user   |

> Self-notifications are always skipped (you will not notify yourself).

### Notification classes

| Class                 | File                                        |
|-----------------------|---------------------------------------------|
| `TaskAssigned`        | `app/Notifications/TaskAssigned.php`        |
| `TaskStatusChanged`   | `app/Notifications/TaskStatusChanged.php`   |
| `DeadlineApproaching` | `app/Notifications/DeadlineApproaching.php` |

### Deadline check command

```bash
php artisan tasks:check-deadlines
```

Checks all non-done tasks due **today or tomorrow**, sends `DeadlineApproaching` notifications,
and avoids duplicate notifications within the same day.

**Scheduler** -- register this cron on your server to run every morning at 08:00:

```bash
* * * * * cd /path/to/project && php artisan schedule:run >> /dev/null 2>&1
```

Configured in `routes/console.php`:

```php
Schedule::command('tasks:check-deadlines')->dailyAt('08:00');
```

### Bell icon UI

- **Badge** in the top navbar showing unread count (displays `9+` when > 9)
- Count shared globally via `HandleInertiaRequests` as `unreadNotifCount`
- Badge syncs automatically after every Inertia navigation
- **Dropdown panel** (click bell to open):
  - 📋 Assigned · 🔄 Status changed · ⏰ Deadline -- icons per type
  - Unread items have a blue background + blue dot indicator
  - Click any unread notification -> marks it read instantly
  - **"Mark all read"** button clears the entire badge
  - Scrollable list (max 30 notifications shown)

### API endpoints

| Method  | URL                        | Description                          |
|---------|----------------------------|--------------------------------------|
| `GET`   | `/notifications`           | Fetch latest 30 notifications (JSON) |
| `PATCH` | `/notifications/{id}/read` | Mark a single notification as read   |
| `PATCH` | `/notifications/read-all`  | Mark all notifications as read       |

---

## 🗂️ Project Structure

```
app/
├── Console/
│   └── Commands/
│       └── CheckDeadlines.php              # php artisan tasks:check-deadlines
├── Http/
│   ├── Controllers/
│   │   ├── AuthController.php              # Login, register, logout, dashboard, my-tasks
│   │   ├── BoardController.php             # Board CRUD + task CRUD within boards
│   │   ├── CalendarController.php          # Calendar view
│   │   ├── LabelController.php             # Label CRUD + syncTask
│   │   ├── NotificationController.php      # Bell dropdown API (fetch, mark read)
│   │   ├── ProfileController.php           # Profile update
│   │   ├── ProjectController.php           # Project CRUD + team attachment
│   │   ├── ReportingController.php         # Reporting + Executive Report
│   │   ├── RoleController.php              # Manage roles & permissions
│   │   ├── TaskCommentController.php       # Task comments CRUD
│   │   ├── TaskController.php              # Manage tasks datatable + notifications
│   │   ├── TeamController.php              # Team CRUD + members
│   │   ├── UserController.php              # User management
│   │   └── WorkloadController.php          # Workload view
│   └── Middleware/
│       └── HandleInertiaRequests.php       # Shares auth, flash, userPermissions, unreadNotifCount
├── Models/
│   ├── Board.php
│   ├── Label.php                           # belongsTo Project; belongsToMany Tasks
│   ├── Project.php
│   ├── RolePermission.php                  # Static check with in-memory cache
│   ├── Task.php                            # Has subtasks (parent_id); belongsToMany Labels
│   ├── TaskActivityLog.php                 # Audit trail model + static log() helper
│   ├── Team.php
│   └── User.php                            # Has Notifiable trait
└── Notifications/
    ├── DeadlineApproaching.php
    ├── TaskAssigned.php
    └── TaskStatusChanged.php

resources/
└── js/
    ├── Components/
    │   ├── AppLayout.jsx                   # Sidebar + topbar + NotificationBell
    │   ├── ConfirmDialog.jsx               # Reusable confirm modal
    │   ├── LabelManager.jsx                # LabelChip, LabelPicker, LabelManager panel
    │   ├── Modal.jsx                       # Reusable form modal with field helpers
    │   ├── Pagination.jsx                  # Reusable pagination component
    │   ├── TaskDetailDrawer.jsx            # 3-tab drawer: Details / Comments / Activity
    │   └── Toast.jsx                       # Global toast notification
    ├── lib/
    │   └── toast.js                        # toast.success() / toast.error() helpers
    └── Pages/
        ├── Board.jsx                       # Kanban board with drag-and-drop
        ├── Calendar.jsx
        ├── Dashboard.jsx                   # 4 widgets + weekly CSS trend chart
        ├── ExecutiveReport.jsx             # Advanced analytics + print-to-PDF
        ├── Login.jsx
        ├── ManageRoles.jsx                 # Permission toggle matrix
        ├── ManageTask.jsx                  # Task datatable with label filter
        ├── MyTasks.jsx
        ├── MyTeam.jsx
        ├── Profile.jsx
        ├── ProjectDetail.jsx
        ├── Register.jsx
        ├── Reporting.jsx
        ├── TeamDetail.jsx
        ├── Teams.jsx
        ├── Users.jsx
        └── Workload.jsx

database/
└── migrations/                             # All migration files (schema + permission seeds)

routes/
├── console.php                             # Scheduler: tasks:check-deadlines daily 08:00
└── web.php                                 # All application routes
```

---

## 📄 License

This project is open-sourced software for educational and demonstration purposes.
