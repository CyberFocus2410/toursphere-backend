# Use an official lightweight Node.js image
FROM node:18-slim

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker's cache
COPY package*.json ./

# Install the application's dependencies
RUN npm install

# Copy the rest of your app's source code into the container
COPY . .

# Tell Docker that the container will listen on port 3001
# Note: Render will override this with its own port, which is fine.
EXPOSE 3001

# The command to run your application when the container starts
CMD [ "node", "server.js" ]