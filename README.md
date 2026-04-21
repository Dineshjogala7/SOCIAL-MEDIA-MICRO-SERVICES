# 📡 Social Media Manager — Microservices Backend

> A production-grade, event-driven microservices backend for a social media management platform. Built with Node.js, Docker, RabbitMQ, Redis, and a centralized API Gateway.

---

## 📌 Table of Contents

- [Architecture Overview](#-architecture-overview)
- [Services](#-services)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Logging](#-logging)
- [Docker & Deployment](#-docker--deployment)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)

---

## 🏗 Architecture Overview

```
Client
  │
  ▼
┌─────────────────────┐
│    API Gateway       │  :3000 — Single entry point, JWT auth, rate limiting, routing
└────────┬────────────┘
         │
   ┌─────┼─────────────────┐
   │     │                 │
   ▼     ▼                 ▼
Identity  Post          Media         Search
Service   Service       Service       Service
 :3001    :3002          :3003         :3004
   │        │               │             │
   └────────┴───────────────┴─────────────┘
                    │
             ┌──────┴──────┐
             │  RabbitMQ   │  (Async inter-service messaging)
             └──────┬──────┘
                    │
             ┌──────┴──────┐
             │    Redis    │  (Caching layer)
             └─────────────┘
```

All services are containerized via **Docker Compose** and communicate asynchronously through **RabbitMQ** message queues. Redis handles session and response caching. All logs are aggregated via **Winston**.

---

## 🧩 Services

### 1. 🔐 Identity Service (`:3001`)
Handles all authentication and user identity concerns.
- User registration & login
- JWT token issuance and validation
- Password hashing (bcrypt)
- Token refresh flows

### 2. 📝 Post Service (`:3002`)
Manages social media post lifecycle.
- Create, read, update, delete posts
- Pagination of post feed
- Publishes events to RabbitMQ on post creation/deletion
- Post ownership validation

### 3. 🖼 Media Service (`:3003`)
Handles file/media upload and storage.
- Multipart form-data file upload
- File type & size validation
- Returns accessible media URL after upload
- Publishes media-ready events to RabbitMQ

### 4. 🔍 Search Service (`:3004`)
Provides real-time and indexed search capabilities.
- Full-text search over posts and users
- Listens to RabbitMQ events to keep index in sync
- Redis-backed result caching for hot queries

### 5. 🚪 API Gateway (`:3000`)
Central reverse proxy and security layer.
- Routes all inbound traffic to appropriate microservices
- JWT validation middleware
- Rate limiting
- Request/response logging
- Centralized error handling

---

## 🛠 Tech Stack

| Layer              | Technology              |
|--------------------|-------------------------|
| Runtime            | Node.js                 |
| Framework          | Express.js              |
| Message Broker     | RabbitMQ                |
| Caching            | Redis                   |
| Logger             | Winston                 |
| Containerization   | Docker & Docker Compose |
| Auth               | JWT (JSON Web Tokens)   |
| File Uploads       | Multer (multipart)      |
| Database           | MongoDB / PostgreSQL *(per service)* |

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Docker](https://www.docker.com/) & Docker Compose
- [Node.js](https://nodejs.org/) v18+
- [Git](https://git-scm.com/)

### Clone the Repository

```bash
git clone https://github.com/your-username/social-app-microservices.git
cd social-app-microservices
```

### Start All Services

```bash
docker-compose up --build
```

This will spin up:
- All 4 microservices
- API Gateway
- RabbitMQ (with management UI at `http://localhost:15672`)
- Redis

### Stop All Services

```bash
docker-compose down
```

---

## 🔐 Environment Variables

Each service uses its own `.env` file. Below are the common variables:

### API Gateway (`.env`)

```env
PORT=3000
JWT_SECRET=your_jwt_secret
IDENTITY_SERVICE_URL=http://identity-service:3001
POST_SERVICE_URL=http://post-service:3002
MEDIA_SERVICE_URL=http://media-service:3003
SEARCH_SERVICE_URL=http://search-service:3004
REDIS_URL=redis://redis:6379
```

### Identity Service (`.env`)

```env
PORT=3001
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
DB_URI=mongodb://mongo:27017/identity
RABBITMQ_URL=amqp://rabbitmq:5672
```

### Post Service (`.env`)

```env
PORT=3002
DB_URI=mongodb://mongo:27017/posts
RABBITMQ_URL=amqp://rabbitmq:5672
REDIS_URL=redis://redis:6379
```

### Media Service (`.env`)

```env
PORT=3003
RABBITMQ_URL=amqp://rabbitmq:5672
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10mb
```

### Search Service (`.env`)

```env
PORT=3004
RABBITMQ_URL=amqp://rabbitmq:5672
REDIS_URL=redis://redis:6379
```

> ⚠️ Never commit `.env` files. Add them to `.gitignore`.

---

## 📖 API Reference

All requests go through the **API Gateway** at `http://localhost:3000`.  
Protected routes require a `Bearer` token in the `Authorization` header.

---

### 🔐 Auth

#### `POST /v1/auth/register`
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:** `201 Created`
```json
{
  "message": "User registered successfully"
}
```

---

#### `POST /v1/auth/login`
Login and receive a JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 📝 Posts

> All post routes require `Authorization: Bearer <token>`

#### `POST /v1/posts/create-post`
Create a new post.

**Request Body:**
```json
{
  "content": "Hello world! This is my first post."
}
```

**Response:** `201 Created`
```json
{
  "post": {
    "_id": "64abc123...",
    "content": "Hello world! This is my first post.",
    "author": "user_id",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

---

#### `GET /v1/posts/all-posts`
Retrieve all posts (paginated).

**Response:** `200 OK`
```json
{
  "posts": [ { ... }, { ... } ],
  "total": 100,
  "page": 1
}
```

---

#### `GET /v1/posts/:id`
Retrieve a single post by ID.

**Response:** `200 OK`
```json
{
  "post": {
    "_id": "64abc123...",
    "content": "...",
    "author": "..."
  }
}
```

---

#### `DELETE /v1/posts/:id`
Delete a post by ID. Only the post owner can delete.

**Response:** `200 OK`
```json
{
  "message": "Post deleted successfully"
}
```

---

### 🖼 Media

> Requires `Authorization: Bearer <token>`

#### `POST /v1/media/upload`
Upload a media file (image, video, etc.).

**Request:** `multipart/form-data`

| Key    | Type   | Description        |
|--------|--------|--------------------|
| `file` | `file` | The file to upload |

**Response:** `200 OK`
```json
{
  "url": "http://localhost:3000/media/uploads/filename.jpg",
  "mediaId": "64xyz789..."
}
```

---

### 🔍 Search

#### `GET /v1/search?q=keyword`
Search posts or users by keyword.

**Query Params:**

| Param | Type   | Description       |
|-------|--------|-------------------|
| `q`   | string | Search keyword    |

**Response:** `200 OK`
```json
{
  "results": [ { ... }, { ... } ]
}
```

---

## 📋 Logging

This project uses **Winston** as the centralized logger across all services.

Log levels follow standard severity:

| Level   | When Used                         |
|---------|-----------------------------------|
| `error` | Unhandled exceptions, fatal errors |
| `warn`  | Recoverable issues, deprecations  |
| `info`  | Service start, route hits, events |
| `debug` | Detailed diagnostic info (dev only) |

Logs are output to:
- **Console** (colorized in development)
- **`logs/combined.log`** (all levels)
- **`logs/error.log`** (errors only)

Sample log output:
```
[2025-04-21T10:45:00.000Z] INFO  [PostService] POST /v1/posts/create-post — 201 Created (23ms)
[2025-04-21T10:45:01.000Z] ERROR [PostService] Failed to publish event to RabbitMQ: Connection refused
```

---

## 🐳 Docker & Deployment

### `docker-compose.yml` structure

```
services:
  api-gateway       → Port 3000
  identity-service  → Port 3001
  post-service      → Port 3002
  media-service     → Port 3003
  search-service    → Port 3004
  rabbitmq          → Ports 5672, 15672 (management UI)
  redis             → Port 6379
  mongo             → Port 27017
```

### Useful Docker commands

```bash
# Start all services in detached mode
docker-compose up -d --build

# View logs for a specific service
docker-compose logs -f api-gateway

# Rebuild a single service
docker-compose up --build post-service

# Stop and remove volumes
docker-compose down -v
```

### RabbitMQ Management UI

Access at: `http://localhost:15672`  
Default credentials: `guest` / `guest`

---

## 📁 Project Structure

```
social-app-microservices/
├── api-gateway/
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── index.js
│   ├── Dockerfile
│   └── .env
├── identity-service/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   └── index.js
│   ├── Dockerfile
│   └── .env
├── post-service/
│   ├── src/
│   └── Dockerfile
├── media-service/
│   ├── src/
│   └── Dockerfile
├── search-service/
│   ├── src/
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">Built with ❤️ using Node.js, Docker, RabbitMQ & Redis</p>
