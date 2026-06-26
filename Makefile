.PHONY: run install dev build

# Default target: Install dependencies and start the app in development mode
run: install dev

install:
	npm install

dev:
	npm run dev

build: install
	npm run build:win
