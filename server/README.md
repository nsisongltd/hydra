# Hydra MDM Server by NsisongLabs

The server component of the Nsisong Labs Hydra Mobile Device Management (MDM) solution. This server provides the backend API and WebSocket services for managing Android devices.

## Features

- User authentication and authorization
- Real-time device monitoring via WebSocket
- Device management (lock/unlock)
- Activity logging
- RESTful API endpoints
- PostgreSQL database with Prisma ORM

## Prerequisites

- Node.js (v14 or higher) OR Docker
- PostgreSQL (if not using Docker)
- npm or yarn

## Setup

### Using Docker (Recommended)

1. Start the server and database:
```bash
docker-compose up -d
```

The server will be available at http://localhost:3000

### Manual Setup

1. Set up environment variables:
Create a `.env` file in the root directory with the following variables:
```
DATABASE_URL="postgresql://user:password@localhost:5432/hydra_mdm"
JWT_SECRET="your-secret-key"
PORT=3000
LOG_LEVEL="info"
CORS_ORIGIN="http://localhost:3001"
```

2. Development:
```bash
# Start development server with hot reload
./scripts/dev.sh
```

3. Production:
```bash
# Build and start production server
./scripts/start.sh
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register a new user
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user info

### Devices
- GET `/api/devices` - Get all devices
- GET `/api/devices/:id` - Get device by ID
- POST `/api/devices/:id/lock` - Lock device (admin only)
- POST `/api/devices/:id/unlock` - Unlock device (admin only)
- GET `/api/devices/:id/activities` - Get device activities

## WebSocket Events

### Client -> Server
- `authenticate` - Authenticate device with androidId and device info
- `status_update` - Update device status (battery level, etc.)
- `command_response` - Response to device commands

### Server -> Client
- `authenticated` - Device authentication successful
- `device_updated` - Device status updated
- `command` - Send command to device
- `error` - Error message

## Project Structure

```
server/
├── src/
│   ├── routes/          # API routes
│   ├── middleware/      # Express middleware
│   ├── services/        # Business logic
│   └── utils/          # Utility functions
├── prisma/
│   └── schema.prisma   # Database schema
├── scripts/
│   ├── dev.sh         # Development script
│   └── start.sh       # Production script
├── Dockerfile         # Docker configuration
├── docker-compose.yml # Docker Compose configuration
└── logs/             # Application logs
```

## Docker Commands

### Development
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild services
docker-compose up -d --build
```

### Production
```bash
# Build production image
docker build -t hydra-mdm-server .

# Run container
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:password@host:5432/hydra_mdm \
  -e JWT_SECRET=your-secret-key \
  -e PORT=3000 \
  -e LOG_LEVEL=info \
  -e CORS_ORIGIN=https://your-domain.com \
  hydra-mdm-server
```

## License

MIT 