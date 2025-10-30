.PHONY: dev migrate seed test clean

dev:
	docker-compose up --build

migrate:
	flask db init
	flask db migrate -m "Initial migration"
	flask db upgrade

seed:
	python seed_data.py

test:
	python -m pytest tests/ -v

clean:
	docker-compose down -v
	docker system prune -f

install:
	pip install -r requirements.txt

run:
	python app.py
