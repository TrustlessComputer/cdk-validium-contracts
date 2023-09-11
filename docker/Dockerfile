FROM node:18-bullseye

# Set the working directory
WORKDIR /cdk-validium-contracts

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install cdk-validium-contracts dependencies
RUN npm install

# Copy the entire cdk-validium-contracts
COPY . .

CMD ["/bin/sh"]