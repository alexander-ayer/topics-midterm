Wild West Forum — Midterm Project

Course: COS 498 – Server-Side Web Development Fall 2025
Assignment: Wild West Forum Midterm
Author: Alexander Ayer
Repository: alexander-ayer/topics-midterm

Overview

This project is a deliberately insecure web forum built for server-side web development. Users can create basic accounts, log in using session cookies, and post comments that appear in a shared feed. All application state is stored in memory, and no security hardening is applied by design.

The application is fully containerized using Docker and deployed on a DigitalOcean droplet. Views are rendered using Handlebars with shared partials for consistent UI components.

Features
  * User registration with plaintext credentials
  * Login and logout using session cookies
  * Authenticated comment posting
  * Public comment feed displaying authors and messages
  * Handlebars templates with reusable partials
  * Nginx reverse proxy serving static assets
  * Node.js / Express backend
  * Dockerized production and development environments

Technology Stack
  * Backend: Node.js, Express
  * Templating: Handlebars
  * State Management: In-memory JavaScript arrays
  * Reverse Proxy / Static Assets: Nginx
  * Containerization: Docker, Docker Compose
  * Hosting: DigitalOcean Droplet

Project Structure
.
├── nodejs/                 # Express application
│   ├── server.js
│   ├── views/
│   ├── public/
│   └── Dockerfile
├── nginx/                  # Nginx reverse proxy
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
├── docker-compose.dev.yml
└── README.md

Running the Application

  Prerequisites
    * Docker
    * Docker compose
    * Open port 5024

  Build and Run:
    docker compose up --build

  Navigate to:
    http://<server ip>:5024

  To Stop Container, Run:
    docker compose down
