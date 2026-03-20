git pull
docker compose --env-file docker/.env.production -f docker-compose.yml down
docker compose --env-file docker/.env.production -f docker-compose.yml up   -d --build
