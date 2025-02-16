# <div align="center"><img src="https://github.com/user-attachments/assets/5a378b40-ce28-414d-a849-f31397425132" width="200"/><br />Svelocker</div>

<div align="center"><h3>A Simple and Modern Docker Registry UI built with Typescript and SvelteKit.</h3>

![image](https://github.com/user-attachments/assets/13696c67-4932-4507-9b39-4bc0a4b1aa24)

![image](https://github.com/user-attachments/assets/dbb90c4b-626b-4bc5-bb31-ecf09417359d)

![image](https://github.com/user-attachments/assets/55d54918-c49b-47cd-b760-868e44df6b75)



</div>

> This project is currently in development and items, themes, and features may change or not be available.

## Features:

- Simple and Modern
- Easy Setup
- Connects to Local Registries using the official [distribution/registry](https://hub.docker.com/_/registry) container image.
- Delete Image Tags from the UI

## Get Started

### Requirements

- Docker and Docker Compose
- Private Container Registry using the [distribution/registry](https://hub.docker.com/_/registry) container.

## Docker Compose (recommended)

Modify the env file to fit your setup:

```env
PUBLIC_REGISTRY_URL=https://yourregistry.com
PUBLIC_REGISTRY_NAME=My Docker Registry
```

```yaml
services:
  svelocker-ui:
    image: ghcr.io/kmendell/svelocker-ui:latest
    restart: unless-stopped
    env_file: .env
    ports:
      - 3000:3000
```

Access Svelocker UI on http://dockerip:3000

**Note if your registry is secured by HTTPS then Svelocker UI need to be secured by HTTPS as well.**

The Registry Container will need to be configured to allow Queries from Svelocker UI, Set the Environment Variables below replacing `https://svelocker.example.com` the hostname Svelocker will be running on.

```env
REGISTRY_HTTP_HEADERS_Access-Control-Allow-Origin: '[https://svelocker.example.com]'
REGISTRY_HTTP_HEADERS_Access-Control-Allow-Methods: '[HEAD,GET,OPTIONS,DELETE]'
REGISTRY_HTTP_HEADERS_Access-Control-Allow-Credentials: '[true]'
REGISTRY_HTTP_HEADERS_Access-Control-Allow-Headers: '[Authorization,Accept,Cache-Control]'
REGISTRY_HTTP_HEADERS_Access-Control-Expose-Headers: '[Docker-Content-Digest]'
```

You can replace the Access-Control-Allow-Origin line to this `REGISTRY_HTTP_HEADERS_Access-Control-Allow-Origin: '["*"]'` lto allow traffic from all origins but this is not recommended.

# Additional Information

- All the API Calls to the Registry happen Server-Side, the only exceptions to this are the `Copy Dockerfile` and `Delete Tag/Image` functions. This is intentional due to the data being handled by those requests.

# Shoutouts

- Shoutout to [joxi/docker-registry-ui](https://github.com/Joxit/docker-registry-ui) for the inspiration for this project.
- Shoutout to [pocket-id/pocket-id](https://github.com/pocket-id/pocket-id) for the SvelteKit inspiration and the Dropdown Card Component.
