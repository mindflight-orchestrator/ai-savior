DOCKER_BUILDKIT=1 docker compose -f docker-compose.dev.yml --env-file .env build --no-cache postgres
docker-compose -f docker-compose.dev.yml --env-file .env up -d postgres