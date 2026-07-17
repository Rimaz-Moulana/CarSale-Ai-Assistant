# AutoAdmin - Car Sales Management System

AutoAdmin is a full-stack, enterprise-grade Car Sales Management application. It provides a comprehensive dashboard and management tools for car inventory, sales, procurement, finance, and customers, all augmented with a local AI assistant via Ollama.

## Features

*   **Comprehensive Dashboards**: View metrics for Sales, Finance, Procurement, and Inventory at a glance.
*   **AI-Powered CEO Assistant**: An intelligent assistant integrated with Semantic Kernel and Ollama that understands real-time company data to answer questions about finance, inventory, and sales.
*   **Secure Authentication**: Fully protected with Keycloak Single Sign-On (SSO) and JWT Bearer tokens across the frontend and backend.
*   **Modern UI**: Beautiful, responsive interface built with React, Vite, Tailwind CSS, and Lucide Icons.
*   **Robust Backend**: Powered by .NET 9 Web API and Entity Framework Core with PostgreSQL.

## Tech Stack

### Frontend
*   **Framework**: React 18 + Vite
*   **Styling**: Tailwind CSS
*   **Routing**: React Router v6
*   **Authentication**: Keycloak JS
*   **API Client**: Axios (with centralized error handling and JWT interceptors)

### Backend
*   **Framework**: .NET 9 ASP.NET Core Web API
*   **ORM**: Entity Framework Core
*   **Authentication**: Microsoft.AspNetCore.Authentication.JwtBearer (Keycloak)
*   **AI Integration**: Semantic Kernel & HTTP-based Ollama client

### Infrastructure (Docker)
*   **Database**: PostgreSQL 16
*   **DB Management**: pgAdmin4
*   **Authentication**: Keycloak (quay.io/keycloak/keycloak)
*   **Local AI**: Ollama (llama2 or similar local model)
*   **Application Services**: Containerized Frontend (Nginx) and Backend (.NET)

## Getting Started

### Prerequisites
*   Docker & Docker Compose installed on your machine.
*   (Optional) .NET 9 SDK and Node.js v20+ if you wish to run services locally outside of Docker.

### Running with Docker Compose (Recommended)

1.  **Clone the repository** (if applicable) and navigate to the root directory:
    ```bash
    cd /path/to/AutoAdmin
    ```

2.  **Start all services**:
    ```bash
    docker-compose up -d --build
    ```
    This will spin up PostgreSQL, Keycloak, Ollama, pgAdmin, the Backend API, and the Frontend UI.

3.  **Access the Application**:
    *   **Frontend UI**: [http://localhost:5173](http://localhost:5173)
    *   **Backend API (Swagger)**: [http://localhost:5099/swagger](http://localhost:5099/swagger)
    *   **Keycloak Admin**: [http://localhost:8080](http://localhost:8080) (Default login: `admin` / `admin`)
    *   **pgAdmin**: [http://localhost:5050](http://localhost:5050)

### Default Test Credentials
The application is pre-configured with a Keycloak realm (`carsales-realm`) and a default test user. When accessing the frontend, you will be redirected to log in:
*   **Username**: `testuser`
*   **Password**: `password`

## Project Structure

```
.
├── BE/                   # .NET 9 Backend Web API
│   ├── Controllers/      # API Endpoints
│   ├── Data/             # EF Core DbContext and Migrations
│   ├── Models/           # Entities and DTOs
│   ├── Services/         # Business logic and AI Tool definitions
│   ├── appsettings.json  # Backend Configuration (DB, Keycloak, Ollama)
│   └── Program.cs        # DI Setup and Middleware Pipeline
├── FE/                   # React + Vite Frontend
│   ├── src/
│   │   ├── components/   # Reusable UI components (Sidebar, TopNav, etc.)
│   │   ├── pages/        # Dashboard, Cars, Finance, AI Assistant, etc.
│   │   ├── services/     # Axios apiClient.ts
│   │   ├── App.tsx       # Routing setup
│   │   ├── keycloak.ts   # Keycloak initialization
│   │   └── main.tsx      # Entry point (blocks render until authenticated)
│   ├── package.json      # Dependencies
│   └── vite.config.ts    # Vite Configuration
├── keycloak-realm.json   # Auto-provisioning setup for Keycloak
└── docker-compose.yml    # Orchestrates all infrastructure and app containers
```

## AI Configuration
The backend interacts with a local Ollama instance running in a Docker container.
1. Make sure you pull a model into the Ollama container (e.g., `llama2`, `mistral`, or `llama3`).
2. The AI uses tools defined in `BE/CarSales.Api/Services/AiToolService.cs` (annotated with descriptive `[Description]` tags) to read real-time data from the database.

---
*Built with ❤️ for Car Sales Management.*
