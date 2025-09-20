.PHONY: run build install clean

# Run the application using Node.js
run:
	npm run start

# Build the TypeScript code
build:
	npm run build

# Install dependencies
install:
	npm install

# Clean build files
clean:
	rm -rf dist
	rm -rf node_modules